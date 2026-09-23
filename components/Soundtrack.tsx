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

function levelOf(samples: Uint8Array) {
  let energy = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = (samples[i] - 128) / 128;
    energy += sample * sample;
  }
  return Math.sqrt(energy / samples.length);
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
  const voiceRef = useRef<AnalyserNode | null>(null);
  const bassRef = useRef<AnalyserNode | null>(null);
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
    const voiceTime = new Uint8Array(1024);
    const bassTime = new Uint8Array(1024);
    let frame = 0;
    let mouth = 0;
    let mouthTarget = 0;
    let poseX = 0;
    let poseY = 0;
    let poseZ = 0;
    let pitch = 640;
    let pitchCenter = 640;
    let energyAvg = 0.15;
    let prevVoice = 0;
    let lastSyllable = 0;
    let nod = 0;
    const started = performance.now() / 1000;

    const tick = (nowMs: number) => {
      const elapsed = nowMs / 1000 - started;
      const audio = audioRef.current;
      const singing = playingRef.current && audio !== null && !audio.paused;
      const quiet = reduce.matches;
      let syllable = false;
      if (singing && !quiet && contextRef.current && voiceRef.current && bassRef.current) {
        voiceRef.current.getByteTimeDomainData(voiceTime);
        bassRef.current.getByteTimeDomainData(bassTime);
        const voice = levelOf(voiceTime);
        const bass = levelOf(bassTime);
        if (elapsed - lastSyllable > 0.05) {
          const flux = Math.max(0, voice - prevVoice);
          prevVoice = voice;
          lastSyllable = elapsed;
          // A lyric syllable jumps in the voice band. A pad, a bass note, or a drum does not.
          if (flux > 0.005 && voice > 0.03 && voice > bass * 0.75) {
            mouthTarget = Math.min(1, 0.42 + flux * 28);
            syllable = true;
          }
        }
      } else {
        mouthTarget = 0;
        prevVoice = 0;
      }
      mouthTarget *= singing && !quiet ? 0.985 : 0.9;
      mouth += (mouthTarget - mouth) * 0.45;

      let targetX = Math.sin(elapsed * 0.55) * 6;
      let targetY = Math.sin(elapsed * 0.42) * 5;
      let targetZ = Math.sin(elapsed * 0.31) * 4;
      if (singing && !quiet && melodyRef.current && contextRef.current) {
        const rate = contextRef.current.sampleRate;
        melodyRef.current.getByteFrequencyData(freq);
        const hz = melodyHz(freq, rate);
        if (hz > 0) {
          pitch += (hz - pitch) * 0.2;
          pitchCenter += (pitch - pitchCenter) * 0.012;
        }
        const lift = Math.max(-1, Math.min(1, (pitch - pitchCenter) / 220));
        const energy = band(freq, rate, 240, 1800);
        energyAvg += (energy - energyAvg) * 0.03;
        const swell = Math.max(-1, Math.min(1, (energy - energyAvg) * 7));
        if (syllable) nod = 8;
        else nod *= 0.94;
        targetX = lift * 11 + swell * 7;
        targetY = lift * 18 + swell * 6 + nod;
        targetZ = lift * -14 + swell * 4;
      } else if (quiet) {
        targetX = 0;
        targetY = 0;
        targetZ = 0;
      }

      poseX += (targetX - poseX) * (singing ? 0.08 : 0.06);
      poseY += (targetY - poseY) * (singing ? 0.34 : 0.08);
      poseZ += (targetZ - poseZ) * (singing ? 0.24 : 0.08);
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

      const voiceFilter = context.createBiquadFilter();
      voiceFilter.type = "bandpass";
      voiceFilter.frequency.value = 1800;
      voiceFilter.Q.value = 1.2;
      const voice = context.createAnalyser();
      voice.fftSize = 1024;
      voice.smoothingTimeConstant = 0;
      source.connect(voiceFilter);
      voiceFilter.connect(voice);

      const bassFilter = context.createBiquadFilter();
      bassFilter.type = "lowpass";
      bassFilter.frequency.value = 120;
      const bass = context.createAnalyser();
      bass.fftSize = 1024;
      bass.smoothingTimeConstant = 0;
      source.connect(bassFilter);
      bassFilter.connect(bass);

      contextRef.current = context;
      melodyRef.current = melody;
      voiceRef.current = voice;
      bassRef.current = bass;
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
