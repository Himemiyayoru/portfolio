export type Emotion = "neutral" | "happy" | "angry" | "sad" | "shock";

export type LineId =
  | "arrival"
  | "crimson-moon"
  | "crimson-moon-card"
  | "bobs-special-blend"
  | "bobs-special-blend-card"
  | "hime"
  | "hime-card"
  | "poke-tickle"
  | "poke-beauty"
  | "poke-affection"
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
    text: "I am the site guide. Move your mouse onto any work, and I will introduce it.",
    emotion: "neutral",
    audio: "/hime/lines/arrival.mp3",
  },
  "crimson-moon-card": {
    id: "crimson-moon-card",
    text: "A table that requires no catering to crowds. Within this safe space, every drawn card and cast vote is silently driven by a rigorous logic engine.",
    emotion: "neutral",
    audio: "",
  },
  "crimson-moon": {
    id: "crimson-moon",
    text: "Welcome to Crimson Moon. This is a deduction tea party built to completely insulate you from social pressure. A rigorous state machine and trust matrix form the core rules here, allowing the upright and reversed Tarot to dictate the tide. The AI opponents at this table are by no means governed by random text; their every disguise and elimination stems from precise strategic calculations, with the large language model acting purely as a flavor engine to breathe life into their personalities. Please, take a seat, and immerse yourself in this pure psychological game.",
    emotion: "neutral",
    audio: "",
  },
  "bobs-special-blend-card": {
    id: "bobs-special-blend-card",
    text: "Reducing cocktail recipes to fluid mathematics. Every micro-adjustment you make is precisely redrawn on the screen.",
    emotion: "neutral",
    audio: "",
  },
  "bobs-special-blend": {
    id: "bobs-special-blend",
    text: "Within this application, physics rendering and mobile computing power achieve an elegant balance. Backed by a chemical data pipeline heuristically seeded by an LLM, every adjustment to the recipe or swap of a bottle allows you to witness how cold algorithms instantly transform into authentic colors and liquid densities in the glass. Without the wait of network latency, everything is resolved right in the palm of your hand.",
    emotion: "neutral",
    audio: "",
  },
  "hime-card": {
    id: "hime-card",
    text: "I am the guide of this space, and the tangible proof of breathing life into code.",
    emotion: "neutral",
    audio: "",
  },
  hime: {
    id: "hime",
    text: "A pleasure to meet you. I am Hime. From on-screen frame capture to zero-latency memory retrieval and lip-syncing, every one of my interactions runs atop a rigorous multimodal architecture. But this is more than just a set of precise programs; it is an attempt to create a tangible medium that bridges the gap between computational power and human emotion.",
    emotion: "neutral",
    audio: "",
  },
  "poke-tickle": {
    id: "poke-tickle",
    text: "That tickles! Stop playing with me!",
    emotion: "shock",
    audio: "/hime/lines/poke-tickle.mp3",
  },
  "poke-beauty": {
    id: "poke-beauty",
    text: "Will you admit that my beauty is the finest in the world?",
    emotion: "happy",
    audio: "/hime/lines/poke-beauty.mp3",
  },
  "poke-affection": {
    id: "poke-affection",
    text: "Even if you keep poking me, my affection will not go up!",
    emotion: "angry",
    audio: "/hime/lines/poke-affection.mp3",
  },
  "forty-eight": {
    id: "forty-eight",
    text: "Forty-eight versions. No stable edge. The useful part is what got rewritten when the story was false.",
    emotion: "sad",
    audio: "",
  },
  about: {
    id: "about",
    text: "Behind this portfolio is a creator seeking to bridge human emotional voids through code. Please, turn the pages with me, and witness how rigorous algorithms and cold models cross the chasm between engineering and design, ultimately transforming into a digital art form filled with empathy.",
    emotion: "neutral",
    audio: "",
  },
};

export function isLineId(value: string): value is LineId {
  return value in lines;
}
