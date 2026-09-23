import Image from "next/image";
import type { ReactNode } from "react";

export function Shot({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="shot-inline">
      <Image src={src} alt={alt} width={width} height={height} />
    </figure>
  );
}

export function Split({
  src,
  alt,
  width,
  height,
  side,
  title,
  children,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  side: "image-left" | "text-left";
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`split split-${side}`}>
      <figure>
        <Image src={src} alt={alt} width={width} height={height} />
      </figure>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}
