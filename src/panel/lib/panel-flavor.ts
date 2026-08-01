export const PANEL_FLAVOR_IDS = [
  "coral",
  "amber",
  "lemon",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;

export type PanelFlavorId = typeof PANEL_FLAVOR_IDS[number];

/** 注入可能な乱数源から、ページ表示中に共有する符号なしseedを生成する。 */
export function createPanelFlavorSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 0x100000000) >>> 0;
}

/** セッションseedとブックマークGUIDから、表示順に依存しないフレーバーを選ぶ。 */
export function panelFlavorForGuid(guid: string, seed: number): PanelFlavorId {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (let index = 0; index < guid.length; index += 1) {
    hash ^= guid.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return PANEL_FLAVOR_IDS[hash % PANEL_FLAVOR_IDS.length];
}
