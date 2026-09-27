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
    role: "Game, client, art, sound",
    lede: "A werewolf game you can play alone. Eight AI maidens hold the other seats. You still speak, vote, and risk being wrong. Upright cards keep the village. Reversed cards are the witches.",
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
    role: "Product, phone, service",
    lede: "A phone app for mixing at home. Browse the catalog, mark what you own, search a half-remembered name, ask the bartender, or change a measure and watch the glass redraw.",
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
    role: "Desktop Companion & Character Systems",
    lede: "An Egalitarian AI Companion",
    plate: "The cutest AI high school girl of the 21st century.",
    tone: "night",
    frame: "wide",
    images: [],
  },
];

export function getWork(slug: string) {
  return works.find((work) => work.slug === slug);
}
