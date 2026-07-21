import { assignDesiredSizes } from "./desired-size.js";
import type { DisplayFilter } from "./display-filter.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import { buildDisplaySet } from "./display-pipeline.js";
import type { DisplayState } from "./display-state.js";
import { buildPanelTileModels } from "./panel-tile-model.js";
import type { PanelTileModel } from "./panel-tile-model.js";
import { allocatePanelSizes } from "./size-allocation.js";

interface PanelDrawingPlanInput {
  readonly items: readonly DisplayBookmarkItem[];
  readonly query: string;
  readonly filters: readonly DisplayFilter<DisplayBookmarkItem>[];
  readonly state: DisplayState;
  readonly columns: number;
  readonly rows: number;
}

type PanelDrawingPlan =
  | { readonly status: "deferred" }
  | { readonly status: "ready"; readonly tiles: readonly PanelTileModel[] };

/** P1〜P4の純粋な処理を接続し、DOM描画直前のタイル計画を返す。 */
export function buildPanelDrawingPlan(input: PanelDrawingPlanInput): PanelDrawingPlan {
  const displaySet = buildDisplaySet({
    items: input.items,
    query: input.query,
    filters: input.filters,
    state: input.state,
  });
  const desiredSizes = assignDesiredSizes(displaySet.items, displaySet.axis)
    .map(({ guid, size }) => ({ guid, desiredSize: size }));
  const allocation = allocatePanelSizes({
    items: desiredSizes,
    scalable: displaySet.axis.scalable,
    columns: input.columns,
    rows: input.rows,
  });
  if (allocation.status === "deferred") return allocation;

  const sizeByGuid = new Map(allocation.sizes.map(({ guid, size }) => [guid, size]));
  return {
    status: "ready",
    tiles: buildPanelTileModels(displaySet.items.map((item) => {
      const size = sizeByGuid.get(item.guid);
      if (size === undefined) throw new Error(`missing size allocation for ${item.guid}`);
      const value = displaySet.axis.valueOf(item);
      const scaleValue = value == null
        ? undefined
        : displaySet.axis.formatValue?.(value);
      return { item, size, scaleValue };
    })),
  };
}
