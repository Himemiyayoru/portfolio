export function HimeDiagram() {
  return (
    <figure className="diagram">
      <div
        className="topo"
        aria-label="Hybrid architecture. Microphone audio goes to Groq Whisper and then the priority queue. The keyboard goes straight to the queue. The screen goes to OpenRouter vision and then the queue. The queue calls Groq for the streaming reply, which is spoken by local GPT-SoVITS and shown on the local VTube Studio face. After a turn, Groq extracts a memory into local ChromaDB and the diary."
      >
        <p className="topo-key">
          <span className="is-local">On this machine</span>
          <span className="is-remote">External API</span>
        </p>
        <ol>
          <li>
            <span className="is-local">Microphone</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-remote">Groq Whisper</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-local">Priority queue</span>
          </li>
          <li>
            <span className="is-local">Keyboard</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-local">Priority queue</span>
          </li>
          <li>
            <span className="is-local">Screen</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-remote">OpenRouter vision</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-local">Priority queue</span>
          </li>
          <li>
            <span className="is-local">Priority queue</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-remote">Groq streaming reply</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-local">GPT-SoVITS · VTube Studio</span>
          </li>
          <li>
            <span className="is-local">Priority queue</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-remote">Groq memory extraction</span>
            <span className="topo-arrow" aria-hidden="true">→</span>
            <span className="is-local">ChromaDB + diary</span>
          </li>
        </ol>
      </div>
      <figcaption>
        The queue, the voice, the face, and the memory files stay on the machine. Hearing, the reply, memory extraction, and vision go out through APIs. Persona and model names live in config.yaml. Keys live in .env.
      </figcaption>
    </figure>
  );
}
