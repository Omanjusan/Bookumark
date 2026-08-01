import { cloneTwoBayConfiguration } from "./two-bay-persistence-model.js";
import type { TwoBayConfiguration, TwoBayId } from "./two-bay-persistence-model.js";

export interface TwoBayToolDrop {
  readonly bay: TwoBayId;
  readonly row: number;
  readonly chipType: string;
}

/** 可視行の末尾へ新しい独立チップinstanceを追加したdraft候補を返す。 */
export function addTwoBayChip(
  configuration: TwoBayConfiguration,
  drop: TwoBayToolDrop,
): TwoBayConfiguration {
  const candidate = cloneTwoBayConfiguration(configuration);
  const bay = candidate.bays[drop.bay];
  if (!Number.isInteger(drop.row) || drop.row < 1 || drop.row > bay.visibleRows) {
    throw new RangeError("chip must be added to a visible row");
  }
  const order = bay.chips
    .filter((chip) => chip.row === drop.row)
    .reduce((greatest, chip) => Math.max(greatest, chip.order), 0) + 1;
  bay.chips.push({
    instanceId: `chip-${candidate.nextChipSequence}`,
    chipType: drop.chipType,
    row: drop.row,
    order,
    settings: {},
  });
  candidate.nextChipSequence += 1;
  return candidate;
}

