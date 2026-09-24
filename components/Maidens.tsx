const maidens = [
  ["nina", "Nina"],
  ["lilith", "Lilith"],
  ["linne", "Linne"],
  ["cecilia", "Cecilia"],
  ["euphemia", "Euphemia"],
  ["vera", "Vera"],
  ["gwen", "Gwen"],
  ["kara", "Kara"],
  ["noa", "Noa"],
  ["aino", "Aino"],
  ["player", "Traveler"],
  ["ulr", "Ulr"],
  ["rin", "Rin"],
  ["ciel", "Ciel"],
  ["mia", "Mia"],
  ["freya", "Freya"],
] as const;

export function Maidens() {
  return (
    <div className="maidens">
      {maidens.map(([file, name]) => (
        <figure key={file}>
          <img src={`/work/crimson-moon/maidens/${file}.png`} alt={name} draggable={false} />
          <figcaption>{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}
