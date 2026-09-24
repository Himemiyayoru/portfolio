export type Emotion = "neutral" | "happy" | "angry" | "sad" | "shock";

export type LineId =
  | "arrival"
  | "crimson-moon"
  | "crimson-moon-card"
  | "bobs-special-blend"
  | "hime"
  | "forty-eight"
  | "about";

export type Line = {
  id: LineId;
  text: string;
  emotion: Emotion;
  /**
   * English take from GPT-SoVITS, for example "/hime/lines/arrival.mp3".
   * Empty until the file exists. Hover still shows the caption.
   */
  audio: string;
};

export const lines: Record<LineId, Line> = {
  arrival: {
    id: "arrival",
    text: "I'm Hime. The work is on the table. Move closer if you want the short version.",
    emotion: "neutral",
    audio: "",
  },
  "crimson-moon-card": {
    id: "crimson-moon-card",
    text: "This is an AI werewolf game. I really love playing it.",
    emotion: "happy",
    audio: "",
  },
  "crimson-moon": {
    id: "crimson-moon",
    text: "This werewolf game blends in tarot. The design is beautiful, and the effects look great. The matches are tense and exciting, but the AI makes it especially friendly for socially anxious players.",
    emotion: "happy",
    audio: "",
  },
  "bobs-special-blend": {
    id: "bobs-special-blend",
    text: "Bob's Special Blend. Taste, written as physics. The bartender is the interface.",
    emotion: "happy",
    audio: "",
  },
  hime: {
    id: "hime",
    text: "This one is me, still in the lab. Vision is the part being tuned.",
    emotion: "neutral",
    audio: "",
  },
  "forty-eight": {
    id: "forty-eight",
    text: "Forty-eight versions. No stable edge. The useful part is what got rewritten when the story was false.",
    emotion: "sad",
    audio: "",
  },
  about: {
    id: "about",
    text: "RPI, then art, then Carnegie Mellon. Same person. Different materials.",
    emotion: "happy",
    audio: "",
  },
};

export function isLineId(value: string): value is LineId {
  return value in lines;
}
