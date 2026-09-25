export const site = {
  name: "Yoru",
  studio: "Himemiya Yoru",
  /** Legal name, shown beside Yoru once you set it. */
  legalName: "Jiahao Li",
  role: "Creative technologist",
  line: "Yoru is devoted to weaving AI into daily life, and to making the world more luminous through it.",
  /** Public address. Leave empty until you want it on the page. */
  email: "",
  /** For example "/resume.pdf" after the file is in public/. */
  resumeHref: "",
  github: "https://github.com/Himemiyayoru",
  /**
   * Cubism model served from public/. Empty falls back to the drawn stand-in.
   * Driven parameters: ParamAngleX/Y/Z, ParamMouthOpenY, ParamEyeLOpen, ParamEyeROpen.
   */
  live2dModel: "/hime/live2d/tansuan/tansuan.model3.json",
};

export function creditName() {
  if (site.legalName) return `${site.legalName} · ${site.name}`;
  return site.name;
}
