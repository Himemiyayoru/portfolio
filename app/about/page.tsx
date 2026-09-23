import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: "Education and the materials Yoru works with.",
};

export default function AboutPage() {
  return (
    <article className="about" data-hime-zone="about">
      <p className="meta">
        <span>Practice</span>
      </p>
      <h1>About</h1>
      <p className="lede">{site.line}</p>
      <ul className="schools">
        <li>
          <strong>Rensselaer Polytechnic Institute</strong>
          <span>Computer Science, minor in Cognitive Science</span>
          <p>How people perceive and decide.</p>
        </li>
        <li>
          <strong>University of Oregon</strong>
          <span>Bachelor of Arts</span>
          <p>Image, sequence, and narrative.</p>
        </li>
        <li>
          <strong>Carnegie Mellon University</strong>
          <span>Machine Learning and Data Science Foundations, through December 2026</span>
          <p>Models as a material.</p>
        </li>
      </ul>
      <h2>Materials</h2>
      <p>
        I generate images and video with Midjourney and Stable Diffusion, then finish them in
        Photoshop, After Effects, and Premiere. I use Cursor to push a project from a rough system
        into something you can run. When a character or a rule should stay on the machine, I keep
        the model local.
      </p>
    </article>
  );
}
