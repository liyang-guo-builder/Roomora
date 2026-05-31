/* Roomora — static config ported from the prototype (styles, tones, copy). */

import type { StyleId } from "./types";

export interface StyleDef {
  id: StyleId;
  en: string;
  zh: string;
}

export const STYLES: StyleDef[] = [
  { id: "scandi", en: "Scandinavian", zh: "北欧风" },
  { id: "japandi", en: "Japandi", zh: "日式简约" },
  { id: "cream", en: "Cream", zh: "奶油风" },
  { id: "midcentury", en: "Mid-Century", zh: "中古风" },
  { id: "wabisabi", en: "Wabi-Sabi", zh: "侘寂风" },
  { id: "wood", en: "Natural Wood", zh: "原木风" },
  { id: "modern", en: "Modern", zh: "现代简约" },
  { id: "newchinese", en: "New Chinese", zh: "新中式" },
  { id: "boho", en: "Bohemian", zh: "波西米亚" },
  { id: "industrial", en: "Industrial", zh: "工业风" },
];

export const STYLE_TONES: Record<StyleId, string> = {
  scandi: "linear-gradient(160deg,#eae6db,#d6cfbe)",
  japandi: "linear-gradient(160deg,#ddd6c4,#b9b39c)",
  midcentury: "linear-gradient(160deg,#d8b48a,#b07c4e)",
  cream: "linear-gradient(160deg,#f2ead6,#e4d3b3)",
  wabisabi: "linear-gradient(160deg,#cfc7b4,#a89d83)",
  modern: "linear-gradient(160deg,#d7d6cf,#a9aaa1)",
  industrial: "linear-gradient(160deg,#b9b3aa,#7d7870)",
  boho: "linear-gradient(160deg,#dcae8a,#b5795a)",
  wood: "linear-gradient(160deg,#d6b486,#a9784a)",
  newchinese: "linear-gradient(160deg,#cdbfa3,#8a6f4c)",
};

/** [en, zh] style display names keyed by id. */
export const STYLE_NAMES: Record<StyleId, [string, string]> = STYLES.reduce(
  (acc, s) => {
    acc[s.id] = [s.en, s.zh];
    return acc;
  },
  {} as Record<StyleId, [string, string]>,
);

/** Rotating reassurance copy on the Generating screen. */
export const GEN_MSGS: [string, string][] = [
  ["Keeping your windows where they are…", "正在保留窗户的位置…"],
  ["Choosing pieces that fit your space…", "正在挑选适合空间的家具…"],
  ["Matching the light in your room…", "正在匹配房间的光线…"],
  ["Styling with calm, warm tones…", "正在以温暖宁静的色调布置…"],
];

/** Refine suggestion chips. */
export const REFINE_CHIPS: [string, string][] = [
  ["warmer lighting", "更暖的灯光"],
  ["darker sofa", "深色沙发"],
  ["add plants", "增添绿植"],
  ["more minimal", "更简约"],
  ["keep everything else", "其余保持不变"],
];
