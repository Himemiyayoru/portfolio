"use client";

import { useEffect, useRef, useState } from "react";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";
import { judgmentDuskLyrics } from "@/content/judgment-dusk";
import { getWork } from "@/content/works";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h4.2v14H6zM13.8 5H18v14h-4.2z" />
    </svg>
  );
}

function band(data: Uint8Array, sampleRate: number, low: number, high: number) {
  const bin = sampleRate / 2 / data.length;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 1) {
    const hz = i * bin;
    if (hz < low || hz > high) continue;
    sum += data[i] / 255;
    count += 1;
  }
  return count ? sum / count : 0;
}

function rmsOf(samples: Float32Array) {
  let energy = 0;
  for (let i = 0; i < samples.length; i += 1) energy += samples[i] * samples[i];
  return Math.sqrt(energy / samples.length);
}

/** How periodic the signal is inside a sung-vowel pitch range, 0..~1. */
function pitchConfidence(samples: Float32Array, sampleRate: number, minHz: number, maxHz: number) {
  const length = samples.length;
  let energy = 0;
  for (let i = 0; i < length; i += 1) energy += samples[i] * samples[i];
  if (energy < 1e-7) return 0;
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(length - 2, Math.floor(sampleRate / minHz));
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let correlation = 0;
    let count = 0;
    for (let i = 0; i < length - lag; i += 3) {
      correlation += samples[i] * samples[i + lag];
      count += 1;
    }
    correlation /= count;
    if (correlation > best) best = correlation;
  }
  const norm = energy / length;
  return norm > 0 ? Math.max(0, best / norm) : 0;
}

/** Melodic centroid in Hz, or 0 when that band is quiet. */
function melodyHz(freq: Uint8Array, sampleRate: number) {
  const bin = sampleRate / (freq.length * 2);
  const start = Math.ceil(240 / bin);
  const end = Math.min(freq.length - 1, Math.floor(1800 / bin));
  let weight = 0;
  let moment = 0;
  for (let i = start; i <= end; i += 1) {
    const value = freq[i] / 255;
    weight += value;
    moment += value * i * bin;
  }
  if (weight < 0.35) return 0;
  return moment / weight;
}

