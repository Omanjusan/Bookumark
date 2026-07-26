import { buildBayPickerModel } from "./bay-picker-model.js";
import type { BayPickerModel } from "./bay-picker-model.js";
import type { DockingDocuments, RailId } from "./docking-persistence-model.js";

export interface RailCapacityMeasurement {
  readonly available: number;
  readonly existingExtents: readonly number[];
  readonly candidateExtent: number;
}

export type BayAutoPlacementMeasurements = Readonly<Record<RailId, RailCapacityMeasurement>>;

export type BayAutoPlacementResult =
  | { readonly status: "placed"; readonly bayId: string; readonly rail: RailId; readonly order: number }
  | { readonly status: "unplaced"; readonly bayId: string; readonly reason: "no-rail-fits" }
  | {
    readonly status: "unchanged";
    readonly bayId: string;
    readonly reason: "already-placed" | "unknown-bay";
  };

export interface BayPlacementDraft {
  documents(): DockingDocuments;
  picker(): BayPickerModel;
  autoPlace(bayId: string, measurements: BayAutoPlacementMeasurements): BayAutoPlacementResult;
  moveToRailEnd(bayId: string, rail: RailId): BayRailEndPlacementResult;
  moveToRailPosition(bayId: string, rail: RailId, index: number): BayRailPositionResult;
  discard(): void;
}

export type BayRailEndPlacementResult =
  | { readonly status: "moved"; readonly bayId: string; readonly rail: RailId; readonly order: number }
  | { readonly status: "unchanged"; readonly bayId: string; readonly reason: "unknown-bay" };

export type BayRailPositionResult =
  | { readonly status: "moved"; readonly bayId: string; readonly rail: RailId; readonly order: number }
  | {
    readonly status: "unchanged";
    readonly bayId: string;
    readonly reason: "unknown-bay" | "same-position";
  };

const AUTO_PLACEMENT_ORDER: readonly RailId[] = ["top", "bottom", "left", "right"];
const RAIL_ORDER: readonly RailId[] = ["top", "left", "right", "bottom"];
const MINIMUM_GAP = 2;

