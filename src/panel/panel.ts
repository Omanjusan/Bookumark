import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import { getFlatBookmarks } from "./lib/bookmarks.js";
import type { BookmarkItem } from "./lib/bookmarks.js";
import type { DisplayFilter } from "./lib/display-filter.js";
import type { DisplayBookmarkItem } from "./lib/display-item.js";
import { INITIAL_DISPLAY_STATE, reduceDisplayState } from "./lib/display-state.js";
import type { DisplayState } from "./lib/display-state.js";
import { bindFreeMovementInput } from "./lib/panel-free-movement-input.js";
import { presentPanelDrawingPlan } from "./lib/panel-drawing-presenter.js";
import { observeGridCells } from "./lib/grid-resize-observer.js";
import { renderPanelGrid } from "./lib/panel-grid-view.js";
import { bindPanelSearchInput } from "./lib/panel-search-input.js";
import { bindPanelSortAxisInput } from "./lib/panel-sort-axis-input.js";
import { renderError } from "./lib/view.js";
import { loadOrder, saveOrder, reconcile } from "./lib/overlay.js";

const root = document.getElementById("app") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const freeMovementInput = document.getElementById("free-movement") as HTMLInputElement;
const sortAxisSelect = document.getElementById("sort-axis") as HTMLSelectElement;
const filters: readonly DisplayFilter<DisplayBookmarkItem>[] = [];
let currentItems: readonly DisplayBookmarkItem[] | null = null;
let gridCells = { columns: 0, rows: 0 };
let query = "";
let displayState: DisplayState = INITIAL_DISPLAY_STATE;

function renderStatus(message: string): void {
  root.textContent = "";
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = message;
  root.appendChild(status);
}

function redraw(): void {
  if (currentItems === null) {
    renderStatus("読み込み中…");
    return;
  }
  presentPanelDrawingPlan({
    items: currentItems,
    query,
    filters,
    state: displayState,
    ...gridCells,
  }, {
    showLoading: () => renderStatus("読み込み中…"),
    showEmpty: () => {
      countEl.textContent = "0件";
      renderStatus("ブックマークがありません");
    },
    showGrid: (tiles) => {
      countEl.textContent = tiles.length + "件";
      renderPanelGrid(root, tiles);
    },
  });
}

bindPanelSearchInput(searchInput, (nextQuery) => {
  query = nextQuery;
  redraw();
});

bindFreeMovementInput(freeMovementInput, (enabled) => {
  displayState = reduceDisplayState(displayState, {
    type: "setFreeMovement",
    enabled,
  });
  sortAxisSelect.disabled = displayState.freeMovement;
  sortAxisSelect.value = displayState.lastStandardSort.axisId;
  redraw();
});

bindPanelSortAxisInput(sortAxisSelect, (axisId) => {
  displayState = reduceDisplayState(displayState, {
    type: "selectSort",
    axisId,
    direction: displayState.sort.direction,
  });
  redraw();
});

observeGridCells(root, (cells) => {
  gridCells = cells;
  redraw();
});

/**
 * ブックマークと保存済み表示順を読み込み、初期画面を描画する。
 * 読み込みまたは整合処理に失敗した場合はエラー状態を表示する。
 */
async function main(): Promise<void> {
  try {
    const items = await getFlatBookmarks();
    const savedOrder = await loadOrder();
    const { order, changed } = reconcile(savedOrder, items.map((it) => it.guid));
    if (changed) await saveOrder(order);

    const byGuid = new Map(items.map((it) => [it.guid, it]));
    const orderedItems = order
      .map((guid) => byGuid.get(guid))
      .filter((it): it is BookmarkItem => Boolean(it));
    currentItems = await loadBookmarkHistory(orderedItems);
    countEl.textContent = currentItems.length + "件";
    redraw();
  } catch (err) {
    renderError(root, err);
  }
}

main();
