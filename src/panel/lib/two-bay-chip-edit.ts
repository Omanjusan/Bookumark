import { cloneTwoBayConfiguration } from "./two-bay-persistence-model.js";
import type {
  TwoBayChipInstance,
  TwoBayConfiguration,
  TwoBayId,
} from "./two-bay-persistence-model.js";

export interface TwoBayChipMoveTarget {
  readonly bay: TwoBayId;
  readonly row: number;
  readonly index: number;
}

/** instanceを可視行の指定位置へ移動し、関係する行のorderを正規化する。 */
export function moveTwoBayChip(
  configuration: TwoBayConfiguration,
  instanceId: string,
  target: TwoBayChipMoveTarget,
): TwoBayConfiguration {
  const candidate = cloneTwoBayConfiguration(configuration);
  if (!Number.isInteger(target.row) || target.row < 1
    || target.row > candidate.bays[target.bay].visibleRows) {
    throw new RangeError("chip must be moved to a visible row");
  }
  const source = findChip(candidate, instanceId);
  const sourceChips = candidate.bays[source.bay].chips;
  sourceChips.splice(source.index, 1);
  normalizeRowOrder(sourceChips, source.chip.row);

  const targetChips = candidate.bays[target.bay].chips;
  const orderedTargetRow = targetChips
    .filter((chip) => chip.row === target.row)
    .sort((left, right) => left.order - right.order);
  const insertionIndex = Math.max(0, Math.min(target.index, orderedTargetRow.length));
  source.chip.row = target.row;
  orderedTargetRow.splice(insertionIndex, 0, source.chip);
  targetChips.push(source.chip);
  orderedTargetRow.forEach((chip, index) => { chip.order = index + 1; });
  return candidate;
}

/** 指定instanceだけを除去し、元の行のorderを正規化する。 */
export function removeTwoBayChip(
  configuration: TwoBayConfiguration,
  instanceId: string,
): TwoBayConfiguration {
  const candidate = cloneTwoBayConfiguration(configuration);
  const source = findChip(candidate, instanceId);
  const chips = candidate.bays[source.bay].chips;
  chips.splice(source.index, 1);
  normalizeRowOrder(chips, source.chip.row);
  return candidate;
}

/** instance IDに一致するチップと所属位置を取得する。 */
function findChip(configuration: TwoBayConfiguration, instanceId: string): {
  bay: TwoBayId;
  index: number;
  chip: TwoBayChipInstance;
} {
  for (const bay of ["top", "bottom"] as const) {
    const index = configuration.bays[bay].chips.findIndex((chip) => chip.instanceId === instanceId);
    if (index >= 0) return { bay, index, chip: configuration.bays[bay].chips[index] };
  }
  throw new Error("chip instance was not found");
}

/** 指定行だけを現在order順に1から再採番する。 */
function normalizeRowOrder(chips: TwoBayChipInstance[], row: number): void {
  chips.filter((chip) => chip.row === row)
    .sort((left, right) => left.order - right.order)
    .forEach((chip, index) => { chip.order = index + 1; });
}

