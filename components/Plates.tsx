import Image from "next/image";
import Link from "next/link";
import { Spine } from "@/components/Spine";
import { HimeMark } from "@/components/HimeMark";
import { works } from "@/content/works";

export function Plates() {
  return (
    <ol className="plates">
      {works.map((work, index) => (
        <li key={work.slug}>
          <Link href={`/work/${work.slug}`} data-hime-zone={work.slug} className="plate">
            <span className="plate-index">{String(index + 1).padStart(2, "0")}</span>
            <div className={`plate-art plate-art-${work.frame}`}>
              {work.images[0] ? (
                <Image
                  src={work.images[0].src}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(max-width: 800px) 100vw, 40vw"
                  style={{ objectFit: "cover", objectPosition: work.frame === "phone" ? "center 42%" : "center" }}
                />
              ) : work.slug === "hime" ? (
                <HimeMark />
              ) : (
                <Spine compact />
              )}
            </div>
            <div className="plate-copy">
              <h2>{work.title}</h2>
              <p>{work.plate}</p>
              <span className="status">{work.status}</span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
