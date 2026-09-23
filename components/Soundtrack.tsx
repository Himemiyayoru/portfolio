"use client";

import { useEffect, useRef, useState } from "react";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";
import { judgmentDuskLyrics } from "@/content/judgment-dusk";
import { getWork } from "@/content/works";

const lines = judgmentDuskLyrics.flat();

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

export function Soundtrack() {
  const score = getWork("crimson-moon")?.score;
  const figureRef = useRef<HimeHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const freq = new Uint8Array(128);
    let frame = 0;
    let mouth = 0;
    let body = 0;
    let shownLine = -1;
    const started = performance.now() / 1000;

    const tick = (nowMs: number) => {
      const elapsed = nowMs / 1000 - started;
      const audio = audioRef.current;
      const singing = playingRef.current && audio !== null && !audio.paused;
      let vocal = 0;
      let pulse = 0;
      if (singing && analyserRef.current && contextRef.current) {
        analyserRef.current.getByteFrequencyData(freq);
        const rate = contextRef.current.sampleRate;
        vocal = band(freq, rate, 180, 3800);
        pulse = band(freq, rate, 40, 240);
        const duration = audio.duration;
        if (duration > 0) {
          const index = Math.min(lines.length - 1, Math.floor((audio.currentTime / duration) * lines.length));
          if (index !== shownLine) {
            shownLine = index;
            setLineIndex(index);
          }
        }
      } else if (shownLine !== -1) {
        shownLine = -1;
        setLineIndex(-1);
      }

      const quiet = reduce.matches;
      mouth += ((singing && !quiet ? Math.min(1, vocal * 2.4) : 0) - mouth) * 0.18;
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
    const box = lyricsRef.current;
    const current = box?.querySelector<HTMLElement>(".is-current");
    if (!box || !current) return;
    const top = current.offsetTop - box.clientHeight / 2 + current.clientHeight / 2;
    box.scrollTo({ top, behavior: "smooth" });
  }, [lineIndex]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
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
      contextRef.current = context;
      analyserRef.current = analyser;
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

  let seen = -1;

  return (
    <figure className="score">
      <figcaption>
        <span>Score</span> {score.title}
      </figcaption>
      <div className="score-stage">
        <div className="score-singer">
          <div className="score-stage-slot">
            <HimePortrait ref={figureRef} emotion={playing ? "happy" : "neutral"} followCursor={false} />
          </div>
          <button type="button" className="score-play" aria-pressed={playing} onClick={() => void toggle()}>
            {playing ? "Pause" : "Play"}
          </button>
        </div>
        <div className="score-lyrics" ref={lyricsRef} aria-label="Japanese lyrics">
          {judgmentDuskLyrics.map((stanza, stanzaIndex) => (
            <p key={stanzaIndex}>
              {stanza.map((line) => {
                seen += 1;
                const index = seen;
                const active = index === lineIndex;
                return (
                  <span key={line} className={active ? "score-line is-current" : "score-line"}>
                    {line}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>
      <p>Produced with Suno. The voice in the song is the score, not Hime&apos;s own.</p>
      <audio
        ref={audioRef}
        preload="metadata"
        src={score.src}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </figure>
  );
}
