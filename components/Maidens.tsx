const maidens = [
  "nina",
  "lilith",
  "linne",
  "cecilia",
  "euphemia",
  "vera",
  "gwen",
  "kara",
  "noa",
  "aino",
  "player",
  "ulr",
  "rin",
  "ciel",
  "mia",
  "freya",
];

export function Maidens() {
  return (
    <div className="maidens">
      {maidens.map((name) => (
        <img key={name} src={`/work/crimson-moon/maidens/${name}.png`} alt="" />
      ))}
    </div>
  );
}
