export function HimeDiagram() {
  return (
    <figure className="diagram">
      <div className="diagram-flow" aria-label="Voice and screen enter one queue, then a fast reply and a slower continuation, then speech, a face, and memory.">
        <div>
          <span>Voice in</span>
          <span>Screen</span>
        </div>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <span>One queue</span>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <div>
          <span>Fast reply</span>
          <span>Slower continuation</span>
        </div>
        <span className="diagram-arrow" aria-hidden="true">→</span>
        <span>Speech, face, memory</span>
      </div>
      <figcaption>
        Emotion is a tag she says. Her mouth follows her own voice. Vision is the loop still being tuned.
      </figcaption>
    </figure>
  );
}
