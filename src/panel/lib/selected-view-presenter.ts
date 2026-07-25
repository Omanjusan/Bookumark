import { buildCardViewModels } from "./card-view-model.js";
import type { CardViewModel } from "./card-view-model.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import { buildFixedDisplaySet } from "./fixed-display-controller.js";
import type { FixedDisplayState } from "./fixed-display-controller.js";
import { buildIconViewModels } from "./icon-view-model.js";
import type { IconViewModel } from "./icon-view-model.js";
import { buildListViewModels } from "./list-view-model.js";
import type { ListViewModel } from "./list-view-model.js";
import { buildPanelDrawingPlan } from "./panel-drawing-plan.js";
import type { PanelTileModel } from "./panel-tile-model.js";

interface SelectedViewInput {
  readonly items: readonly DisplayBookmarkItem[];
  readonly state: FixedDisplayState;
  readonly columns: number;
  readonly rows: number;
  readonly draggable: boolean;
}

interface SelectedViewOptions {
  readonly draggable: boolean;
}

interface SelectedViewOutput {
  showLoading(): void;
  showEmpty(): void;
  showPanel(models: readonly PanelTileModel[], options: SelectedViewOptions): void;
  showIcon(models: readonly IconViewModel[], options: SelectedViewOptions): void;
  showCard(models: readonly CardViewModel[], options: SelectedViewOptions): void;
  showList(models: readonly ListViewModel[], options: SelectedViewOptions): void;
}

/** 共有表示状態を評価し、選択中の1形式だけへ描画モデルを渡す。 */
export function presentSelectedView(
  input: SelectedViewInput,
  output: SelectedViewOutput,
): void {
  const options = { draggable: input.draggable };
  if (input.state.activeViewType === "panel") {
    const plan = buildPanelDrawingPlan({
      items: input.items,
      query: input.state.query,
      filters: input.state.filters,
      state: input.state.display,
      columns: input.columns,
      rows: input.rows,
    });
    if (plan.status === "deferred") output.showLoading();
    else if (plan.tiles.length === 0) output.showEmpty();
    else output.showPanel(plan.tiles, options);
    return;
  }

  const displaySet = buildFixedDisplaySet(input.items, input.state);
  if (displaySet.items.length === 0) {
    output.showEmpty();
    return;
  }
  switch (input.state.activeViewType) {
    case "icon":
      output.showIcon(buildIconViewModels(displaySet.items), options);
      return;
    case "card":
      output.showCard(buildCardViewModels(displaySet.items), options);
      return;
    case "list":
      output.showList(buildListViewModels(displaySet.items), options);
      return;
  }
}
