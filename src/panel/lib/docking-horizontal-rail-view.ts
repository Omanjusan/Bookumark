import {
  renderDockingChips,
} from "./docking-chip-renderer-registry.js";
import type {
  BasicDockingChipType,
  DockingChipRendererRegistry,
  SkippedDockingChip,
} from "./docking-chip-renderer-registry.js";
import type { DockingRailPlan } from "./docking-rail-drawing-plan.js";

const CHIP_FUNCTION_LABELS: Readonly<Record<BasicDockingChipType, string>> = {
  search: "検索",
  "visit-status": "訪問状態",
  "folder-history": "フォルダ履歴",
  sort: "ソート",
  "view-type": "表示形式",
  "movement-mode": "移動モード",
};

interface HorizontalDockingRailRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

export interface HorizontalDockingRailRenderResult {
  readonly renderedBayIds: string[];
  readonly renderedInstanceIds: string[];
  readonly skippedChips: SkippedDockingChip[];
}

/** 現行の基本チップ種別に対応するアクセシブルな機能名を返す。 */
export function dockingChipFunctionLabel(chipType: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(CHIP_FUNCTION_LABELS, chipType)
    ? CHIP_FUNCTION_LABELS[chipType as BasicDockingChipType]
    : undefined;
}

/** 上または下レールの描画計画を横向きベイDOMへ順番どおり追加する。 */
export function renderHorizontalDockingRail(
  root: HTMLElement,
  railPlan: DockingRailPlan,
  registry: DockingChipRendererRegistry,
  options: HorizontalDockingRailRenderOptions = {},
): HorizontalDockingRailRenderResult {
  if (railPlan.orientation !== "horizontal") {
    throw new Error(`horizontal rail view cannot render: ${railPlan.rail}`);
  }
  const documentRef = options.document ?? document;
  const renderedBayIds: string[] = [];
  const renderedInstanceIds: string[] = [];
  const skippedChips: SkippedDockingChip[] = [];

  for (const bayPlan of railPlan.bays) {
    if (bayPlan.orientation !== "horizontal") {
      throw new Error(`horizontal rail view cannot render bay: ${bayPlan.bayId}`);
    }
    const bay = documentRef.createElement("section");
    bay.className = "dock-bay dock-bay--dynamic dock-bay--horizontal";
    bay.dataset.bayId = bayPlan.bayId;
    bay.dataset.orientation = "horizontal";
    bay.setAttribute("aria-label", `${bayPlan.name}ベイ`);

    for (const chipPlan of bayPlan.chips) {
      const chip = documentRef.createElement("div");
      chip.className = "dock-chip dock-chip--horizontal";
      chip.dataset.instanceId = chipPlan.instanceId;
      chip.dataset.chipType = chipPlan.chipType;
      const label = dockingChipFunctionLabel(chipPlan.chipType);
      if (label !== undefined) chip.setAttribute("aria-label", label);

      const result = renderDockingChips(chip, [chipPlan], registry);
      renderedInstanceIds.push(...result.renderedInstanceIds);
      skippedChips.push(...result.skippedChips);
      if (result.renderedInstanceIds.length > 0) bay.appendChild(chip);
    }

    root.appendChild(bay);
    renderedBayIds.push(bayPlan.bayId);
  }
  return { renderedBayIds, renderedInstanceIds, skippedChips };
}
