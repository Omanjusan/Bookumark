import {
  cloneTwoBayConfiguration,
  MAX_BAY_ROWS,
} from "./two-bay-persistence-model.js";
import type {
  TwoBayConfiguration,
  TwoBayId,
} from "./two-bay-persistence-model.js";

/** 指定ベイの表示行数だけを1段階変更し、チップ情報を保持したdraft候補を返す。 */
export function changeTwoBayVisibleRows(
  configuration: TwoBayConfiguration,
  bay: TwoBayId,
  delta: -1 | 1,
): TwoBayConfiguration {
  const candidate = cloneTwoBayConfiguration(configuration);
  const current = candidate.bays[bay].visibleRows;
  const next = current + delta;
  if (next < 0 || next > MAX_BAY_ROWS) throw new RangeError("two-bay row limit exceeded");
  if (bay === candidate.systemBay && next < 1) {
    throw new RangeError("system bay must keep one row");
  }
  candidate.bays[bay].visibleRows = next;
  return candidate;
}

