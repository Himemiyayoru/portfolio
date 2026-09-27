export function HimeDiagram() {
  return (
    <figure className="diagram">
      <div
        className="arch"
        aria-label="Hybrid architecture. Microphone audio goes to Groq Whisper, the keyboard goes straight in, and the screen goes to OpenRouter vision. All three meet a priority queue on this machine. The queue calls Groq for a streaming reply, spoken by local GPT-SoVITS and shown on the local VTube Studio face, and calls Groq again to store a memory in local ChromaDB and the diary."
      >
        <div className="arch-head">
          <span>Topology</span>
          <span className="arch-legend">
            <i className="swatch local" />
            On this machine
            <i className="swatch remote" />
            External API
          </span>
        </div>
        <div className="arch-map">
          <span className="arch-node origin local" style={{ gridArea: "mic" }}>
            <em>Input</em>
            Microphone
          </span>
          <span className="arch-node remote feeds" style={{ gridArea: "whisper" }}>
            <em>Speech</em>
            Groq Whisper
          </span>
          <span className="arch-node origin local direct" style={{ gridArea: "key" }}>
            <span>
              <em>Input</em>
              Keyboard
            </span>
            <i className="arch-track" aria-hidden="true">
              <b>direct</b>
            </i>
          </span>
          <span className="arch-node origin local" style={{ gridArea: "screen" }}>
            <em>Input</em>
            Screen
          </span>
          <span className="arch-node remote feeds" style={{ gridArea: "vision" }}>
            <em>Vision</em>
            OpenRouter
          </span>
          <span className="arch-node local hub" style={{ gridArea: "queue" }}>
            <em>Core loop</em>
            Priority queue
          </span>
          <span className="arch-node remote" style={{ gridArea: "reply" }}>
            <em>Brain</em>
            Groq streaming reply
          </span>
          <span className="arch-node local" style={{ gridArea: "voice" }}>
            <em>Embodiment</em>
            GPT-SoVITS
            <span className="arch-also">VTube Studio</span>
          </span>
          <span className="arch-node remote" style={{ gridArea: "mem" }}>
            <em>Memory</em>
            Groq extraction
          </span>
          <span className="arch-node local" style={{ gridArea: "store" }}>
            <em>On disk</em>
            ChromaDB + diary
          </span>
        </div>
        <p className="arch-config">config.yaml holds the persona, model names, and face. Keys stay in .env.</p>
      </div>
    </figure>
  );
}
