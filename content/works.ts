import type { LineId } from "@/content/lines";

export type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Work = {
  slug: LineId;
  title: string;
  status: "Shipped" | "In the lab";
  year: string;
  role: string;
  lede: string;
  plate: string;
  tone: "crimson" | "amber" | "night";
  frame: "wide" | "phone";
  images: GalleryImage[];
  cover?: GalleryImage;
  video?: {
    src: string;
    width: number;
    height: number;
    label: string;
  };
  score?: {
    title: string;
    src: string;
    links: { label: string; href: string }[];
  };
};

export const works: Work[] = [
  {
    slug: "crimson-moon",
    title: "Crimson Moon",
    status: "Shipped",
    year: "2026",
    role: "Game, art, sound",
    lede: "A tarot werewolf for a player who would rather not face a crowd. AI maidens hold the other seats. Each match deals a new table and a new set of powers. Upright cards keep the village. Reversed cards are the witches.",
    plate: "Werewolf, with tarot, for a player who does not want a crowd.",
    tone: "crimson",
    frame: "wide",
    images: [],
    cover: {
      src: "/work/crimson-moon/menu.jpg",
      alt: "Crimson Moon title screen, a red moon over a city of spires.",
      width: 1400,
      height: 1151,
    },
    video: {
      src: "/work/crimson-moon/showcase.mp4",
      width: 1600,
      height: 900,
      label: "Silent showcase of Crimson Moon.",
    },
    score: {
      title: "Judgment Dusk",
      src: "/work/crimson-moon/judgment-dusk.mp3",
      links: [],
    },
  },
  {
    slug: "bobs-special-blend",
    title: "Bob's Special Blend",
    status: "Shipped",
    year: "2026",
    role: "Product, mobile, local models",
    lede: "A phone for mixing drinks that shows the glass change when the recipe does.",
    plate: "A phone that turns a recipe change into a glass you can see.",
    tone: "amber",
    frame: "phone",
    images: [],
    cover: {
      src: "/work/bobs-special-blend/library.jpg",
      alt: "The cocktail library, with drinks grouped by family.",
      width: 900,
      height: 1950,
    },
  },
  {
    slug: "hime",
    title: "Hime",
    status: "In the lab",
    year: "2026",
    role: "Character systems",
    lede: "A desktop companion written as a younger sister. A trained voice, a dated memory, and a face wired to every expression the model publishes.",
    plate: "A trained voice, a dated memory, and the model's own expressions.",
    tone: "night",
    frame: "wide",
    images: [],
  },
];

export function getWork(slug: string) {
  return works.find((work) => work.slug === slug);
}
