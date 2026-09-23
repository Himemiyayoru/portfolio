"use client";

import { useEffect, useRef } from "react";

export function Atmosphere() {
  const lamp = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let plate: HTMLElement | null = null;

    function clear() {
      plate?.classList.remove("is-lit");
      plate = null;
    }

    function onMove(event: PointerEvent) {
      if (!reduce && lamp.current) {
        lamp.current.style.setProperty("--lx", `${event.clientX}px`);
        lamp.current.style.setProperty("--ly", `${event.clientY}px`);
      }
      const next = (event.target as Element | null)?.closest?.(".plate");
      if (next !== plate) {
        plate?.classList.remove("is-lit");
        plate = next instanceof HTMLElement ? next : null;
        plate?.classList.add("is-lit");
      }
      if (!plate) return;
      const rect = plate.getBoundingClientRect();
      plate.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      plate.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);

  return (
    <>
      <div className="lamp" ref={lamp} aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
