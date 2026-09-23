import Link from "next/link";
import { creditName, site } from "@/content/site";

export function Header() {
  const name = creditName();
  return (
    <header className="mast">
      <Link href="/" className="mast-name">
        <span>{name}</span>
        <small>{site.studio}</small>
      </Link>
      <p className="mast-role">{site.role}</p>
      <nav>
        <Link href="/about" data-hime-zone="about">
          About
        </Link>
        {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : null}
        {site.resumeHref ? <a href={site.resumeHref}>Résumé</a> : null}
        <a href={site.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
