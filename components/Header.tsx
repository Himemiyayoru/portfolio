import Link from "next/link";
import { site } from "@/content/site";

export function Header() {
  return (
    <header className="mast">
      <Link href="/" className="mast-name">
        <span>Yoru Himemiya</span>
        <small>{site.legalName}</small>
      </Link>
      <p className="mast-role">{site.role}</p>
      <nav>
        <Link href="/about" data-hime-zone="about">
          About
        </Link>
        {site.resumeHref ? <a href={site.resumeHref}>Résumé</a> : null}
      </nav>
    </header>
  );
}
