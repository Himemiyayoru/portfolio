const stages = [
  {
    index: "01",
    title: "Rules",
    text: "A language model placed trades. The missing forecast was filled with randomness. The result could not be repeated.",
  },
  {
    index: "02",
    title: "Reinforcement learning",
    text: "The decision became a trainable environment. The agent could satisfy the reward and still not learn a price.",
  },
  {
    index: "03",
    title: "Time-series models",
    text: "Prediction was split from execution. After costs, there was no signal for an execution policy to amplify.",
  },
  {
    index: "04",
    title: "A fleet",
    text: "Memory, a message bus, and a simulator with fees, impact, and delay. Training and the live path were still not the same decision.",
  },
];

export function Spine({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={compact ? "spine spine-compact" : "spine"}>
      {stages.map((stage) => (
        <li key={stage.index}>
          <span>{stage.index}</span>
          <strong>{stage.title}</strong>
          {compact ? null : <p>{stage.text}</p>}
        </li>
      ))}
    </ol>
  );
}
