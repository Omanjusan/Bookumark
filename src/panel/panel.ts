import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import { getBookmarkTreeItems, moveBookmark } from "./lib/bookmarks.js";
import type {
  BookmarkItem,
  BookmarkTreeFolderItem,
  BookmarkTreeItem,
} from "./lib/bookmarks.js";
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
import {
  migrateLegacyOrder,
  orderDirectFolderContents,
  reconcileFolderOrders,
  replaceFolderOrderSubset,
} from "./lib/folder-order.js";
import type { CustomOrderByFolder } from "./lib/folder-order.js";
import { createPanelDragClickGuard } from "./lib/panel-drag-click-guard.js";
import { isPanelDragEnabled } from "./lib/panel-drag-policy.js";
import { presentPanelDrawingPlan } from "./lib/panel-drawing-presenter.js";
import { observeGridCells } from "./lib/grid-resize-observer.js";
import { renderPanelGrid } from "./lib/panel-grid-view.js";
import { bindPanelFolderNavigation } from "./lib/panel-folder-navigation.js";
import { bindPanelFolderDrag } from "./lib/panel-folder-drag.js";
import { renderPanelFolders } from "./lib/panel-folder-view.js";
import { bindMovementModeInput } from "./lib/panel-movement-mode-input.js";
import { planOfficialSiblingMove } from "./lib/official-order.js";
import { bindPanelSearchInput } from "./lib/panel-search-input.js";
import { bindPanelSortAxisInput } from "./lib/panel-sort-axis-input.js";
import { bindPanelSortDirectionInput } from "./lib/panel-sort-direction-input.js";
import { renderPanelStatus } from "./lib/panel-status-view.js";
import { bindPanelTileOpen } from "./lib/panel-tile-open.js";
import { bindPanelTileDrag } from "./lib/panel-tile-drag.js";
import {
  loadFolderOrders,
  loadOrder,
  saveFolderOrders,
} from "./lib/overlay.js";

const root = document.getElementById("app") as HTMLElement;
const folderRoot = document.getElementById("folders") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const movementModeRoot = document.getElementById("movement-mode") as HTMLElement;
const sortAxisSelect = document.getElementById("sort-axis") as HTMLSelectElement;
const sortDirectionButton = document.getElementById("sort-direction") as HTMLButtonElement;
const filters: readonly DisplayFilter<DisplayBookmarkItem>[] = [];
let currentItems: readonly DisplayBookmarkItem[] | null = null;
let currentFolders: readonly BookmarkTreeFolderItem[] = [];
let treeItems: readonly BookmarkTreeItem[] = [];
let folderOrders: CustomOrderByFolder = {};
let currentFolderGuid: string | null = null;
let gridCells = { columns: 0, rows: 0 };
let query = "";
let displayState: DisplayState = INITIAL_DISPLAY_STATE;
let officialMovePending = false;
const dragClickGuard = createPanelDragClickGuard();

function customDragEnabled(): boolean {
  return isPanelDragEnabled({
    movementMode: displayState.movementMode,
    query,
    filterCount: filters.length,
  });
}

function officialReorderEnabled(): boolean {
  return !officialMovePending
    && displayState.movementMode === "directory-move"
    && query.trim().length === 0
    && filters.length === 0;
}

function dragEnabled(): boolean {
  return customDragEnabled() || officialReorderEnabled();
}

function syncSortDirectionButton(): void {
  const direction = displayState.lastStandardSort.direction;
  sortDirectionButton.disabled = displayState.movementMode !== "normal";
  sortDirectionButton.dataset.direction = direction;
  sortDirectionButton.textContent = direction === "asc" ? "昇順" : "降順";
}

function syncMovementControls(): void {
  movementModeConnection.setMode(displayState.movementMode);
  sortAxisSelect.disabled = displayState.movementMode !== "normal";
  sortAxisSelect.value = displayState.lastStandardSort.axisId;
  syncSortDirectionButton();
}

