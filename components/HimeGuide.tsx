"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isLineId, lines, type Emotion, type LineId } from "@/content/lines";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";

export function HimeGuide() {
  const figureRef = useRef<HimeHandle>(null);
  const [phase] = useState<"dock">("dock");
  const [caption, setCaption] = useState("");
  const [hint, setHint] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const emotionRef = useRef(emotion);
  emotionRef.current = emotion;
  const [unlocked, setUnlocked] = useState(false);
  const pathname = usePathname();
  const showRef = useRef<(id: LineId, replay?: boolean) => void>(() => {});

  useEffect(() => {
    const spoken = new Set<LineId>();
    const queue: LineId[] = [];
    let playing = false;
    let lastId: LineId | null = null;
    let pendingAudio: LineId | null = null;
    let audioUnlocked = false;
    let talkingUntil = 0;
    let reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let audio: HTMLAudioElement | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    const samples = new Uint8Array(128);
    let visualTimer = 0;
    let frame = 0;

    function level() {
      if (!analyser || !audio || audio.paused) return 0;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const v = (samples[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / samples.length) * 5);
    }

    function sentencesOf(text: string) {
      const parts = text.match(/[^.!?]+[.!?]+/g);
      const sentences = parts?.map((part) => part.trim()).filter(Boolean);
      return sentences && sentences.length > 0 ? sentences : [text.trim()];
    }

    function pump() {
      if (playing) return;
      const id = queue.shift();
      if (!id) return;
      const line = lines[id];
      if (!line.audio) {
        playing = true;
        const sentences = sentencesOf(line.text);
        let index = 0;
        const say = () => {
          const sentence = sentences[index];
          setCaption(sentence);
          const ms = Math.min(3200, 900 + sentence.length * 42);
          talkingUntil = performance.now() + ms;
          visualTimer = window.setTimeout(() => {
            index += 1;
            if (index < sentences.length) {
              say();
              return;
            }
            playing = false;
            talkingUntil = 0;
            pump();
          }, ms);
        };
        say();
        return;
      }
      if (!audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.addEventListener("ended", () => {
          playing = false;
          talkingUntil = 0;
          pump();
        });
      }
      if (!audioCtx) {
        const Ctx = window.AudioContext;
        audioCtx = new Ctx();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
      void audioCtx.resume();
      playing = true;
      talkingUntil = 0;
      audio.src = line.audio;
      void audio.play().catch(() => {
        playing = false;
        pump();
      });
    }

    function show(id: LineId, replay = false) {
      const line = lines[id];
      if (!replay && spoken.has(id)) return;
      spoken.add(id);
      lastId = id;
      setCaption(sentencesOf(line.text)[0] ?? line.text);
      setEmotion(line.emotion);
      if (line.audio && !audioUnlocked) {
        setHint(true);
        pendingAudio = id;
        return;
      }
      setHint(false);
      queue.push(id);
      pump();
    }

    function onZone(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const zone = target.closest("[data-hime-zone]")?.getAttribute("data-hime-zone");
      if (!zone || !isLineId(zone) || zone === "arrival") return;
      show(zone);
    }

    function onPointerDown() {
      audioUnlocked = true;
      setUnlocked(true);
      setHint(false);
      const waiting = pendingAudio;
      pendingAudio = null;
      if (waiting) {
        queue.push(waiting);
        pump();
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " ") onPointerDown();
    }

    function replay() {
      if (lastId) show(lastId, true);
    }

    const button = document.querySelector("[data-hime-replay]");
    button?.addEventListener("click", replay);
    document.addEventListener("pointerover", onZone);
    document.addEventListener("focusin", onZone);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);

    document.documentElement.dataset.hime = "dock";
    showRef.current = show;
    show("arrival");

    // Same idle loop as Project_Hime's VTS bridge: random-walk targets, a quiet
    // breath layer, and an occasional nod. FaceAngleX/Y/Z also lean the body.
    const moodScale: Record<Emotion, number> = {
      happy: 1.4,
      angry: 1.2,
      sad: 0.5,
      shock: 1.6,
      neutral: 1.0,
    };
    const baseAmplitude = [18, 10, 12];
    const breathFreqs = [0.16, 0.1, 0.07];
    const breathPhases = [0, 1.7, 3.1];
    const step = 0.05;
    const sway = [0, 1, 2].map(() => ({ current: 0, target: 0, nextRetarget: 0 }));
    let voiceSmooth = 0;
    let nextBounce = 0;
    let bounceStart: number | null = null;
    let bounceDuration = 0;
    let bounceAmplitude = 0;
    const started = performance.now() / 1000;
    let lastTick = started;

    const tick = (nowMs: number) => {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const now = nowMs / 1000;
      const elapsed = now - started;
      const dt = Math.min(0.05, Math.max(0, now - lastTick));
      lastTick = now;
      const blink = !reduce && elapsed % 4.6 < 0.12;
      const voiced = nowMs < talkingUntil ? 0.25 + Math.abs(Math.sin(elapsed * 16)) * 0.75 : level();
      const angles = [0, 0, 0];
      if (!reduce) {
        voiceSmooth += (voiced - voiceSmooth) * 0.12;
        const energy = moodScale[emotionRef.current] * (0.6 + 0.8 * voiceSmooth);
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
            amp *
            0.35 *
            Math.sin(elapsed * breathFreqs[i] * Math.PI * 2 + breathPhases[i]);
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
        blink,
        mouth: voiced,
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      showRef.current = () => {};
      window.clearTimeout(visualTimer);
      window.cancelAnimationFrame(frame);
      button?.removeEventListener("click", replay);
      document.removeEventListener("pointerover", onZone);
      document.removeEventListener("focusin", onZone);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      audio?.pause();
      void audioCtx?.close();
    };
  }, []);

  useEffect(() => {
    if (pathname === "/work/crimson-moon") showRef.current("crimson-moon", true);
    if (pathname === "/work/bobs-special-blend") showRef.current("bobs-special-blend", true);
  }, [pathname]);

  return (
    <aside className="hime" data-phase={phase} data-unlocked={unlocked ? "true" : "false"}>
      {phase === "dock" && caption ? (
        <div className="hime-caption" aria-live="polite">
          <p>{caption}</p>
          {hint ? <p className="hime-hint">Tap once and I&apos;ll talk.</p> : null}
        </div>
      ) : null}
      <button type="button" className="hime-button" data-hime-replay="" aria-label="Replay Hime's last line">
        <HimePortrait ref={figureRef} emotion={emotion} />
        <span>Hime</span>
      </button>
    </aside>
  );
}
