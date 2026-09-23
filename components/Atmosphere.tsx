"use client";

import { useEffect, useRef } from "react";

type Mark = {
  x: number;
  y: number;
  at: number;
};

const trailLength = 92;
const trailLife = 170;

export function Atmosphere() {
  const trail = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = trail.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const marks: Mark[] = [];
    const context = canvas?.getContext("2d") ?? null;

    function resize() {
      if (!canvas || !context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function trim(now: number) {
      while (marks.length > 0 && now - marks[0].at > trailLife) marks.shift();
      let length = 0;
      let start = 0;
      for (let index = marks.length - 1; index > 0; index -= 1) {
        const next = marks[index];
        const previous = marks[index - 1];
        length += Math.hypot(next.x - previous.x, next.y - previous.y);
        start = index - 1;
        if (length >= trailLength) break;
      }
      if (start > 0) marks.splice(0, start);
    }

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (!context) return;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      trim(now);
      if (marks.length < 2) return;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.2;
      for (let index = 1; index < marks.length; index += 1) {
        const fade = index / (marks.length - 1);
        context.beginPath();
        context.strokeStyle = `rgba(212, 180, 131, ${fade * fade * 0.8})`;
        context.moveTo(marks[index - 1].x, marks[index - 1].y);
        context.lineTo(marks[index].x, marks[index].y);
        context.stroke();
      }
    }

    function onMove(event: PointerEvent) {
      if (reduce) return;
      const previous = marks[marks.length - 1];
      if (previous) {
        const moved = Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
        if (moved < 2) return;
        if (moved > 140) marks.length = 0;
      }
      marks.push({ x: event.clientX, y: event.clientY, at: performance.now() });
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
