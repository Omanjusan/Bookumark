import {
  renderDockingChips,
} from "./docking-chip-renderer-registry.js";
import type {
  DockingChipRendererRegistry,
  SkippedDockingChip,
} from "./docking-chip-renderer-registry.js";
import { dockingChipFunctionLabel } from "./docking-horizontal-rail-view.js";
import type { TwoBayDrawingPlanEntry } from "./two-bay-drawing-plan.js";
import { MAX_BAY_ROWS } from "./two-bay-persistence-model.js";

interface TwoBayEditRenderOptions {
  readonly visibleRows: number;
  readonly isSystem: boolean;
  readonly onRowsChange: (delta: -1 | 1) => void;
}

interface TwoBayRenderOptions {
  readonly document?: Pick<Document, "createElement">;
  readonly edit?: TwoBayEditRenderOptions;
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
  root.hidden = plan.rows.length === 0 && options.edit === undefined;
  let rowRoot: HTMLElement = root;

  if (options.edit !== undefined) {
    const editor = documentRef.createElement("section");
    editor.className = "two-bay-edit-bay";
    const controls = createEditControls(plan, options.edit, documentRef);
    rowRoot = documentRef.createElement("div");
    rowRoot.className = "two-bay-edit-rows";
    editor.appendChild(controls);
    editor.appendChild(rowRoot);
    root.appendChild(editor);
  }

  for (const rowPlan of plan.rows) {
    const row = documentRef.createElement("section");
    row.className = "two-bay-row";
    row.dataset.bay = plan.bay;
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
    rowRoot.appendChild(row);
  }
  if (plan.rows.length === 0 && options.edit !== undefined) {
    rowRoot.appendChild(createHiddenPlaceholder(plan, documentRef));
  }
  return { renderedInstanceIds, skippedChips };
}

/** 編集中だけ表示するベイ単位の行数操作ボタンを生成する。 */
function createEditControls(
  plan: TwoBayDrawingPlanEntry,
  edit: TwoBayEditRenderOptions,
  documentRef: Pick<Document, "createElement">,
): HTMLElement {
  const controls = documentRef.createElement("div");
  controls.className = "two-bay-edit-controls";
  const bayLabel = plan.bay === "top" ? "上" : "下";
  const increment = documentRef.createElement("button");
  increment.type = "button";
  increment.textContent = "＋";
  increment.setAttribute("aria-label", `${bayLabel}ベイの行を追加`);
  increment.disabled = edit.visibleRows >= MAX_BAY_ROWS;
  increment.addEventListener("click", () => edit.onRowsChange(1));
  const decrement = documentRef.createElement("button");
  decrement.type = "button";
  decrement.textContent = "－";
  decrement.setAttribute("aria-label", `${bayLabel}ベイの行を削減`);
  decrement.disabled = edit.visibleRows === 0 || (edit.isSystem && edit.visibleRows === 1);
  decrement.addEventListener("click", () => edit.onRowsChange(-1));
  controls.appendChild(increment);
  controls.appendChild(decrement);
  return controls;
}

/** 0行の非systemベイを編集位置へ残す非ドロップ領域を生成する。 */
function createHiddenPlaceholder(
  plan: TwoBayDrawingPlanEntry,
  documentRef: Pick<Document, "createElement">,
): HTMLElement {
  const placeholder = documentRef.createElement("section");
  placeholder.className = "two-bay-row two-bay-hidden-placeholder";
  placeholder.dataset.dropDisabled = "true";
  placeholder.setAttribute("aria-label", `${plan.bay === "top" ? "上" : "下"}ベイは非表示設定中`);
  const overlay = documentRef.createElement("span");
  overlay.className = "two-bay-hidden-overlay";
  overlay.textContent = "非表示設定が有効です";
  placeholder.appendChild(overlay);
  return placeholder;
}
