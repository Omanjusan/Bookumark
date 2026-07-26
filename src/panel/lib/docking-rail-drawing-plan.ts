import type {
  DockingDocuments,
  JsonObject,
  RailId,
} from "./docking-persistence-model.js";

export type BayOrientation = "horizontal" | "vertical";

export interface DockingChipDrawingPlan {
  readonly instanceId: string;
  readonly chipType: string;
  readonly order: number;
  settings: JsonObject;
}

export interface DockingBayDrawingPlan {
  readonly bayId: string;
  name: string;
  readonly permanent: boolean;
  readonly orientation: BayOrientation;
  readonly chips: DockingChipDrawingPlan[];
}

export interface DockingRailPlan {
  readonly rail: RailId;
  readonly orientation: BayOrientation;
  readonly bays: DockingBayDrawingPlan[];
}

export interface SkippedBayPlacement {
  readonly bayId: string;
  readonly rail: RailId;
  readonly order: number;
  readonly reason: "unknown-bay";
}

export interface DockingRailDrawingPlan {
  readonly activeLayoutId: string;
  readonly rails: DockingRailPlan[];
  readonly skippedPlacements: SkippedBayPlacement[];
}

const RAILS: ReadonlyArray<{
  readonly rail: RailId;
  readonly orientation: BayOrientation;
}> = [
  { rail: "top", orientation: "horizontal" },
  { rail: "left", orientation: "vertical" },
  { rail: "right", orientation: "vertical" },
  { rail: "bottom", orientation: "horizontal" },
];

/** activeレイアウトの配置を適用順どおりの4レール描画計画へ変換する。 */
export function buildDockingRailDrawingPlan(
  documents: DockingDocuments,
): DockingRailDrawingPlan {
  const activeLayoutId = documents.dockingMetadata.activeLayoutId;
  const active = documents.mainLayouts.layouts.find((layout) => layout.id === activeLayoutId);
  if (active === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);

  const bayById = new Map(documents.bayConfigurations.bays.map((bay) => [bay.id, bay]));
  const skippedPlacements: SkippedBayPlacement[] = [];
  const rails = RAILS.map(({ rail, orientation }) => {
    const bays = active.placements
      .filter((placement) => placement.rail === rail)
      .sort((left, right) => left.order - right.order)
      .flatMap((placement): DockingBayDrawingPlan[] => {
        const bay = bayById.get(placement.bayId);
        if (bay === undefined) {
          skippedPlacements.push({ ...placement, reason: "unknown-bay" });
          return [];
        }
        return [{
          bayId: bay.id,
          name: bay.name,
          permanent: bay.permanent,
          orientation,
          chips: [...bay.chips]
            .sort((left, right) => left.order - right.order)
            .map((chip) => structuredClone(chip)),
        }];
      });
    return { rail, orientation, bays };
  });
  return { activeLayoutId, rails, skippedPlacements };
}
