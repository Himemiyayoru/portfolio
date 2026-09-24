"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/content/works";

export function Gallery({
  images,
  video,
  frame = "wide",
}: {
  images: GalleryImage[];
  video?: { src: string; width: number; height: number; label: string };
  frame?: "wide" | "phone";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [full, setFull] = useState(false);
  const clip = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLElement>(null);
  const shot = open === null ? null : images[open];

  useEffect(() => {
    function onFull() {
      setFull(document.fullscreenElement === stage.current);
    }
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  async function toggleFull() {
    const frame = stage.current;
    if (!frame) return;
    if (document.fullscreenElement === frame) {
      await document.exitFullscreen();
    } else {
      await frame.requestFullscreen();
    }
  }

  useEffect(() => {
    const node = clip.current;
    if (!node) return;
    node.muted = true;
    void node.play().catch(() => {});
  }, [video?.src]);

  useEffect(() => {
    if (open === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const solo = Boolean(video) && images.length === 0;

  return (
    <>
      <div className={[frame === "phone" ? "gallery phone" : "gallery", solo ? "gallery-solo" : ""].filter(Boolean).join(" ")}>
        {video ? (
          <figure className="gallery-player" ref={stage}>
            <video
              ref={clip}
              className="gallery-video"
              src={video.src}
              width={video.width}
              height={video.height}
              autoPlay
              muted
              loop
              playsInline
              aria-label={video.label}
            />
            <div className="gallery-video-bar">
              <button
                type="button"
                className="player-toggle"
                aria-label={full ? "Exit full screen" : "Full screen"}
                aria-pressed={full}
                onClick={() => void toggleFull()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {full ? (
                    <path d="M9 4v3H6v2h5V4H9zm6 3V4h-2v5h5V7h-3zM4 15v2h3v3h2v-5H4zm11 0v5h2v-3h3v-2h-5z" />
                  ) : (
                    <path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm13 3h-3v2h5v-5h-2v3z" />
                  )}
                </svg>
              </button>
            </div>
          </figure>
        ) : null}
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className="shot"
            onClick={() => setOpen(index)}
            aria-label={`Enlarge: ${image.alt}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              priority={index === 0}
              style={{ width: "100%", height: "auto" }}
            />
          </button>
        ))}
      </div>
      {shot ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={() => setOpen(null)}>
          <button type="button" className="lightbox-close" onClick={() => setOpen(null)}>
            Close
          </button>
          <img src={shot.src} alt={shot.alt} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
