import type { PanelTileModel } from "./panel-tile-model.js";
import { buildPanelDrawingPlan } from "./panel-drawing-plan.js";

type PanelDrawingPlanInput = Parameters<typeof buildPanelDrawingPlan>[0];

interface PanelDrawingView {
  showLoading(): void;
  showEmpty(): void;
  showGrid(tiles: readonly PanelTileModel[]): void;
}

/** 描画計画の状態を、対応する単一の画面表示へ反映する。 */
export function presentPanelDrawingPlan(
  input: PanelDrawingPlanInput,
  view: PanelDrawingView,
): void {
  const plan = buildPanelDrawingPlan(input);
  if (plan.status === "deferred") {
    view.showLoading();
  } else if (plan.tiles.length === 0) {
    view.showEmpty();
  } else {
    view.showGrid(plan.tiles);
  }
}
