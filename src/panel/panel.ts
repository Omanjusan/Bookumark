import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import { bindBayFactory } from "./lib/bay-factory-controller.js";
import { renderChipToolSelector } from "./lib/chip-tool-selector-view.js";
import { bindChipToolBayDrag } from "./lib/chip-tool-bay-drag.js";
import { bindChipToolTooltip } from "./lib/chip-tool-tooltip.js";
import { getBookmarkTreeItems, moveBookmark } from "./lib/bookmarks.js";
import type {
  BookmarkItem,
  BookmarkTreeFolderItem,
  BookmarkTreeItem,
} from "./lib/bookmarks.js";
import { renderCardView } from "./lib/card-view.js";
import {
  createStoredCurrentFolder,
  loadCurrentFolder,
  resolveCurrentFolderGuid,
  saveCurrentFolder,
} from "./lib/current-folder.js";
import { reorderItemsForTileDrop } from "./lib/custom-order-items.js";
import { persistCustomOrder } from "./lib/custom-order-persistence.js";
import type { DisplayBookmarkItem } from "./lib/display-item.js";
import { INITIAL_FIXED_DISPLAY_STATE, reduceFixedDisplayState } from "./lib/fixed-display-controller.js";
import { directFolderContents } from "./lib/folder-contents.js";
import {
  migrateLegacyOrder,
  orderDirectFolderContents,
  reconcileFolderOrders,
  replaceFolderOrderSubset,
} from "./lib/folder-order.js";
import type { CustomOrderByFolder } from "./lib/folder-order.js";
import { createPanelDragClickGuard } from "./lib/panel-drag-click-guard.js";
import { observeGridCells } from "./lib/grid-resize-observer.js";
import { renderIconView } from "./lib/icon-view.js";
import { renderPanelGrid } from "./lib/panel-grid-view.js";
import { bindPanelFolderNavigation } from "./lib/panel-folder-navigation.js";
import { bindPanelFolderDrag } from "./lib/panel-folder-drag.js";
import { renderPanelFolders } from "./lib/panel-folder-view.js";
import { createFolderNavigationHistory } from "./lib/folder-navigation-history.js";
import type { FolderNavigationHistory } from "./lib/folder-navigation-history.js";
import { renderListView } from "./lib/list-view.js";
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
import { bindVisitStatusFilterInput } from "./lib/panel-visit-filter-input.js";
import { bindViewTypeInput } from "./lib/panel-view-type-input.js";
import {
  loadFolderOrders,
  loadOrder,
  saveFolderOrders,
} from "./lib/overlay.js";
import { createVisitStatusFilters } from "./lib/visit-status-filter.js";
import { presentSelectedView } from "./lib/selected-view-presenter.js";
import { resolveViewDragMode } from "./lib/view-drag-policy.js";

const root = document.getElementById("app") as HTMLElement;
const folderRoot = document.getElementById("folders") as HTMLElement;
const folderBackButton = document.getElementById("folder-back") as HTMLButtonElement;
const folderForwardButton = document.getElementById("folder-forward") as HTMLButtonElement;
const countEl = document.getElementById("count") as HTMLElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const visitStatusFilterRoot = document.getElementById("visit-status-filter") as HTMLElement;
const viewTypeRoot = document.getElementById("view-type") as HTMLElement;
const movementModeRoot = document.getElementById("movement-mode") as HTMLElement;
const sortAxisSelect = document.getElementById("sort-axis") as HTMLSelectElement;
const sortDirectionButton = document.getElementById("sort-direction") as HTMLButtonElement;
const officialMoveNoticeRoot = document.getElementById("official-move-notice") as HTMLElement;
const officialMoveMessage = document.getElementById("official-move-message") as HTMLElement;
const officialMoveUndoButton = document.getElementById("official-move-undo") as HTMLButtonElement;
const bayFactoryEntry = document.getElementById("bay-factory-entry") as HTMLButtonElement;
const bayFactorySelection = document.getElementById("bay-factory-selection") as HTMLElement;
const bayFactorySelect = document.getElementById("bay-factory-select") as HTMLSelectElement;
const bayFactoryOpen = document.getElementById("bay-factory-open") as HTMLButtonElement;
const bayFactoryDialog = document.getElementById("bay-factory-dialog") as HTMLDialogElement;
const bayFactoryClose = document.getElementById("bay-factory-close") as HTMLButtonElement;
const bayFactoryName = document.getElementById("bay-factory-name") as HTMLInputElement;
const bayFactoryEditor = document.getElementById("bay-factory-editor") as HTMLElement;
const chipToolList = document.getElementById("chip-tool-list") as HTMLElement;
const chipToolTooltip = document.getElementById("chip-tool-tooltip") as HTMLElement;
const chipToolTooltipTitle = document.getElementById("chip-tool-tooltip-title") as HTMLElement;
const chipToolTooltipDescription = document.getElementById(
  "chip-tool-tooltip-description",
) as HTMLElement;
const officialMoveNoticeElements = {
  root: officialMoveNoticeRoot,
  message: officialMoveMessage,
  undoButton: officialMoveUndoButton,
};
let currentItems: readonly DisplayBookmarkItem[] | null = null;
let currentFolders: readonly BookmarkTreeFolderItem[] = [];
let treeItems: readonly BookmarkTreeItem[] = [];
let folderOrders: CustomOrderByFolder = {};
let currentFolderGuid: string | null = null;
let folderHistory: FolderNavigationHistory | null = null;
let folderNavigationPending = false;
let gridCells = { columns: 0, rows: 0 };
let fixedDisplayState = INITIAL_FIXED_DISPLAY_STATE;
let officialMovePending = false;
let lastOfficialMove: BookmarkMoveSnapshot | null = null;
const dragClickGuard = createPanelDragClickGuard();

