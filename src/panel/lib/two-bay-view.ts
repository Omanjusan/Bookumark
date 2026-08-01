import {
  renderDockingChips,
} from "./docking-chip-renderer-registry.js";
import type {
  DockingChipRendererRegistry,
  SkippedDockingChip,
} from "./docking-chip-renderer-registry.js";
import { dockingChipFunctionLabel } from "./docking-horizontal-rail-view.js";
import type { TwoBayDrawingPlanEntry } from "./two-bay-drawing-plan.js";

interface TwoBayRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

export interface TwoBayRenderResult {
  readonly renderedInstanceIds: string[];
  readonly skippedChips: SkippedDockingChip[];
}

/** 上または下ベイの表示行を独立した横スクロールDOMとして置換描画する。 */
export function renderTwoBay(
  root: HTMLElement,
  plan: TwoBayDrawingPlanEntry,
  registry: DockingChipRendererRegistry,
  options: TwoBayRenderOptions = {},
): TwoBayRenderResult {
  const documentRef = options.document ?? document;
  const renderedInstanceIds: string[] = [];
  const skippedChips: SkippedDockingChip[] = [];
  root.replaceChildren();
  root.hidden = plan.rows.length === 0;

  for (const rowPlan of plan.rows) {
    const row = documentRef.createElement("section");
    row.className = "two-bay-row";
    row.dataset.row = String(rowPlan.row);
    row.setAttribute("aria-label", `${plan.bay === "top" ? "上" : "下"}ベイ${rowPlan.row}行目`);

    for (const chipPlan of rowPlan.chips) {
      const chip = documentRef.createElement("div");
      chip.className = "dock-chip dock-chip--horizontal";
      chip.dataset.instanceId = chipPlan.instanceId;
      chip.dataset.chipType = chipPlan.chipType;
      const label = dockingChipFunctionLabel(chipPlan.chipType);
      if (label !== undefined) chip.setAttribute("aria-label", label);
      const result = renderDockingChips(chip, [chipPlan], registry);
      renderedInstanceIds.push(...result.renderedInstanceIds);
      skippedChips.push(...result.skippedChips);
      if (result.renderedInstanceIds.length > 0) row.appendChild(chip);
    }
    root.appendChild(row);
  }
  return { renderedInstanceIds, skippedChips };
}
