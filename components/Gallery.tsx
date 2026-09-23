"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  const shot = open === null ? null : images[open];

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

  return (
    <>
      <div className={frame === "phone" ? "gallery phone" : "gallery"}>
        {video ? (
          <video
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