// 永続ユーザーベイとの接続はDB-8で行い、現段階では偽データを注入しない。
bindBayFactory({
  entry: bayFactoryEntry,
  selection: bayFactorySelection,
  select: bayFactorySelect,
  open: bayFactoryOpen,
  dialog: bayFactoryDialog,
  close: bayFactoryClose,
  name: bayFactoryName,
  editor: bayFactoryEditor,
}, []);
renderChipToolSelector(chipToolList, []);
bindChipToolTooltip(
  chipToolList,
  chipToolTooltip,
  chipToolTooltipTitle,
  chipToolTooltipDescription,
);
bindChipToolBayDrag(chipToolList, bayFactoryEditor, () => {
  // DB-7でdrop結果を編集中ドラフトへ反映する。
});

function currentDragMode(): ReturnType<typeof resolveViewDragMode> {
  return resolveViewDragMode({
    movementMode: fixedDisplayState.display.movementMode,
    query: fixedDisplayState.query,
    filterCount: fixedDisplayState.filters.length,
    officialMovePending,
  });
}

function officialReorderEnabled(): boolean {
  return currentDragMode() === "official";
}

function dragEnabled(): boolean {
  return currentDragMode() !== null;
}

function syncSortDirectionButton(): void {
  const direction = fixedDisplayState.display.lastStandardSort.direction;
  sortDirectionButton.disabled = fixedDisplayState.display.movementMode !== "normal";
  sortDirectionButton.dataset.direction = direction;
  sortDirectionButton.textContent = direction === "asc" ? "昇順" : "降順";
}

function syncMovementControls(): void {
  movementModeConnection.setMode(fixedDisplayState.display.movementMode);
  sortAxisSelect.disabled = fixedDisplayState.display.movementMode !== "normal";
  sortAxisSelect.value = fixedDisplayState.display.lastStandardSort.axisId;
  syncSortDirectionButton();
}

function redraw(): void {
  root.dataset.viewType = fixedDisplayState.activeViewType;
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
  presentSelectedView({
    items: currentItems,
    state: fixedDisplayState,
    draggable: dragEnabled(),
    ...gridCells,
  }, {
    showLoading: () => renderPanelStatus(root, { status: "loading" }),
    showEmpty: () => {
      countEl.textContent = "0件";
      renderPanelStatus(root, { status: "empty" });
    },
    showPanel: (models, options) => {
      countEl.textContent = models.length + "件";
      renderPanelGrid(root, models, options);
    },
    showIcon: (models, options) => {
      countEl.textContent = models.length + "件";
      renderIconView(root, models, options);
    },
    showCard: (models, options) => {
      countEl.textContent = models.length + "件";
      renderCardView(root, models, options);
    },
    showList: (models, options) => {
      countEl.textContent = models.length + "件";
      renderListView(root, models, options);
    },
  });
}

const movementModeConnection = bindMovementModeInput(movementModeRoot, (mode) => {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "setMovementMode",
    mode,
  });
  syncMovementControls();
  if (currentFolderGuid === null) {
    redraw();
  } else {
    void showFolder(currentFolderGuid).catch(showLoadError);
  }
});

bindPanelSearchInput(searchInput, (nextQuery) => {
  const previousMode = fixedDisplayState.display.movementMode;
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "setQuery",
    query: nextQuery,
  });
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
});

bindVisitStatusFilterInput(visitStatusFilterRoot, (value) => {
  const previousMode = fixedDisplayState.display.movementMode;
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "setFilters",
    filters: createVisitStatusFilters(value),
  });
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
});

const viewTypeConnection = bindViewTypeInput(viewTypeRoot, (viewType) => {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "selectView",
    viewType,
  });
  viewTypeConnection.setValue(fixedDisplayState.activeViewType);
  redraw();
});

bindPanelSortAxisInput(sortAxisSelect, (axisId) => {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "selectSort",
    axisId,
    direction: fixedDisplayState.display.sort.direction,
  });
  syncMovementControls();
  redraw();
});

bindPanelSortDirectionInput(sortDirectionButton, () => {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "toggleDirection",
  });
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
    if (fixedDisplayState.display.movementMode === "directory-move") {
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
    if (fixedDisplayState.display.movementMode === "directory-move") {
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
    insideEnabled: () => fixedDisplayState.display.movementMode === "directory-move",
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
    const contents = fixedDisplayState.display.movementMode === "directory-move"
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
