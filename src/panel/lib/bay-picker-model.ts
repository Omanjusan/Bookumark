import type {
  BayPlacement,
  DockingDocuments,
  RailId,
} from "./docking-persistence-model.js";

export interface UnplacedBayPickerTag {
  readonly bayId: string;
  name: string;
  readonly permanent: boolean;
}

export interface PlacedBayPickerTag extends UnplacedBayPickerTag {
  readonly rail: RailId;
  readonly order: number;
}

export interface IgnoredBayPickerPlacement extends BayPlacement {
  readonly reason: "unknown-bay" | "duplicate-placement";
}

export interface BayPickerModel {
  readonly activeLayoutId: string;
  readonly unplaced: UnplacedBayPickerTag[];
  readonly placed: PlacedBayPickerTag[];
  readonly ignoredPlacements: IgnoredBayPickerPlacement[];
}

const RAIL_APPLICATION_ORDER: readonly RailId[] = ["top", "left", "right", "bottom"];

/** activeレイアウトのベイを未配置登録順と配置済み適用順のタグへ分類する。 */
export function buildBayPickerModel(documents: DockingDocuments): BayPickerModel {
  const activeLayoutId = documents.dockingMetadata.activeLayoutId;
  const active = documents.mainLayouts.layouts.find(({ id }) => id === activeLayoutId);
  if (active === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);

  const bayById = new Map(documents.bayConfigurations.bays.map((bay) => [bay.id, bay]));
  const placedBayIds = new Set<string>();
  const placed: PlacedBayPickerTag[] = [];
  const ignoredPlacements: IgnoredBayPickerPlacement[] = [];

  for (const rail of RAIL_APPLICATION_ORDER) {
    const placements = active.placements
      .filter((placement) => placement.rail === rail)
      .sort((left, right) => left.order - right.order);
    for (const placement of placements) {
      const bay = bayById.get(placement.bayId);
      if (bay === undefined) {
        ignoredPlacements.push({ ...placement, reason: "unknown-bay" });
        continue;
      }
      if (placedBayIds.has(bay.id)) {
        ignoredPlacements.push({ ...placement, reason: "duplicate-placement" });
        continue;
      }
      placedBayIds.add(bay.id);
      placed.push({
        bayId: bay.id,
        name: bay.name,
        permanent: bay.permanent,
        rail: placement.rail,
        order: placement.order,
      });
    }
  }

  const unplaced = documents.bayConfigurations.bays
    .filter((bay) => !placedBayIds.has(bay.id))
    .map((bay): UnplacedBayPickerTag => ({
      bayId: bay.id,
      name: bay.name,
      permanent: bay.permanent,
    }));
  return { activeLayoutId, unplaced, placed, ignoredPlacements };
}
