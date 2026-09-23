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

/** Open the mouth only when the centered, voice-band signal has a singing pitch. */
function voicedMouth(samples: Uint8Array, sampleRate: number, frame: Float32Array) {
  const count = samples.length;
  let energy = 0;
  for (let i = 0; i < count; i += 1) {
    const sample = (samples[i] - 128) / 128;
    frame[i] = sample;
    energy += sample * sample;
  }
  energy /= count;
  const level = Math.sqrt(energy);
  if (level < 0.02) return 0;
  const minLag = Math.max(2, Math.floor(sampleRate / 750));
  const maxLag = Math.min(count - 2, Math.floor(sampleRate / 160));
  let best = 0;
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let correlation = 0;
    for (let i = 0; i < count - lag; i += 4) correlation += frame[i] * frame[i + lag];
    if (correlation > best) {
      best = correlation;
      bestLag = lag;
    }
  }
  if (bestLag <= minLag + 2 || bestLag >= maxLag - 2) return 0;
  const confidence = best / (energy * ((count - bestLag) / 4) + 1e-6);
  if (confidence < 0.45) return 0;
  return Math.min(1, (level - 0.02) * 10);
}

export function Soundtrack() {
  const score = getWork("crimson-moon")?.score;
  const figureRef = useRef<HimeHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vocalRef = useRef<AnalyserNode | null>(null);
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
    const freq = new Uint8Array(128);
    const vocalTime = new Uint8Array(2048);
    const vocalFrame = new Float32Array(2048);
    let frame = 0;
    let mouth = 0;
    let body = 0;
    const started = performance.now() / 1000;

    const tick = (nowMs: number) => {
      const elapsed = nowMs / 1000 - started;
      const audio = audioRef.current;
      const singing = playingRef.current && audio !== null && !audio.paused;
      let vocal = 0;
      let pulse = 0;
      if (singing && contextRef.current) {
        const rate = contextRef.current.sampleRate;
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(freq);
          pulse = band(freq, rate, 40, 240);
        }
        if (vocalRef.current) {
          vocalRef.current.getByteTimeDomainData(vocalTime);
          vocal = voicedMouth(vocalTime, rate, vocalFrame);
        }
      }

      const quiet = reduce.matches;
      const mouthTarget = singing && !quiet ? vocal : 0;
      mouth += (mouthTarget - mouth) * (mouthTarget > mouth ? 0.55 : 0.28);
      body += ((singing && !quiet ? pulse : 0) - body) * 0.04;
      figureRef.current?.setFrame?.("bust");
      figureRef.current?.setPose({
        x: quiet ? 0 : Math.sin(elapsed * 0.7) * (singing ? 8 + body * 10 : 12),
        y: quiet || !singing ? 0 : Math.sin(elapsed * 0.42) * body * 5,
        z: quiet || !singing ? 0 : Math.sin(elapsed * 0.28) * body * 4,
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
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(context.destination);

      const splitter = context.createChannelSplitter(2);
      const left = context.createGain();
      const right = context.createGain();
      const mid = context.createGain();
      left.gain.value = 0.5;
      right.gain.value = 0.5;
      source.connect(splitter);
      splitter.connect(left, 0);
      splitter.connect(right, 1);
      left.connect(mid);
      right.connect(mid);
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 200;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 3200;
      const vocal = context.createAnalyser();
      vocal.fftSize = 2048;
      mid.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(vocal);

      contextRef.current = context;
      analyserRef.current = analyser;
      vocalRef.current = vocal;
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
