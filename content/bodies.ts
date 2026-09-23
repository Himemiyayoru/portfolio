import type { ComponentType } from "react";

export const workBodies: Record<string, () => Promise<{ default: ComponentType }>> = {
  "crimson-moon": () => import("@/content/crimson-moon.mdx"),
  "bobs-special-blend": () => import("@/content/bobs-special-blend.mdx"),
  hime: () => import("@/content/hime.mdx"),
  "forty-eight": () => import("@/content/forty-eight.mdx"),
};
