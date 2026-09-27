export function HimeDiagram() {
  return (
    <figure className="diagram">
        <div className="diagram-flow" aria-label="Voice, typing, and the screen enter one queue, then one streamed reply, then speech, the face, and memory.">
        <div>
          <span>Voice in</span>
          <span>Typed line</span>
          <span>Screen</span>
        </div>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <span>One queue</span>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <span>Streamed reply</span>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <div>
          <span>Speech</span>
          <span>Face</span>
          <span>Memory</span>
        </div>
      </div>
      <figcaption>
        Voice, typing, and the screen share one queue. Speech and the face stay on the machine. Hearing, the reply, and vision go out through APIs.
      </figcaption>
    </figure>
  );
}
