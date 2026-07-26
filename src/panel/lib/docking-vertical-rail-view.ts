import { renderDockingChips } from "./docking-chip-renderer-registry.js";
import type {
  DockingChipRendererRegistry,
  SkippedDockingChip,
} from "./docking-chip-renderer-registry.js";
import { dockingChipFunctionLabel } from "./docking-horizontal-rail-view.js";
import type { DockingRailPlan } from "./docking-rail-drawing-plan.js";

interface VerticalDockingRailRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

export interface VerticalDockingRailRenderResult {
  readonly renderedBayIds: string[];
  readonly renderedInstanceIds: string[];
  readonly skippedChips: SkippedDockingChip[];
}

/** 左または右レールへ横向きチップを左端からクリップした縦ベイを追加する。 */
export function renderVerticalDockingRail(
  root: HTMLElement,
  railPlan: DockingRailPlan,
  registry: DockingChipRendererRegistry,
  options: VerticalDockingRailRenderOptions = {},
): VerticalDockingRailRenderResult {
  if (
    railPlan.orientation !== "vertical"
    || (railPlan.rail !== "left" && railPlan.rail !== "right")
  ) {
    throw new Error(`vertical rail view cannot render: ${railPlan.rail}`);
  }
  const documentRef = options.document ?? document;
  const renderedBayIds: string[] = [];
  const renderedInstanceIds: string[] = [];
  const skippedChips: SkippedDockingChip[] = [];
  root.dataset.railSide = railPlan.rail;

  for (const bayPlan of railPlan.bays) {
    if (bayPlan.orientation !== "vertical") {
      throw new Error(`vertical rail view cannot render bay: ${bayPlan.bayId}`);
    }
    const bay = documentRef.createElement("section");
    bay.className = `dock-bay dock-bay--dynamic dock-bay--vertical dock-bay--${railPlan.rail}`;
    bay.dataset.bayId = bayPlan.bayId;
    bay.dataset.orientation = "vertical";
    bay.dataset.railSide = railPlan.rail;
    bay.setAttribute("aria-label", `${bayPlan.name}ベイ`);

    for (const chipPlan of bayPlan.chips) {
      const viewport = documentRef.createElement("div");
      viewport.className = "dock-chip dock-chip--vertical-viewport";
      viewport.dataset.instanceId = chipPlan.instanceId;
      viewport.dataset.chipType = chipPlan.chipType;
      const label = dockingChipFunctionLabel(chipPlan.chipType);
      if (label !== undefined) viewport.setAttribute("aria-label", label);

      // 本体は横向きのまま左端をviewportへ合わせ、超過した右側だけを隠す。
      const horizontalBody = documentRef.createElement("div");
      horizontalBody.className = "dock-chip__horizontal-body";
      const result = renderDockingChips(horizontalBody, [chipPlan], registry);
      renderedInstanceIds.push(...result.renderedInstanceIds);
      skippedChips.push(...result.skippedChips);
      if (result.renderedInstanceIds.length > 0) {
        viewport.appendChild(horizontalBody);
        bay.appendChild(viewport);
      }
    }

    root.appendChild(bay);
    renderedBayIds.push(bayPlan.bayId);
  }
  return { renderedBayIds, renderedInstanceIds, skippedChips };
}
