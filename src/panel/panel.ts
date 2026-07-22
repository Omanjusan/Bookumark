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
import { createFolderNavigationHistory } from "./lib/folder-navigation-history.js";
import type { FolderNavigationHistory } from "./lib/folder-navigation-history.js";
import { bindPanelFolderHistoryInput } from "./lib/panel-folder-history-input.js";
import type { FolderHistoryDirection } from "./lib/panel-folder-history-input.js";
import { bindMovementModeInput } from "./lib/panel-movement-mode-input.js";
import {
  planOfficialFolderMove,
  planOfficialSiblingMove,
} from "./lib/official-order.js";
import type { OfficialSiblingMovePlan } from "./lib/official-order.js";
import { executeOfficialMoveWithRecovery } from "./lib/official-move-executor.js";
import {
  createBookmarkMoveSnapshot,
  planOfficialUndo,
} from "./lib/official-undo.js";
import type { BookmarkMoveSnapshot } from "./lib/official-undo.js";
import {
  bindOfficialMoveUndo,
  renderOfficialMoveNotice,
} from "./lib/panel-official-move-notice.js";
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
const folderBackButton = document.getElementById("folder-back") as HTMLButtonElement;
const folderForwardButton = document.getElementById("folder-forward") as HTMLButtonElement;
const countEl = document.getElementById("count") as HTMLElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const movementModeRoot = document.getElementById("movement-mode") as HTMLElement;
const sortAxisSelect = document.getElementById("sort-axis") as HTMLSelectElement;
const sortDirectionButton = document.getElementById("sort-direction") as HTMLButtonElement;
const officialMoveNoticeRoot = document.getElementById("official-move-notice") as HTMLElement;
const officialMoveMessage = document.getElementById("official-move-message") as HTMLElement;
const officialMoveUndoButton = document.getElementById("official-move-undo") as HTMLButtonElement;
const officialMoveNoticeElements = {
  root: officialMoveNoticeRoot,
  message: officialMoveMessage,
  undoButton: officialMoveUndoButton,
};
const filters: readonly DisplayFilter<DisplayBookmarkItem>[] = [];
let currentItems: readonly DisplayBookmarkItem[] | null = null;
let currentFolders: readonly BookmarkTreeFolderItem[] = [];
let treeItems: readonly BookmarkTreeItem[] = [];
let folderOrders: CustomOrderByFolder = {};
let currentFolderGuid: string | null = null;
let folderHistory: FolderNavigationHistory | null = null;
let folderNavigationPending = false;
let gridCells = { columns: 0, rows: 0 };
let query = "";
let displayState: DisplayState = INITIAL_DISPLAY_STATE;
let officialMovePending = false;
let lastOfficialMove: BookmarkMoveSnapshot | null = null;
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
  folderHistoryConnection.render({
    canGoBack: (folderHistory?.backDestination() ?? null) !== null,
    canGoForward: (folderHistory?.forwardDestination() ?? null) !== null,
    pending: folderNavigationPending,
  });
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
      void applyOfficialSiblingDrop(drop).catch(reportOfficialMoveError);
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
  (folderGuid) => void visitFolder(folderGuid).catch(showLoadError),
  { consumeSuppressedClick: dragClickGuard.consumeClick },
);

const folderHistoryConnection = bindPanelFolderHistoryInput(
  { backward: folderBackButton, forward: folderForwardButton },
  (direction) => void moveFolderHistory(direction).catch(showLoadError),
);

bindPanelFolderDrag(
  folderRoot,
  (drop) => {
    if (currentFolderGuid === null) return;
    if (displayState.movementMode === "directory-move") {
      if (drop.placement === "inside") {
        void applyOfficialHierarchyDrop(drop.fromGuid, drop.toGuid)
          .catch(reportOfficialMoveError);
      } else {
        void applyOfficialSiblingDrop({
          fromGuid: drop.fromGuid,
          toGuid: drop.toGuid,
          placement: drop.placement,
        }).catch(reportOfficialMoveError);
      }
      return;
    }
    if (drop.placement === "inside") return;
    currentFolders = reorderItemsForTileDrop(currentFolders, {
      fromGuid: drop.fromGuid,
      toGuid: drop.toGuid,
      placement: drop.placement,
    });
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
    insideEnabled: () => displayState.movementMode === "directory-move",
    acceptExternal: officialReorderEnabled,
  },
);

bindOfficialMoveUndo(officialMoveUndoButton, () => {
  void undoLastOfficialMove().catch(reportOfficialMoveError);
});

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
  const snapshot = createBookmarkMoveSnapshot(treeItems, plan.guid);
  const sourceTitle = titleOf(plan.guid);
  const parentTitle = titleOf(plan.destination.parentId);
  await executeOfficialMove(plan, {
    snapshot,
    successMessage: `「${sourceTitle}」を「${parentTitle}」内で移動しました`,
  });
}

async function applyOfficialHierarchyDrop(
  fromGuid: string,
  targetFolderGuid: string,
): Promise<void> {
  if (!officialReorderEnabled()) return;
  const plan = planOfficialFolderMove(treeItems, fromGuid, targetFolderGuid);
  if (plan === null) return;
  const snapshot = createBookmarkMoveSnapshot(treeItems, plan.guid);
  await executeOfficialMove(plan, {
    snapshot,
    successMessage: `「${titleOf(plan.guid)}」を「${titleOf(targetFolderGuid)}」へ移動しました`,
  });
}

