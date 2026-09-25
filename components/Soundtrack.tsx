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

export function Soundtrack() {
  const score = getWork("crimson-moon")?.score;
  const figureRef = useRef<HimeHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vocalRef = useRef<{ hop: number; mouth: number[] } | null>(null);
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
    let frame = 0;
    let mouth = 0;
    let last = performance.now() / 1000;
    const started = last;
    // Same idle loop as Project_Hime: her own random walk, a quiet breath, and
    // an occasional nod. The body does not listen to the score.
    const moodScale = { happy: 1.4, neutral: 1 };
    const baseAmplitude = [18, 10, 12];
    const breathFreqs = [0.16, 0.1, 0.07];
    const breathPhases = [0, 1.7, 3.1];
    const step = 0.05;
    const sway = [0, 1, 2].map(() => ({ current: 0, target: 0, nextRetarget: 0 }));
    let nextBounce = 0;
    let bounceStart: number | null = null;
    let bounceDuration = 0;
    let bounceAmplitude = 0;

    const tick = (nowMs: number) => {
      const now = nowMs / 1000;
      const elapsed = now - started;
      const dt = Math.min(0.05, Math.max(0, now - last));
      last = now;
      const audio = audioRef.current;
      const singing = playingRef.current && audio !== null && !audio.paused;
      const quiet = reduce.matches;

      const vocal = vocalRef.current;
      let mouthTarget = 0;
      if (singing && vocal && audio) {
        const index = Math.floor(audio.currentTime / vocal.hop);
        mouthTarget = vocal.mouth[index] ?? 0;
      }
      mouth += (mouthTarget - mouth) * (mouthTarget > mouth ? 0.65 : 0.35);

      const angles = [0, 0, 0];
      if (!quiet) {
        const energy = moodScale[singing ? "happy" : "neutral"] * 0.6;
        for (let i = 0; i < sway.length; i += 1) {
          const amp = baseAmplitude[i] * energy;
          const state = sway[i];
          if (now >= state.nextRetarget) {
            state.target = (Math.random() * 2 - 1) * amp;
            state.nextRetarget = now + (0.35 + Math.random() * 0.75) / Math.max(energy, 0.3);
          }
          const follow = 1 - (1 - Math.min(1, step * 2.5)) ** (dt / step);
          state.current += (state.target - state.current) * follow;
          const breath =
            amp * 0.35 * Math.sin(elapsed * breathFreqs[i] * Math.PI * 2 + breathPhases[i]);
          angles[i] = state.current + breath;
        }
        if (bounceStart !== null && now - bounceStart > bounceDuration) bounceStart = null;
        if (bounceStart === null && now >= nextBounce) {
          bounceStart = now;
          bounceDuration = 0.15 + Math.random() * 0.15;
          bounceAmplitude = 3 * energy * (0.7 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1);
          nextBounce = now + (1.5 + Math.random() * 3) / Math.max(energy, 0.3);
        }
        if (bounceStart !== null) {
          const t = now - bounceStart;
          if (t <= bounceDuration) {
            angles[2] += bounceAmplitude * 0.6 * Math.sin((Math.PI * t) / bounceDuration);
          }
        }
      }

      figureRef.current?.setFrame?.("bust");
      figureRef.current?.setPose({
        x: angles[0],
        y: angles[1],
        z: angles[2],
        blink: !quiet && elapsed % 4.8 < 0.12,
        mouth,
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/work/crimson-moon/lead-vocal-mouth.json")
      .then((response) => response.json())
      .then((data: { hop: number; mouth: number[] }) => {
        if (!cancelled && data?.hop && Array.isArray(data.mouth)) vocalRef.current = data;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    };
  }, []);

  if (!score) return null;

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
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
            <div className="score-mic-frame" aria-hidden="true">
              <img className="score-mic" src="/work/crimson-moon/bone-mic.png" alt="" />
            </div>
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
