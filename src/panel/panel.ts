import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import { getBookmarkTreeItems } from "./lib/bookmarks.js";
import type { BookmarkItem, BookmarkTreeItem } from "./lib/bookmarks.js";
import {
  createStoredCurrentFolder,
  loadCurrentFolder,
  resolveCurrentFolderGuid,
  saveCurrentFolder,
} from "./lib/current-folder.js";
import { reorderItemsForTileDrop } from "./lib/custom-order-items.js";
import { persistCustomOrder } from "./lib/custom-order-persistence.js";
import type { DisplayFilter } from "./lib/display-filter.js";
import type { DisplayBookmarkItem } from "./lib/display-item.js";
import { INITIAL_DISPLAY_STATE, reduceDisplayState } from "./lib/display-state.js";
import type { DisplayState } from "./lib/display-state.js";
import { directFolderContents } from "./lib/folder-contents.js";
import { bindFreeMovementInput } from "./lib/panel-free-movement-input.js";
import { createPanelDragClickGuard } from "./lib/panel-drag-click-guard.js";
import { isPanelDragEnabled } from "./lib/panel-drag-policy.js";
import { presentPanelDrawingPlan } from "./lib/panel-drawing-presenter.js";
import { observeGridCells } from "./lib/grid-resize-observer.js";
import { renderPanelGrid } from "./lib/panel-grid-view.js";
import { bindPanelFolderNavigation } from "./lib/panel-folder-navigation.js";
import { renderPanelFolders } from "./lib/panel-folder-view.js";
import { bindPanelSearchInput } from "./lib/panel-search-input.js";
import { bindPanelSortAxisInput } from "./lib/panel-sort-axis-input.js";
import { bindPanelSortDirectionInput } from "./lib/panel-sort-direction-input.js";
import { renderPanelStatus } from "./lib/panel-status-view.js";
import { bindPanelTileOpen } from "./lib/panel-tile-open.js";
import { bindPanelTileDrag } from "./lib/panel-tile-drag.js";
import { loadOrder, saveOrder, reconcile } from "./lib/overlay.js";

const root = document.getElementById("app") as HTMLElement;
const folderRoot = document.getElementById("folders") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const freeMovementInput = document.getElementById("free-movement") as HTMLInputElement;
const sortAxisSelect = document.getElementById("sort-axis") as HTMLSelectElement;
const sortDirectionButton = document.getElementById("sort-direction") as HTMLButtonElement;
const filters: readonly DisplayFilter<DisplayBookmarkItem>[] = [];
let currentItems: readonly DisplayBookmarkItem[] | null = null;
let treeItems: readonly BookmarkTreeItem[] = [];
let globalOrder: string[] = [];
let gridCells = { columns: 0, rows: 0 };
let query = "";
let displayState: DisplayState = INITIAL_DISPLAY_STATE;
const dragClickGuard = createPanelDragClickGuard();

function dragEnabled(): boolean {
  return isPanelDragEnabled({
    freeMovement: displayState.freeMovement,
    query,
    filterCount: filters.length,
  });
}

function syncSortDirectionButton(): void {
  const direction = displayState.lastStandardSort.direction;
  sortDirectionButton.disabled = displayState.freeMovement;
  sortDirectionButton.dataset.direction = direction;
  sortDirectionButton.textContent = direction === "asc" ? "昇順" : "降順";
}

function redraw(): void {
  if (currentItems === null) {
    renderPanelStatus(root, { status: "loading" });
    return;
  }
  presentPanelDrawingPlan({
    items: currentItems,
    query,
    filters,
    state: displayState,
    ...gridCells,
  }, {
    showLoading: () => renderPanelStatus(root, { status: "loading" }),
    showEmpty: () => {
      countEl.textContent = "0件";
      renderPanelStatus(root, { status: "empty" });
    },
    showGrid: (tiles) => {
      countEl.textContent = tiles.length + "件";
      renderPanelGrid(root, tiles, { draggable: dragEnabled() });
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
  syncSortDirectionButton();
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

bindPanelSortDirectionInput(sortDirectionButton, () => {
  displayState = reduceDisplayState(displayState, { type: "toggleDirection" });
  syncSortDirectionButton();
  redraw();
});

bindPanelTileOpen(root, {
  createTab: (details) => browser.tabs.create(details),
  reportError: (error) => console.warn("tabs.create failed:", error),
  consumeSuppressedClick: dragClickGuard.consumeClick,
});

bindPanelTileDrag(
  root,
  (drop) => {
    if (currentItems === null) return;
    currentItems = reorderItemsForTileDrop(currentItems, drop);
    redraw();
    void persistCustomOrder(
      currentItems,
      async (directOrder) => {
        const directGuids = new Set(directOrder);
        let nextIndex = 0;
        globalOrder = globalOrder.map((guid) => (
          directGuids.has(guid) ? directOrder[nextIndex++] : guid
        ));
        await saveOrder(globalOrder);
      },
      (error) => console.warn("custom order save failed:", error),
    );
  },
  {
    isEnabled: dragEnabled,
    onDragStart: dragClickGuard.markDragStarted,
  },
);

bindPanelFolderNavigation(folderRoot, (folderGuid) => {
  void showFolder(folderGuid).catch(showLoadError);
});

observeGridCells(root, (cells) => {
  gridCells = cells;
  redraw();
});

/**
 * ブックマークと保存済み表示順を読み込み、初期画面を描画する。
 * 読み込みまたは整合処理に失敗した場合はエラー状態を表示する。
 */
async function showFolder(folderGuid: string): Promise<void> {
  const stored = createStoredCurrentFolder(treeItems, folderGuid);
  if (stored === null) throw new Error(`Folder not found: ${folderGuid}`);

  currentItems = null;
  redraw();
  const contents = directFolderContents(treeItems, folderGuid);
  renderPanelFolders(folderRoot, contents.folders);

  const byGuid = new Map<string, BookmarkItem>(
    contents.bookmarks.map((item) => [item.guid, item]),
  );
  const orderedItems = globalOrder
    .map((guid) => byGuid.get(guid))
    .filter((item): item is BookmarkItem => item !== undefined);
  currentItems = await loadBookmarkHistory(orderedItems);
  await saveCurrentFolder(stored);
  countEl.textContent = currentItems.length + "件";
  redraw();
}

function showLoadError(error: unknown): void {
  renderPanelStatus(root, {
    status: "error",
    error,
    reportError: (reported) => console.error("panel load failed:", reported),
  });
}

async function main(): Promise<void> {
  try {
    treeItems = await getBookmarkTreeItems();
    const bookmarks = treeItems.filter((item) => item.kind === "bookmark");
    const savedOrder = await loadOrder();
    const reconciled = reconcile(savedOrder, bookmarks.map(({ guid }) => guid));
    globalOrder = reconciled.order;
    if (reconciled.changed) await saveOrder(globalOrder);

    const savedFolder = await loadCurrentFolder();
    const folderGuid = resolveCurrentFolderGuid(treeItems, savedFolder);
    if (folderGuid === null) throw new Error("Firefox bookmark root was not found");
    await showFolder(folderGuid);
  } catch (error) {
    showLoadError(error);
  }
}

main();
