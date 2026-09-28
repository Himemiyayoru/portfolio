"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";
import { duskGlyphs } from "@/content/judgment-dusk-cues";
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

function LyricStage({ audioRef }: { audioRef: RefObject<HTMLAudioElement | null> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".score-ch"));
    const motes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      age: number;
      radius: number;
    }[] = [];
    let frame = 0;
    let last = performance.now();

    const fit = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);

    const glyphAt = (time: number) => {
      let lo = 0;
      let hi = nodes.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const start = Number(nodes[mid].dataset.s);
        const end = Number(nodes[mid].dataset.e);
        if (time < start) hi = mid - 1;
        else if (time >= end) lo = mid + 1;
        else return nodes[mid];
      }
      return null;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const audio = audioRef.current;
      const time = audio?.currentTime ?? 0;
      const active = glyphAt(time);
      const bounds = root.getBoundingClientRect();
      if (audio && !audio.paused && active && !reduce.matches) {
        const box = active.getBoundingClientRect();
        motes.push({
          x: box.left - bounds.left + box.width / 2 + (Math.random() - 0.5) * 10,
          y: box.top - bounds.top - 1,
          vx: (Math.random() - 0.5) * 8,
          vy: -10 - Math.random() * 14,
          life: 0.55 + Math.random() * 0.35,
          age: 0,
          radius: 0.7 + Math.random() * 0.8,
        });
      }

      context.clearRect(0, 0, bounds.width, bounds.height);
      for (let i = motes.length - 1; i >= 0; i -= 1) {
        const mote = motes[i];
        mote.age += dt;
        if (mote.age >= mote.life) {
          motes.splice(i, 1);
          continue;
        }
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        const fade = 1 - mote.age / mote.life;
        const radius = mote.radius * (0.8 + fade * 0.4);
        const paint = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, radius * 3);
        paint.addColorStop(0, `rgba(244, 226, 186, ${0.28 * fade})`);
        paint.addColorStop(1, "rgba(212, 180, 131, 0)");
        context.fillStyle = paint;
        context.beginPath();
        context.arc(mote.x, mote.y, radius * 3, 0, Math.PI * 2);
        context.fill();
      }
      if (motes.length > 36) motes.splice(0, motes.length - 36);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [audioRef]);

  return (
    <div className="score-lyrics" aria-label="Japanese lyrics" ref={rootRef}>
      <canvas ref={canvasRef} className="score-motes" aria-hidden="true" />
      {duskGlyphs.map((stanza, stanzaIndex) => (
        <p key={stanzaIndex}>
          {stanza.map((line, lineIndex) => (
            <span key={lineIndex} className="score-line">
              {line.map((glyph, glyphIndex) => (
                <span key={glyphIndex} className="score-ch" data-s={glyph.s} data-e={glyph.e}>
                  {glyph.ch}
                </span>
              ))}
            </span>
          ))}
        </p>
      ))}
    </div>
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
        <LyricStage audioRef={audioRef} />
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
