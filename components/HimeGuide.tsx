"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isLineId, lines, type Emotion, type LineId } from "@/content/lines";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";

function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h3.5L13 20V4L7.5 9H4zm11.2 3a3.2 3.2 0 0 0-1.7-2.8v5.6A3.2 3.2 0 0 0 15.2 12z" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h3.5L13 20V4L7.5 9H4zm14.7 3 2.3-2.3-1.4-1.4L17.3 10.6 15 8.3l-1.4 1.4 2.3 2.3-2.3 2.3 1.4 1.4 2.3-2.3 2.3 2.3 1.4-1.4z" />
    </svg>
  );
}

export function HimeGuide() {
  const figureRef = useRef<HimeHandle>(null);
  const [phase] = useState<"dock">("dock");
  const [caption, setCaption] = useState("");
  const [hint, setHint] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const emotionRef = useRef(emotion);
  emotionRef.current = emotion;
  const [unlocked, setUnlocked] = useState(false);
  const [hush, setHush] = useState(false);
  const hushRef = useRef(false);
  const applyHushRef = useRef<(on: boolean) => void>(() => {});
  const pathname = usePathname();
  const showRef = useRef<(id: LineId) => void>(() => {});

  useEffect(() => {
    const queue: LineId[] = [];
    let playing = false;
    let lastId: LineId | null = null;
    let lastPoke: LineId | null = null;
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

    function attachAnalyser() {
      if (!audio || !audioCtx || analyser || audioCtx.state !== "running") return;
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

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

    const workLines = new Set<LineId>([
      "crimson-moon",
      "crimson-moon-card",
      "bobs-special-blend",
      "bobs-special-blend-card",
      "hime",
      "hime-card",
      "about",
      "forty-eight",
    ]);
    let activeWork: LineId | null = null;
    let speech = 0;
    let introOpen = false;
    let introHeld = false;
    let usingAudio = false;
    let currentLine: LineId | null = null;
    let captionCursor = 0;

    function isIntro(id: LineId) {
      return id === "arrival" || workLines.has(id);
    }

    function ensureAudio() {
      if (!audio) {
        audio = new Audio();
        audio.preload = "auto";
        audio.dataset.himeVoice = "1";
      }
      if (!audioCtx) audioCtx = new AudioContext();
      void audioCtx.resume().then(() => attachAnalyser());
    }

    function mediaBusy() {
      const nodes = document.querySelectorAll("audio, video");
      for (const node of nodes) {
        if (!(node instanceof HTMLMediaElement) || node === audio) continue;
        if (node.dataset.himeVoice === "1") continue;
        if (node.paused || node.ended || node.muted || node.volume === 0) continue;
        return true;
      }
      return false;
    }

    function voiceAllowed() {
      return !hushRef.current && !mediaBusy() && !introHeld;
    }

    function haltAudio() {
      if (!audio) return;
      audio.onended = null;
      audio.muted = true;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        /* metadata not ready yet */
      }
    }

    function releaseIfReady() {
      if (hushRef.current || mediaBusy() || introOpen) return;
      introHeld = false;
      if (audio) audio.muted = false;
    }

    function finishLine(id: LineId, mine: number) {
      if (mine !== speech) return;
      playing = false;
      talkingUntil = 0;
      usingAudio = false;
      if (isIntro(id)) {
        introOpen = false;
        introHeld = mediaBusy() || hushRef.current;
      }
      releaseIfReady();
      pump();
    }

    function runText(id: LineId, mine: number, from: number) {
      const line = lines[id];
      const sentences = sentencesOf(line.text);
      if (isIntro(id)) {
        introOpen = true;
        if (!voiceAllowed()) introHeld = true;
      }
      usingAudio = false;
      playing = true;
      const say = () => {
        if (mine !== speech) return;
        if (captionCursor >= sentences.length) {
          finishLine(id, mine);
          return;
        }
        setCaption(sentences[captionCursor]);
        const ms = Math.min(3200, 900 + sentences[captionCursor].length * 42);
        talkingUntil = performance.now() + ms;
        captionCursor += 1;
        visualTimer = window.setTimeout(say, ms);
      };
      captionCursor = from;
      if (from > 0 && from <= sentences.length) {
        const shown = sentences[Math.min(from, sentences.length) - 1] ?? "";
        const ms = Math.min(3200, 900 + shown.length * 42);
        visualTimer = window.setTimeout(say, ms);
        return;
      }
      say();
    }

    function runAudio(id: LineId, mine: number) {
      const line = lines[id];
      if (!line.audio) {
        runText(id, mine, 0);
        return;
      }
      ensureAudio();
      if (!audio) return;
      const sentences = sentencesOf(line.text);
      const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0) || 1;
      if (isIntro(id)) introOpen = true;
      usingAudio = true;
      playing = true;
      talkingUntil = 0;
      audio.muted = false;
      audio.onended = () => {
        if (mine !== speech || !usingAudio) return;
        finishLine(id, mine);
      };
      const follow = (durationMs: number) => {
        if (mine !== speech || !usingAudio) return;
        window.clearTimeout(visualTimer);
        let index = 0;
        const step = () => {
          if (mine !== speech || !usingAudio) return;
          setCaption(sentences[index]);
          captionCursor = index + 1;
          const wait = (sentences[index].length / total) * durationMs;
          index += 1;
          if (index >= sentences.length) return;
          visualTimer = window.setTimeout(step, wait);
        };
        step();
      };
      setCaption(sentences[0] ?? line.text);
      captionCursor = 1;
      audio.src = line.audio;
      audio.onloadedmetadata = () => {
        if (mine !== speech || !usingAudio || !Number.isFinite(audio?.duration)) return;
        const durationMs = (audio?.duration ?? 0) * 1000;
        follow(durationMs);
        if (!analyser) talkingUntil = performance.now() + durationMs;
      };
      void audio.play().catch((error: unknown) => {
        if (mine !== speech || !usingAudio) return;
        const name = error instanceof DOMException ? error.name : "";
        if (name === "AbortError") return;
        playing = false;
        usingAudio = false;
        audioUnlocked = false;
        setUnlocked(false);
        setHint(true);
        pendingAudio = lastId;
      });
    }

    function cutVoiceToText() {
      if (introOpen) introHeld = true;
      if (!usingAudio) {
        haltAudio();
        return;
      }
      const line = currentLine;
      const mine = speech;
      const from = captionCursor;
      usingAudio = false;
      haltAudio();
      window.clearTimeout(visualTimer);
      if (line) runText(line, mine, from);
    }

    function silenceNow() {
      cutVoiceToText();
    }

    function onForeignMedia(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement)) return;
      if (target === audio || target.dataset.himeVoice === "1") return;
      if (mediaBusy()) {
        silenceNow();
        return;
      }
      releaseIfReady();
    }

    function pump() {
      if (playing) return;
      const id = queue.shift();
      if (!id) return;
      currentLine = id;
      const line = lines[id];
      if (line.audio && voiceAllowed()) runAudio(id, speech);
      else runText(id, speech, 0);
    }

    function show(id: LineId) {
      if (!audioUnlocked) {
        pendingAudio = id;
        setCaption("");
        setHint(true);
        return;
      }
      window.clearTimeout(visualTimer);
      speech += 1;
      playing = false;
      talkingUntil = 0;
      usingAudio = false;
      queue.length = 0;
      haltAudio();
      const line = lines[id];
      lastId = id;
      currentLine = id;
      captionCursor = 0;
      setEmotion(line.emotion);
      setHint(false);
      pendingAudio = null;
      queue.push(id);
      pump();
    }

    function onZone(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const zone = target.closest("[data-hime-zone]")?.getAttribute("data-hime-zone");
      if (!audioUnlocked) return;
      if (!zone || !isLineId(zone) || zone === "arrival") return;
      if (zone === activeWork) return;
      activeWork = zone;
      show(zone);
    }

    function onHimeClick(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      if (playing || (audio && !audio.paused)) return;
      const choices: LineId[] = ["poke-tickle", "poke-beauty", "poke-affection"];
      const pool = choices.filter((id) => id !== lastPoke);
      const next = pool[Math.floor(Math.random() * pool.length)];
      lastPoke = next;
      show(next);
    }

    function onPointerDown(event?: Event) {
      const first = !audioUnlocked;
      audioUnlocked = true;
      setUnlocked(true);
      setHint(false);
      void audioCtx?.resume().then(() => attachAnalyser());
      const target = event?.target;
      if (!first && target instanceof Element && target.closest("[data-hime-replay]")) {
        pendingAudio = null;
        return;
      }
      const zone =
        target instanceof Element
          ? target.closest("a[data-hime-zone]")?.getAttribute("data-hime-zone")
          : null;
      if (zone && isLineId(zone)) {
        const page = zone.endsWith("-card") ? zone.slice(0, -"-card".length) : zone;
        if (isLineId(page)) {
          pendingAudio = null;
          activeWork = page;
          show(page);
          return;
        }
      }
      const href =
        target instanceof Element ? target.closest("a")?.getAttribute("href") : null;
      if (href === "/about") {
        pendingAudio = null;
        activeWork = "about";
        show("about");
        return;
      }
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

    const button = document.querySelector("[data-hime-replay]");
    button?.addEventListener("click", onHimeClick);
    document.addEventListener("pointerover", onZone);
    document.addEventListener("focusin", onZone);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);

    applyHushRef.current = (on) => {
      if (on) cutVoiceToText();
      else releaseIfReady();
    };
    document.addEventListener("play", onForeignMedia, true);
    document.addEventListener("playing", onForeignMedia, true);
    document.addEventListener("pause", onForeignMedia, true);
    document.addEventListener("ended", onForeignMedia, true);
    document.addEventListener("volumechange", onForeignMedia, true);

    document.documentElement.dataset.hime = "dock";
    setHint(true);
    showRef.current = (id) => {
      if (id === activeWork) return;
      activeWork = id;
      show(id);
    };
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
      button?.removeEventListener("click", onHimeClick);
      document.removeEventListener("pointerover", onZone);
      document.removeEventListener("focusin", onZone);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("play", onForeignMedia, true);
      document.removeEventListener("playing", onForeignMedia, true);
      document.removeEventListener("pause", onForeignMedia, true);
      document.removeEventListener("ended", onForeignMedia, true);
      document.removeEventListener("volumechange", onForeignMedia, true);
      applyHushRef.current = () => {};
      audio?.pause();
      void audioCtx?.close();
    };
  }, []);

  useEffect(() => {
    if (pathname === "/work/crimson-moon") showRef.current("crimson-moon");
    if (pathname === "/work/bobs-special-blend") showRef.current("bobs-special-blend");
    if (pathname === "/work/hime") showRef.current("hime");
    if (pathname === "/about") showRef.current("about");
  }, [pathname]);

  return (
    <aside className="hime" data-phase={phase} data-unlocked={unlocked ? "true" : "false"}>
      {phase === "dock" && (!unlocked || caption) ? (
        <div className="hime-caption" aria-live="polite">
          <p>{unlocked ? caption : "Tap screen and I'll talk."}</p>
        </div>
      ) : null}
      <button
        type="button"
        className="hime-mute"
        aria-label={hush ? "Unmute Hime" : "Mute Hime"}
        aria-pressed={hush}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = !hushRef.current;
          hushRef.current = next;
          setHush(next);
          applyHushRef.current(next);
        }}
      >
        {hush ? <MutedIcon /> : <VoiceIcon />}
      </button>
      <button type="button" className="hime-button" data-hime-replay="" aria-label="Hime">
        <HimePortrait ref={figureRef} emotion={emotion} />
        <span>Hime</span>
      </button>
    </aside>
  );
}
