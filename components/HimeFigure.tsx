"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Emotion } from "@/content/lines";

export type HimePose = {
  /** Head lean in degrees: the same FaceAngleX/Y/Z inputs the desktop idle loop writes. */
  x: number;
  y: number;
  z: number;
  blink: boolean;
  mouth: number;
  /** A E I O U viseme. Absent means the mouth only opens, with no vowel shape. */
  vowel?: "a" | "e" | "i" | "o" | "u" | null;
};

export type HimeFrame = "bust" | "stand";

export type HimeHandle = {
  setPose: (pose: HimePose) => void;
  setFrame?: (frame: HimeFrame) => void;
};

export const HimeFigure = forwardRef<HimeHandle, { emotion: Emotion }>(
  function HimeFigure({ emotion }, ref) {
    const headRef = useRef<SVGGElement>(null);
    const mouthRef = useRef<SVGEllipseElement>(null);
    const lidsRef = useRef<SVGGElement>(null);

    useImperativeHandle(ref, () => ({
      setPose(pose) {
        headRef.current?.setAttribute(
          "transform",
          `translate(${(pose.x * 0.09).toFixed(2)} ${(pose.y * 0.11).toFixed(2)}) rotate(${(pose.z * 0.35).toFixed(2)} 100 116)`,
        );
        mouthRef.current?.setAttribute("ry", (1.5 + pose.mouth * 6.5).toFixed(2));
        lidsRef.current?.setAttribute("opacity", pose.blink ? "1" : "0");
      },
    }));

    return (
      <svg
        className="hime-svg"
        viewBox="0 0 200 248"
        data-emotion={emotion}
        aria-hidden="true"
      >
        <rect className="hime-card" x="10" y="10" width="180" height="228" rx="6" />
        <circle className="hime-moon" cx="100" cy="78" r="26" />
        <g ref={headRef}>
          <ellipse className="hime-hair" cx="100" cy="118" rx="50" ry="58" />
          <ellipse className="hime-face" cx="100" cy="116" rx="33" ry="40" />
          <path className="hime-bangs" d="M68 102c8-28 56-32 64-2 2 18-8 8-16 10-8-6-14-4-20 2-8-8-18-4-28-10z" />
          <g className="eyes">
            <ellipse className="eye" cx="87" cy="116" rx="4.2" ry="3.1" />
            <ellipse className="eye" cx="113" cy="116" rx="4.2" ry="3.1" />
          </g>
          <g ref={lidsRef} className="lids" opacity="0">
            <ellipse cx="87" cy="116" rx="6" ry="4.2" />
            <ellipse cx="113" cy="116" rx="6" ry="4.2" />
          </g>
          <path className="brow brow-l" d="M78 106c6-4 12-4 16 0" />
          <path className="brow brow-r" d="M106 106c6-4 12-4 16 0" />
          <ellipse ref={mouthRef} className="mouth" cx="100" cy="136" rx="7" ry="1.5" />
          <path className="collar" d="M78 168c8 14 36 14 44 0" />
        </g>
      </svg>
    );
  },
);
