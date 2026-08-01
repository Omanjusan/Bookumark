import type { DockingChipDrawingPlan } from "./docking-rail-drawing-plan.js";
import { CURRENT_DOCKING_CHIP_TYPES } from "./docking-chip-catalog.js";

export const BASIC_DOCKING_CHIP_TYPES = CURRENT_DOCKING_CHIP_TYPES;

export type BasicDockingChipType = typeof BASIC_DOCKING_CHIP_TYPES[number];
export type DockingChipRenderer = (chip: DockingChipDrawingPlan) => Node;
export type BasicDockingChipRenderers = Readonly<Record<
  BasicDockingChipType,
  DockingChipRenderer
>>;

export interface DockingChipRendererRegistry {
  has(chipType: string): boolean;
  get(chipType: string): DockingChipRenderer | undefined;
}

export interface SkippedDockingChip {
  readonly instanceId: string;
  readonly chipType: string;
  readonly reason: "unknown-chip-type" | "render-error";
}

export interface DockingChipRenderResult {
  readonly renderedInstanceIds: string[];
  readonly skippedChips: SkippedDockingChip[];
}

/** 基本6チップの描画関数を未知種へ安全に応答するレジストリへ変換する。 */
export function createDockingChipRendererRegistry(
  renderers: BasicDockingChipRenderers,
  additionalRenderers: Readonly<Record<string, DockingChipRenderer>> = {},
): DockingChipRendererRegistry {
  const entries = new Map<string, DockingChipRenderer>(
    BASIC_DOCKING_CHIP_TYPES.map((chipType) => [chipType, renderers[chipType]]),
  );
  for (const [chipType, renderer] of Object.entries(additionalRenderers)) {
    if (!entries.has(chipType)) entries.set(chipType, renderer);
  }
  return {
    has: (chipType): boolean => entries.has(chipType),
    get: (chipType): DockingChipRenderer | undefined => entries.get(chipType),
  };
}

/** チップを順に描画し、未知種または個別の描画失敗だけをスキップする。 */
export function renderDockingChips(
  root: Pick<Node, "appendChild">,
  chips: readonly DockingChipDrawingPlan[],
  registry: DockingChipRendererRegistry,
): DockingChipRenderResult {
  const renderedInstanceIds: string[] = [];
  const skippedChips: SkippedDockingChip[] = [];
  for (const chip of chips) {
    const renderer = registry.get(chip.chipType);
    if (renderer === undefined) {
      skippedChips.push({
        instanceId: chip.instanceId,
        chipType: chip.chipType,
        reason: "unknown-chip-type",
      });
      continue;
    }
    try {
      root.appendChild(renderer(structuredClone(chip)));
      renderedInstanceIds.push(chip.instanceId);
    } catch {
      skippedChips.push({
        instanceId: chip.instanceId,
        chipType: chip.chipType,
        reason: "render-error",
      });
    }
  }
  return { renderedInstanceIds, skippedChips };
}
