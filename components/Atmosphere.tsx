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
  angle: number;
  spin: number;
};

export function Atmosphere() {
  const trail = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = trail.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    let lastSpawn = 0;
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

    function spawn(x: number, y: number, now: number) {
      if (now - lastSpawn < 110) return;
      lastSpawn = now;
      for (let index = 0; index < 4; index += 1) {
        if (motes.length > 12) motes.shift();
        const direction = Math.random() * Math.PI * 2;
        const speed = 42 + Math.random() * 48;
        motes.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed,
          life: 1,
          decay: 2.4 + Math.random() * 0.7,
          size: 5 + Math.random() * 1.6,
          angle: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.8,
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
        mote.x += mote.vx * delta;
        mote.y += mote.vy * delta;
        mote.angle += mote.spin * delta;
        const alpha = mote.life * 0.7;
        const radius = mote.size * (0.7 + mote.life * 0.3);
        context.save();
        context.translate(mote.x, mote.y);
        context.rotate(mote.angle);
        context.strokeStyle = `rgba(212, 180, 131, ${alpha})`;
        context.fillStyle = `rgba(243, 234, 223, ${alpha})`;
        context.lineWidth = 1.15;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(-radius, 0);
        context.lineTo(radius, 0);
        context.moveTo(0, -radius);
        context.lineTo(0, radius);
        context.moveTo(-radius * 0.55, -radius * 0.55);
        context.lineTo(radius * 0.55, radius * 0.55);
        context.moveTo(radius * 0.55, -radius * 0.55);
        context.lineTo(-radius * 0.55, radius * 0.55);
        context.stroke();
        context.beginPath();
        context.arc(0, 0, 0.85, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    function onMove(event: PointerEvent) {
      if (reduce) return;
      const moved = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      if (hasLast && moved >= 10 && moved <= 160) spawn(event.clientX, event.clientY, performance.now());
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