export function Soundtrack() {
  const score = getWork("crimson-moon")?.score;
  const figureRef = useRef<HimeHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const melodyRef = useRef<AnalyserNode | null>(null);
  const midRef = useRef<AnalyserNode | null>(null);
  const sideRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const playingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const freq = new Uint8Array(1024);
    const midTime = new Float32Array(2048);
    const sideTime = new Float32Array(2048);
    let frame = 0;
    let mouth = 0;
    let poseX = 0;
    let poseY = 0;
    let poseZ = 0;
    let pitchEma = 640;
    let pitchFloor = 640;
    let energyEma = 0.15;
    let energyFloor = 0.15;
    const started = performance.now() / 1000;

    const tick = (nowMs: number) => {
      const elapsed = nowMs / 1000 - started;
      const audio = audioRef.current;
      const singing = playingRef.current && audio !== null && !audio.paused;
      const quiet = reduce.matches;

      // Mouth: only the centered voice, and only while it is singing a pitch, not the panned
      // accompaniment. A drum hit or a bass note is either off-center or has no stable pitch here.
      let mouthTarget = 0;
      if (singing && !quiet && contextRef.current && midRef.current && sideRef.current) {
        const rate = contextRef.current.sampleRate;
        midRef.current.getFloatTimeDomainData(midTime);
        sideRef.current.getFloatTimeDomainData(sideTime);
        const midLevel = rmsOf(midTime);
        const sideLevel = rmsOf(sideTime);
        const confidence = pitchConfidence(midTime, rate, 150, 650);
        const centered = midLevel / (midLevel + sideLevel * 1.3 + 1e-6);
        const vocalScore = confidence * centered;
        if (vocalScore > 0.32 && midLevel > 0.012) {
          mouthTarget = Math.min(1, midLevel * 7);
        }
      }
      mouth += (mouthTarget - mouth) * (mouthTarget > mouth ? 0.55 : 0.24);

      // Body: a slow, continuous sway. The melody's pitch trend lifts the head, its loudness
      // trend adds a little more swing, both eased in gently so nothing snaps frame to frame.
      let lift = 0;
      let swell = 0;
      if (singing && !quiet && melodyRef.current && contextRef.current) {
        const rate = contextRef.current.sampleRate;
        melodyRef.current.getByteFrequencyData(freq);
        const hz = melodyHz(freq, rate);
        if (hz > 0) pitchEma += (hz - pitchEma) * 0.08;
        pitchFloor += (pitchEma - pitchFloor) * 0.01;
        lift = Math.max(-1, Math.min(1, (pitchEma - pitchFloor) / 220));
        const energyRaw = band(freq, rate, 240, 1800);
        energyEma += (energyRaw - energyEma) * 0.12;
        energyFloor += (energyEma - energyFloor) * 0.01;
        swell = Math.max(-1, Math.min(1, (energyEma - energyFloor) * 6));
      }
      const idle = quiet ? 0 : 1;
      const targetX = idle * (Math.sin(elapsed * 0.5) * 6 + lift * 12 + swell * 6);
      const targetY = idle * (Math.sin(elapsed * 0.37) * 4.5 + lift * 21 + swell * 7.5);
      const targetZ = idle * (Math.sin(elapsed * 0.29) * 4.5 - lift * 15 + swell * 4.5);

      poseX += (targetX - poseX) * 0.07;
      poseY += (targetY - poseY) * 0.07;
      poseZ += (targetZ - poseZ) * 0.07;
      figureRef.current?.setFrame?.("bust");
      figureRef.current?.setPose({
        x: poseX,
        y: poseY,
        z: poseZ,
        blink: !quiet && elapsed % 4.8 < 0.12,
        mouth,
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    syncDuration();
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.pause();
      void contextRef.current?.close();
    };
  }, []);

  if (!score) return null;

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!contextRef.current) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      source.connect(context.destination);

      const melody = context.createAnalyser();
      melody.fftSize = 2048;
      melody.smoothingTimeConstant = 0.72;
      source.connect(melody);

      // Suno mixes tend to place the lead vocal dead center. Reconstructing mid (L+R) and
      // side (L-R) and comparing them tells sung lines apart from panned instruments.
      const splitter = context.createChannelSplitter(2);
      source.connect(splitter);
      const left = context.createGain();
      left.gain.value = 0.5;
      const rightPos = context.createGain();
      rightPos.gain.value = 0.5;
      const rightNeg = context.createGain();
      rightNeg.gain.value = -0.5;
      splitter.connect(left, 0);
      splitter.connect(rightPos, 1);
      splitter.connect(rightNeg, 1);

      const midSum = context.createGain();
      left.connect(midSum);
      rightPos.connect(midSum);
      const sideSum = context.createGain();
      left.connect(sideSum);
      rightNeg.connect(sideSum);

      const midHighpass = context.createBiquadFilter();
      midHighpass.type = "highpass";
      midHighpass.frequency.value = 150;
      const sideHighpass = context.createBiquadFilter();
      sideHighpass.type = "highpass";
      sideHighpass.frequency.value = 150;
      midSum.connect(midHighpass);
      sideSum.connect(sideHighpass);

      const mid = context.createAnalyser();
      mid.fftSize = 2048;
      mid.smoothingTimeConstant = 0;
      midHighpass.connect(mid);
      const side = context.createAnalyser();
      side.fftSize = 2048;
      side.smoothingTimeConstant = 0;
      sideHighpass.connect(side);

      contextRef.current = context;
      melodyRef.current = melody;
      midRef.current = mid;
      sideRef.current = side;
    }
    await contextRef.current.resume();
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  const progress = duration > 0 ? `${(time / duration) * 100}%` : "0%";

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
  }

  return (
    <figure className="score player">
      <div className="score-stage">
        <div className="score-singer">
          <div className="score-stage-slot">
            <HimePortrait ref={figureRef} emotion={playing ? "happy" : "neutral"} followCursor={false} />
          </div>
          <div className="player-bar">
            <button
              type="button"
              className="player-toggle"
              aria-label={playing ? "Pause" : "Play"}
              aria-pressed={playing}
              onClick={() => void toggle()}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="player-track">
              <div className="player-name">
                <span>Score</span> {score.title}
              </div>
              <input
                className="player-range"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                aria-label="Song position"
                style={{ ["--progress" as string]: progress }}
                onPointerDown={(event) => {
                  scrubbingRef.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerUp={(event) => {
                  scrubbingRef.current = false;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onLostPointerCapture={() => {
                  scrubbingRef.current = false;
                }}
                onInput={(event) => seek(Number(event.currentTarget.value))}
                onChange={(event) => seek(Number(event.currentTarget.value))}
              />
              <div className="player-times">
                <span>{formatTime(time)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="score-lyrics" aria-label="Japanese lyrics">
          {judgmentDuskLyrics.map((stanza, stanzaIndex) => (
            <p key={stanzaIndex}>
              {stanza.map((line) => (
                <span key={line} className="score-line">
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="metadata"
        src={score.src}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => {
          if (!scrubbingRef.current) setTime(event.currentTarget.currentTime);
        }}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </figure>
  );
}
