import { getWork } from "@/content/works";

export function Soundtrack() {
  const score = getWork("crimson-moon")?.score;
  if (!score) return null;

  return (
    <figure className="score">
      <figcaption>
        <span>Score</span> {score.title}
      </figcaption>
      <p>Produced with Suno and released on streaming platforms.</p>
      <audio controls preload="none" src={score.src}>
        {score.title}
      </audio>
      {score.links.length > 0 ? (
        <ul>
          {score.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
