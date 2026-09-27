import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: "Study, practice, and how to reach Yoru.",
};

export default function AboutPage() {
  return (
    <article className="about" data-hime-zone="about">
      <h1>About</h1>
      <p className="lede">{site.line}</p>

      <h2>The Practice</h2>
      <p>
        The work is for two readers at once. A designer should be able to see what a piece does. An
        engineer should be able to see how it runs. The practice is to carry an idea through both,
        until it can be played, held, or spoken to. Development is independent.
      </p>

      <h2>The Journey</h2>
      <p>
        Rensselaer was computing and cognitive science. Oregon was art. Carnegie Mellon is a
        certificate in machine learning and data science.
      </p>
      <ul className="schools">
        <li>
          <strong>Carnegie Mellon University</strong>
          <span>2026 | Certificate</span>
          <p>Machine Learning and Data Science Foundations</p>
        </li>
        <li>
          <strong>University of Oregon</strong>
          <span>2022 – 2024 | Bachelor&apos;s Degree</span>
          <p>Art</p>
        </li>
        <li>
          <strong>Rensselaer Polytechnic Institute</strong>
          <span>2021 – 2022 | Coursework</span>
          <p>Computer Science, minor in Cognitive Science</p>
        </li>
      </ul>

      <h2>The Build</h2>
      <p>Image and motion are how a piece looks. Sound is how it feels. The build is how it stays running.</p>
      <ul className="schools tracks">
        <li>
          <strong>Image &amp; Motion</strong>
          <p className="skill-row">
            <span>Midjourney</span>
            <span>Stable Diffusion</span>
            <span>ComfyUI</span>
            <span>Runway</span>
          </p>
          <p className="skill-row">
            <span>Adobe Photoshop</span>
            <span>Illustrator</span>
            <span>After Effects</span>
            <span>Premiere Pro</span>
          </p>
        </li>
        <li>
          <strong>Sound</strong>
          <p>Suno AI</p>
          <p>Original music officially released under Himemiya Yoru on major streaming platforms.</p>
        </li>
        <li>
          <strong>Code &amp; Architecture</strong>
          <p>Cursor</p>
          <p>Python, FastAPI</p>
          <p>React Native (Expo), React, Electron, Vite</p>
          <p>LLM Integration (OpenAI, Groq, local models), Whisper</p>
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Email: <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
      <p>
        GitHub:{" "}
        <a href={site.github} target="_blank" rel="noreferrer">
          github.com/Himemiyayoru
        </a>
      </p>
      <p>
        LinkedIn:{" "}
        <a href={site.linkedin} target="_blank" rel="noreferrer">
          linkedin.com/in/himemiyayoru
        </a>
      </p>
    </article>
  );
}
