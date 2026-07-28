import type {
  DockingDocuments,
  JsonObject,
  RailId,
} from "./docking-persistence-model.js";

export interface DockingChipApplicationEntry {
  readonly instanceId: string;
  readonly chipType: string;
  settings: JsonObject;
  readonly rail: RailId;
  readonly bayId: string;
  readonly bayOrder: number;
  readonly chipOrder: number;
}

const RAIL_APPLICATION_ORDER: readonly RailId[] = ["top", "left", "right", "bottom"];

/** activeレイアウトの配置からruntimeが順番に消費するチップ列を構築する。 */
export function buildDockingChipApplicationOrder(
  documents: DockingDocuments,
): DockingChipApplicationEntry[] {
  const activeLayoutId = documents.dockingMetadata.activeLayoutId;
  const active = documents.mainLayouts.layouts.find(({ id }) => id === activeLayoutId);
  if (active === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);

  const bayById = new Map(documents.bayConfigurations.bays.map((bay) => [bay.id, bay]));

  return RAIL_APPLICATION_ORDER.flatMap((rail) => active.placements
    .filter((placement) => placement.rail === rail)
    .sort((left, right) => left.order - right.order)
    .flatMap((placement): DockingChipApplicationEntry[] => {
      const bay = bayById.get(placement.bayId);
      if (bay === undefined) return [];

      return [...bay.chips]
        .sort((left, right) => left.order - right.order)
        .map((chip) => ({
          instanceId: chip.instanceId,
          chipType: chip.chipType,
          settings: structuredClone(chip.settings),
          rail,
          bayId: bay.id,
          bayOrder: placement.order,
          chipOrder: chip.order,
        }));
    }));
}