/** 保存済み文書から独立し、終了時に破棄できるactiveレイアウト配置ドラフトを生成する。 */
export function createBayPlacementDraft(savedDocuments: DockingDocuments): BayPlacementDraft {
  const saved = structuredClone(savedDocuments);
  let draft = structuredClone(savedDocuments);

  return {
    documents: () => structuredClone(draft),
    picker: () => buildBayPickerModel(draft),
    autoPlace(bayId, measurements) {
      validateMeasurements(measurements);
      const bay = draft.bayConfigurations.bays.find(({ id }) => id === bayId);
      if (bay === undefined) return { status: "unchanged", bayId, reason: "unknown-bay" };
      const active = resolveActiveLayout(draft);
      if (active.placements.some((placement) => placement.bayId === bayId)) {
        return { status: "unchanged", bayId, reason: "already-placed" };
      }

      const rail = AUTO_PLACEMENT_ORDER.find((candidate) => fits(measurements[candidate]));
      if (rail === undefined) return { status: "unplaced", bayId, reason: "no-rail-fits" };
      const orders = active.placements
        .filter((placement) => placement.rail === rail)
        .map(({ order }) => order);
      const order = Math.max(0, ...orders) + 1;
      active.placements.push({ bayId, rail, order });
      return { status: "placed", bayId, rail, order };
    },
    moveToRailEnd(bayId, rail) {
      const bay = draft.bayConfigurations.bays.find(({ id }) => id === bayId);
      if (bay === undefined) return { status: "unchanged", bayId, reason: "unknown-bay" };
      const active = resolveActiveLayout(draft);
      active.placements = active.placements.filter((placement) => placement.bayId !== bayId);
      const orders = active.placements
        .filter((placement) => placement.rail === rail)
        .map(({ order }) => order);
      const order = Math.max(0, ...orders) + 1;
      active.placements.push({ bayId, rail, order });
      return { status: "moved", bayId, rail, order };
    },
    moveToRailPosition(bayId, rail, index) {
      const bay = draft.bayConfigurations.bays.find(({ id }) => id === bayId);
      if (bay === undefined) return { status: "unchanged", bayId, reason: "unknown-bay" };
      const active = resolveActiveLayout(draft);
      const source = active.placements.find((placement) => placement.bayId === bayId);
      const targetBayIds = orderedRailBayIds(active.placements, rail)
        .filter((candidateBayId) => candidateBayId !== bayId);
      if (!Number.isInteger(index) || index < 0 || index > targetBayIds.length) {
        throw new Error("insertion index is out of range");
      }
      if (source?.rail === rail) {
        const sourceIndex = targetBayIds.filter((candidateBayId) => {
          const candidate = active.placements.find((placement) => placement.bayId === candidateBayId);
          return candidate !== undefined && candidate.order < source.order;
        }).length;
        if (sourceIndex === index) {
          return { status: "unchanged", bayId, reason: "same-position" };
        }
      }

      targetBayIds.splice(index, 0, bayId);
      const railBayIds = new Map<RailId, string[]>();
      for (const candidateRail of RAIL_ORDER) {
        railBayIds.set(
          candidateRail,
          candidateRail === rail
            ? targetBayIds
            : orderedRailBayIds(active.placements, candidateRail)
              .filter((candidateBayId) => candidateBayId !== bayId),
        );
      }
      // 移動元を除外した各レールを正規順へ戻し、対象位置へ1回だけ挿入する。
      active.placements = RAIL_ORDER.flatMap((candidateRail) => (
        railBayIds.get(candidateRail) ?? []
      ).map((candidateBayId, placementIndex) => ({
        bayId: candidateBayId,
        rail: candidateRail,
        order: placementIndex + 1,
      })));
      return { status: "moved", bayId, rail, order: index + 1 };
    },
    discard(): void {
      draft = structuredClone(saved);
    },
  };
}

/** レール内の配置をorder順へ並べ、ベイIDの配列として返す。 */
function orderedRailBayIds(
  placements: readonly { readonly bayId: string; readonly rail: RailId; readonly order: number }[],
  rail: RailId,
): string[] {
  return placements
    .filter((placement) => placement.rail === rail)
    .sort((left, right) => left.order - right.order)
    .map(({ bayId }) => bayId);
}

/** 2px間隔を含む全ベイ実寸が利用可能長以下か判定する。 */
function fits(measurement: RailCapacityMeasurement): boolean {
  const extents = [...measurement.existingExtents, measurement.candidateExtent];
  const gaps = Math.max(0, extents.length - 1) * MINIMUM_GAP;
  return extents.reduce((total, extent) => total + extent, gaps) <= measurement.available;
}

/** 4レールすべての実寸値を副作用前に検証する。 */
function validateMeasurements(
  measurements: BayAutoPlacementMeasurements,
): void {
  for (const rail of AUTO_PLACEMENT_ORDER) {
    const measurement = measurements[rail];
    if (measurement === undefined) throw new Error(`measurement is required: ${rail}`);
    validateExtent(measurement.available);
    validateExtent(measurement.candidateExtent);
    for (const extent of measurement.existingExtents) validateExtent(extent);
  }
}

/** レール計算に使う寸法が有限の非負値であることを保証する。 */
function validateExtent(extent: number): void {
  if (!Number.isFinite(extent) || extent < 0) {
    throw new Error("extent must be a finite non-negative number");
  }
}

/** ドラフト文書からactiveレイアウトを解決する。 */
function resolveActiveLayout(documents: DockingDocuments) {
  const activeId = documents.dockingMetadata.activeLayoutId;
  const active = documents.mainLayouts.layouts.find(({ id }) => id === activeId);
  if (active === undefined) throw new Error(`active layout was not found: ${activeId}`);
  return active;
}
