"use client";

import { useEffect, useRef } from "react";
import type { HimeHandle } from "@/components/HimeFigure";
import { HimePortrait } from "@/components/HimeLive2D";

export function HimePlate() {
  const figureRef = useRef<HimeHandle>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const baseAmplitude = [5, 2.4, 3];
    const breathFreqs = [0.12, 0.08, 0.06];
    const breathPhases = [0.4, 2.1, 4.2];
    const step = 0.05;
    const sway = [0, 1, 2].map(() => ({ current: 0, target: 0, nextRetarget: 0 }));
    const started = performance.now() / 1000;
    let lastTick = started;
    let frame = 0;

    const tick = (nowMs: number) => {
      const now = nowMs / 1000;
      const elapsed = now - started;
      const dt = Math.min(0.05, Math.max(0, now - lastTick));
      lastTick = now;
      const angles = [0, 0, 0];
      if (!reduce.matches) {
        for (let i = 0; i < sway.length; i += 1) {
          const amp = baseAmplitude[i];
          const state = sway[i];
          if (now >= state.nextRetarget) {
            state.target = (Math.random() * 2 - 1) * amp;
            state.nextRetarget = now + 0.8 + Math.random() * 1.6;
          }
          const follow = 1 - (1 - Math.min(1, step * 2.5)) ** (dt / step);
          state.current += (state.target - state.current) * follow;
          angles[i] =
            state.current +
            amp * 0.35 * Math.sin(elapsed * breathFreqs[i] * Math.PI * 2 + breathPhases[i]);
        }
      }
      figureRef.current?.setPose({
        x: angles[0],
        y: angles[1],
        z: angles[2],
        blink: !reduce.matches && elapsed % 5.2 < 0.12,
        mouth: 0,
      });
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="plate-hime">
      <HimePortrait ref={figureRef} emotion="happy" followCursor={false} />
    </div>
  );
}
