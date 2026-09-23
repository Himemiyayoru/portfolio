export function HimeDiagram() {
  return (
    <figure className="diagram">
      <div className="diagram-flow" aria-label="Voice, typing, and five screen scenes enter one queue, then one streamed reply, then a trained voice, the model's expressions, and dated memory.">
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
        The person's voice goes first. The face can open any expression the model publishes. The screen changes rate with the scene.
      </figcaption>
    </figure>
  );
}
