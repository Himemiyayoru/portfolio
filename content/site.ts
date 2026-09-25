export const site = {
  name: "Yoru",
  studio: "Himemiya Yoru",
  /** Legal name, shown beside Yoru once you set it. */
  legalName: "",
  role: "Creative technologist",
  line: "Yoru builds interactive systems where code, image, and sound share one point of view.",
  /** Public address. Leave empty until you want it on the page. */
  email: "",
  /** For example "/resume.pdf" after the file is in public/. */
  resumeHref: "",
  github: "https://github.com/Himemiyayoru",
  /**
   * Cubism model served from public/. Empty falls back to the drawn stand-in.
   * Driven parameters: ParamAngleX/Y/Z, ParamMouthOpenY, ParamEyeLOpen, ParamEyeROpen.
   */
  live2dModel: "",
};

export function creditName() {
  if (site.legalName) return `${site.legalName} · ${site.name}`;
  return site.name;
}
