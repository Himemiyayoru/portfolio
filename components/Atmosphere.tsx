"use client";

import { useEffect, useRef } from "react";

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hot: boolean;
};

export function Atmosphere() {
  const trail = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = trail.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    let frame = 0;
    let lastFrame = 0;
    const motes: Mote[] = [];
    const context = canvas?.getContext("2d") ?? null;

    function resize() {
      if (!canvas || !context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function spawn(x0: number, y0: number, x1: number, y1: number) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const distance = Math.hypot(dx, dy);
      if (distance < 4 || distance > 140) return;
      const steps = Math.min(5, Math.max(1, Math.floor(distance / 12)));
      for (let index = 0; index < steps; index += 1) {
        if (motes.length > 72) motes.shift();
        const along = (index + 1) / steps;
        const scatter = (Math.random() - 0.5) * 8;
        motes.push({
          x: x0 + dx * along + scatter,
          y: y0 + dy * along + scatter * 0.55,
          vx: (-dx / distance) * (0.2 + Math.random() * 0.45),
          vy: (-dy / distance) * (0.12 + Math.random() * 0.28) + 0.16,
          life: 1,
          decay: 1.5 + Math.random() * 1.3,
          size: Math.random() < 0.2 ? 2.2 + Math.random() * 1.3 : 0.9 + Math.random() * 1.2,
          hot: Math.random() < 0.28,
        });
      }
    }

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (!context) return;
      const delta = Math.min(0.05, (now - (lastFrame || now)) / 1000);
      lastFrame = now;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let index = motes.length - 1; index >= 0; index -= 1) {
        const mote = motes[index];
        mote.life -= delta * mote.decay;
        if (mote.life <= 0) {
          motes.splice(index, 1);
          continue;
        }
        mote.x += mote.vx;
        mote.y += mote.vy;
        const alpha = mote.life * mote.life;
        const radius = mote.size * (0.45 + mote.life * 0.55);
        context.beginPath();
        context.fillStyle = mote.hot
          ? `rgba(243, 234, 223, ${alpha})`
          : `rgba(212, 180, 131, ${alpha * 0.92})`;
        context.arc(mote.x, mote.y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function onMove(event: PointerEvent) {
      if (reduce) return;
      if (hasLast) spawn(lastX, lastY, event.clientX, event.clientY);
      lastX = event.clientX;
      lastY = event.clientY;
      hasLast = true;
    }

    resize();
    if (!reduce && context) frame = requestAnimationFrame(draw);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas className="trail" ref={trail} aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
