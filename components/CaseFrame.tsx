import Image from "next/image";
import type { ReactNode } from "react";
import type { Work } from "@/content/works";

export function CaseFrame({ work, children }: { work: Work; children: ReactNode }) {
  return (
    <article className="case" data-hime-zone={work.slug} data-tone={work.tone}>
      <p className="meta">
        <span>{work.year}</span>
        <span>{work.status}</span>
        <span>{work.role}</span>
      </p>
      <h1>{work.title}</h1>
      <p className="lede">{work.lede}</p>
      {work.frame === "phone" ? (
        <div className="phone-row">
          {work.video ? (
            <video
              className="phone-shot"
              src={work.video.src}
              width={work.video.width}
              height={work.video.height}
              autoPlay
              muted
              loop
              playsInline
              aria-label={work.video.label}
            />
          ) : null}
          {work.images.map((image, index) => (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              priority={index === 0}
              className="phone-shot"
            />
          ))}
        </div>
      ) : (
        work.images.map((image, index) => (
          <figure key={image.src} className="wide-still">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              priority={index === 0}
            />
          </figure>
        ))
      )}
      <div className="prose">{children}</div>
    </article>
  );
}
