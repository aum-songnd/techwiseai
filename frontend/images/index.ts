import type { StaticImageData } from "next/image";

import banner_1 from "./banner/banner_1.webp";
import m1 from "./products/m1.png";

export { banner_1, m1 };

export const productImages: Record<string, StaticImageData> = {
  "m1.png": m1,
};