import type { BookmarkItem } from "./bookmarks.js";

export type PanelSize = "4" | "2" | "1" | "1/2" | "1/4" | "1/8" | "1/16";

export interface PercentileBand {
  readonly from: number;
  readonly size: PanelSize;
}

export const DEFAULT_PERCENTILE_BANDS: readonly PercentileBand[] = [
  { from: 0, size: "4" },
  { from: 0.05, size: "2" },
  { from: 0.15, size: "1" },
  { from: 0.3, size: "1/2" },
  { from: 0.5, size: "1/4" },
  { from: 0.7, size: "1/8" },
  { from: 0.85, size: "1/16" },
];

/** 0始まり順位を表示集合内のパーセンタイルへ変換する。 */
export function percentileOf(index: number, count: number): number | null {
  if (!Number.isInteger(count) || count < 0) throw new RangeError("count must be a non-negative integer");
  if (count === 0) {
    if (index !== 0) throw new RangeError("index must be 0 when count is 0");
    return null;
  }
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError("index must identify an item in the display set");
  }
  return index / count;
}

/** パーセンタイルに対応する希望サイズを返す。 */
export function desiredSizeAt(
  percentile: number,
  bands: readonly PercentileBand[] = DEFAULT_PERCENTILE_BANDS,
): PanelSize {
  validateBands(bands);
  if (!Number.isFinite(percentile) || percentile < 0 || percentile >= 1) {
    throw new RangeError("percentile must be at least 0 and less than 1");
  }

  for (let index = bands.length - 1; index >= 0; index -= 1) {
    const band = bands[index];
    if (percentile >= band.from) return band.size;
  }
  throw new RangeError("percentile bands do not cover the supplied value");
}

/** ソート済み表示集合へ、入力順を維持して希望サイズを割り当てる。 */
export function assignDesiredSizes(
  items: readonly BookmarkItem[],
  axis: { readonly scalable: boolean },
  bands: readonly PercentileBand[] = DEFAULT_PERCENTILE_BANDS,
): Array<{ guid: string; size: PanelSize }> {
  if (!axis.scalable) return items.map(({ guid }) => ({ guid, size: "1" }));
  validateBands(bands);

  return items.map(({ guid }, index) => ({
    guid,
    size: desiredSizeAt(index / items.length, bands),
  }));
}

function validateBands(bands: readonly PercentileBand[]): void {
  if (bands.length === 0 || bands[0].from !== 0) {
    throw new RangeError("percentile bands must start at 0");
  }
  for (let index = 0; index < bands.length; index += 1) {
    const from = bands[index].from;
    if (!Number.isFinite(from) || from < 0 || from >= 1) {
      throw new RangeError("percentile band boundaries must be at least 0 and less than 1");
    }
    if (index > 0 && from <= bands[index - 1].from) {
      throw new RangeError("percentile band boundaries must be strictly increasing");
    }
  }
}