interface OfficialMovePresentation {
  readonly successMessage: string;
  readonly snapshot?: BookmarkMoveSnapshot;
  readonly clearUndoOnSuccess?: boolean;
}

async function executeOfficialMove(
  plan: OfficialSiblingMovePlan,
  presentation: OfficialMovePresentation,
): Promise<void> {
  officialMovePending = true;
  redraw();
  try {
    const result = await executeOfficialMoveWithRecovery(plan, {
      move: moveBookmark,
      loadTree: getBookmarkTreeItems,
    });
    if (result.status === "recovery-failed") {
      const errors = result.error === undefined
        ? [result.recoveryError]
        : [result.error, result.recoveryError];
      showLoadError(new AggregateError(errors, "Official move recovery failed"));
      renderOfficialMoveNotice(officialMoveNoticeElements, {
        status: "error",
        message: "公式状態を再取得できませんでした",
        canUndo: lastOfficialMove !== null,
      });
      return;
    }

    treeItems = result.items;
    const reconciled = reconcileFolderOrders(folderOrders, treeItems);
    folderOrders = reconciled.orders;
    if (reconciled.changed) await saveFolderOrders(folderOrders);
    const resolvedFolderGuid = resolveCurrentFolderGuid(
      treeItems,
      await loadCurrentFolder(),
    );
    if (resolvedFolderGuid === null) {
      throw new Error("Firefox bookmark root was not found after official move");
    }
    await showFolder(resolvedFolderGuid);
    if (result.status === "move-failed") {
      console.warn("official bookmark move failed:", result.error);
      renderOfficialMoveNotice(officialMoveNoticeElements, {
        status: "error",
        message: "公式ブックマークを移動できませんでした",
        canUndo: lastOfficialMove !== null,
      });
    } else {
      if (presentation.clearUndoOnSuccess === true) {
        lastOfficialMove = null;
      } else if (presentation.snapshot !== undefined) {
        lastOfficialMove = presentation.snapshot;
      }
      renderOfficialMoveNotice(officialMoveNoticeElements, {
        status: "success",
        message: presentation.successMessage,
        canUndo: lastOfficialMove !== null,
      });
    }
  } catch (error) {
    showLoadError(error);
  } finally {
    officialMovePending = false;
    redraw();
  }
}

async function undoLastOfficialMove(): Promise<void> {
  if (lastOfficialMove === null || officialMovePending) return;
  const undoPlan = planOfficialUndo(lastOfficialMove, treeItems);
  await executeOfficialMove(undoPlan, {
    successMessage: "直前の公式移動を元に戻しました",
    clearUndoOnSuccess: true,
  });
}

function titleOf(guid: string): string {
  return treeItems.find((item) => item.guid === guid)?.title || guid;
}

function reportOfficialMoveError(error: unknown): void {
  console.warn("official bookmark operation rejected:", error);
  renderOfficialMoveNotice(officialMoveNoticeElements, {
    status: "error",
    message: error instanceof Error ? error.message : "公式操作を実行できませんでした",
    canUndo: lastOfficialMove !== null,
  });
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

  const previous = {
    items: currentItems,
    folders: currentFolders,
    folderGuid: currentFolderGuid,
  };
  currentItems = null;
  currentFolders = [];
  currentFolderGuid = folderGuid;
  redraw();
  try {
    const directContents = directFolderContents(treeItems, folderGuid);
    const contents = displayState.movementMode === "directory-move"
      ? directContents
      : orderDirectFolderContents(directContents, folderOrders[folderGuid] ?? []);
    const orderedItems: BookmarkItem[] = contents.bookmarks;
    const loadedItems = await loadBookmarkHistory(orderedItems);
    await saveCurrentFolder(stored);
    currentFolders = contents.folders;
    currentItems = loadedItems;
    countEl.textContent = currentItems.length + "件";
    redraw();
  } catch (error) {
    currentItems = previous.items;
    currentFolders = previous.folders;
    currentFolderGuid = previous.folderGuid;
    redraw();
    throw error;
  }
}

async function visitFolder(folderGuid: string): Promise<void> {
  if (folderNavigationPending || currentFolderGuid === folderGuid) return;
  folderNavigationPending = true;
  redraw();
  try {
    await showFolder(folderGuid);
    folderHistory?.visit(folderGuid);
  } finally {
    folderNavigationPending = false;
    redraw();
  }
}

async function moveFolderHistory(direction: FolderHistoryDirection): Promise<void> {
  if (folderNavigationPending || folderHistory === null) return;
  const destination = direction === "back"
    ? folderHistory.backDestination()
    : folderHistory.forwardDestination();
  if (destination === null) return;

  folderNavigationPending = true;
  redraw();
  try {
    await showFolder(destination);
    if (direction === "back") folderHistory.moveBack();
    else folderHistory.moveForward();
  } finally {
    folderNavigationPending = false;
    redraw();
  }
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
    const restoredFolder = createStoredCurrentFolder(treeItems, folderGuid);
    if (restoredFolder === null) {
      throw new Error(`Folder not found after restoration: ${folderGuid}`);
    }
    folderHistory = createFolderNavigationHistory([
      ...restoredFolder.ancestorGuids,
      restoredFolder.guid,
    ]);
    redraw();
  } catch (error) {
    showLoadError(error);
  }
}

main();
