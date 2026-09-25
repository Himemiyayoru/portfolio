import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: "Study, practice, and how to reach Yoru.",
};

export default function AboutPage() {
  return (
    <article className="about" data-hime-zone="about">
      <p className="meta">
        <span>Practice</span>
      </p>
      <h1>About</h1>
      <p className="lede">{site.line}</p>
      <p>
        The work joins artificial intelligence with art, and brings that intelligence into daily life.
        Rensselaer taught computing and AI. Oregon was an education in art. Carnegie Mellon is the
        study of data, kept with care, and of models, trained with care. Development is independent,
        with AI as the instrument, and an idea is carried through until it is real
      </p>
      <ul className="schools">
        <li>
          <strong>Rensselaer Polytechnic Institute</strong>
          <span>2021–2022</span>
          <p>Coursework</p>
          <p>Computer Science minor in Cognitive Science</p>
        </li>
        <li>
          <strong>University of Oregon</strong>
          <span>2022–2024</span>
          <p>Bachelor</p>
          <p>Art</p>
        </li>
        <li>
          <strong>Carnegie Mellon University</strong>
          <span>2026–2026</span>
          <p>Certificate</p>
          <p>Machine Learning and Data Science Foundation</p>
        </li>
      </ul>
      <h2>Practice</h2>
      <ul className="schools">
        <li>
          <strong>Image and motion</strong>
          <p className="skill-row">
            <span>Midjourney</span>
            <span>Stable Diffusion</span>
            <span>ComfyUI</span>
            <span>Runway</span>
          </p>
        </li>
        <li>
          <strong>Sound</strong>
          <p>Suno</p>
        </li>
        <li>
          <strong>Adobe</strong>
          <p className="skill-row">
            <span>Photoshop</span>
            <span>Illustrator</span>
            <span>After Effects</span>
            <span>Premiere</span>
          </p>
        </li>
        <li>
          <strong>Build</strong>
          <p className="skill-row">
            <span>Cursor</span>
            <span>Python</span>
          </p>
        </li>
      </ul>
      <h2>Contact</h2>
      <ul className="schools">
        <li>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </li>
        <li>
          <a href={site.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </li>
        <li>
          <a href={site.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </li>
      </ul>
    </article>
  );
}
