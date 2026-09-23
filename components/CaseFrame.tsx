import type { ReactNode } from "react";
import { Gallery } from "@/components/Gallery";
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
      {work.images.length > 0 || work.video ? (
        <Gallery images={work.images} video={work.video} frame={work.frame} />
      ) : null}
      <div className="prose">{children}</div>
    </article>
  );
}