function redraw(): void {
  renderPanelFolders(folderRoot, currentFolders, { draggable: dragEnabled() });
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

const movementModeConnection = bindMovementModeInput(movementModeRoot, (mode) => {
  displayState = reduceDisplayState(displayState, { type: "setMovementMode", mode });
  syncMovementControls();
  if (currentFolderGuid === null) {
    redraw();
  } else {
    void showFolder(currentFolderGuid).catch(showLoadError);
  }
});

bindPanelSearchInput(searchInput, (nextQuery) => {
  query = nextQuery;
  if (query.trim().length > 0 && displayState.movementMode !== "normal") {
    displayState = reduceDisplayState(displayState, { type: "resetMovementMode" });
    syncMovementControls();
  }
  redraw();
});

bindPanelSortAxisInput(sortAxisSelect, (axisId) => {
  displayState = reduceDisplayState(displayState, {
    type: "selectSort",
    axisId,
    direction: displayState.sort.direction,
  });
  syncMovementControls();
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
    if (displayState.movementMode === "directory-move") {
      void applyOfficialSiblingDrop(drop);
      return;
    }
    currentItems = reorderItemsForTileDrop(currentItems, drop);
    redraw();
    void persistCustomOrder(
      currentItems,
      async (directOrder) => {
        if (currentFolderGuid === null) return;
        folderOrders = {
          ...folderOrders,
          [currentFolderGuid]: replaceFolderOrderSubset(
            folderOrders[currentFolderGuid] ?? [],
            directOrder,
          ),
        };
        await saveFolderOrders(folderOrders);
      },
      (error) => console.warn("custom order save failed:", error),
    );
  },
  {
    isEnabled: dragEnabled,
    onDragStart: dragClickGuard.markDragStarted,
  },
);

bindPanelFolderNavigation(
  folderRoot,
  (folderGuid) => void showFolder(folderGuid).catch(showLoadError),
  { consumeSuppressedClick: dragClickGuard.consumeClick },
);

bindPanelFolderDrag(
  folderRoot,
  (drop) => {
    if (currentFolderGuid === null) return;
    if (displayState.movementMode === "directory-move") {
      void applyOfficialSiblingDrop(drop);
      return;
    }
    currentFolders = reorderItemsForTileDrop(currentFolders, drop);
    redraw();
    void persistCustomOrder(
      currentFolders,
      async (directOrder) => {
        if (currentFolderGuid === null) return;
        folderOrders = {
          ...folderOrders,
          [currentFolderGuid]: replaceFolderOrderSubset(
            folderOrders[currentFolderGuid] ?? [],
            directOrder,
          ),
        };
        await saveFolderOrders(folderOrders);
      },
      (error) => console.warn("folder custom order save failed:", error),
    );
  },
  {
    isEnabled: dragEnabled,
    onDragStart: dragClickGuard.markDragStarted,
  },
);

async function applyOfficialSiblingDrop(drop: {
  readonly fromGuid: string;
  readonly toGuid: string;
  readonly placement: "before" | "after";
  readonly edge?: "start" | "end";
}): Promise<void> {
  if (!officialReorderEnabled()) return;
  const plan = planOfficialSiblingMove(treeItems, {
    fromGuid: drop.fromGuid,
    toGuid: drop.toGuid,
    placement: drop.edge ?? drop.placement,
  });
  if (plan === null) return;

  officialMovePending = true;
  redraw();
  try {
    await moveBookmark(plan.guid, plan.destination);
    treeItems = await getBookmarkTreeItems();
    const reconciled = reconcileFolderOrders(folderOrders, treeItems);
    folderOrders = reconciled.orders;
    if (reconciled.changed) await saveFolderOrders(folderOrders);
    if (currentFolderGuid !== null) await showFolder(currentFolderGuid);
  } catch (error) {
    showLoadError(error);
  } finally {
    officialMovePending = false;
    redraw();
  }
}

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
  currentFolders = [];
  currentFolderGuid = folderGuid;
  redraw();
  const directContents = directFolderContents(treeItems, folderGuid);
  const contents = displayState.movementMode === "directory-move"
    ? directContents
    : orderDirectFolderContents(directContents, folderOrders[folderGuid] ?? []);
  currentFolders = contents.folders;

  const orderedItems: BookmarkItem[] = contents.bookmarks;
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
    const savedFolderOrders = await loadFolderOrders();
    if (savedFolderOrders === null) {
      folderOrders = migrateLegacyOrder(await loadOrder(), treeItems);
      await saveFolderOrders(folderOrders);
    } else {
      const reconciled = reconcileFolderOrders(savedFolderOrders, treeItems);
      folderOrders = reconciled.orders;
      if (reconciled.changed) await saveFolderOrders(folderOrders);
    }

    const savedFolder = await loadCurrentFolder();
    const folderGuid = resolveCurrentFolderGuid(treeItems, savedFolder);
    if (folderGuid === null) throw new Error("Firefox bookmark root was not found");
    await showFolder(folderGuid);
  } catch (error) {
    showLoadError(error);
  }
}

main();
