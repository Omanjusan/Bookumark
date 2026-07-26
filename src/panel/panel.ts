import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import {
  createActiveDockingLayoutController,
  createDockingTransientState,
} from "./lib/active-docking-layout-controller.js";
import type { ActiveDockingLayoutController } from "./lib/active-docking-layout-controller.js";
import { bindBayFactory } from "./lib/bay-factory-controller.js";
import { bindBayFactoryChipDrag } from "./lib/bay-factory-chip-drag.js";
import { renderBayFactoryEditor } from "./lib/bay-factory-static-view.js";
import { renderChipToolSelector } from "./lib/chip-tool-selector-view.js";
import { bindChipToolBayDrag } from "./lib/chip-tool-bay-drag.js";
import { bindChipToolTooltip } from "./lib/chip-tool-tooltip.js";
import { bindNewBayFactory } from "./lib/new-bay-factory-controller.js";
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
import type { MovementMode, StandardSortAxisId } from "./lib/display-state.js";
import { INITIAL_FIXED_DISPLAY_STATE, reduceFixedDisplayState } from "./lib/fixed-display-controller.js";
import { directFolderContents } from "./lib/folder-contents.js";
import { createDockingBasicChipRuntime } from "./lib/docking-basic-chip-runtime.js";
import type { DockingBasicChipRuntime } from "./lib/docking-basic-chip-runtime.js";
import { createDockingChipRendererRegistry } from "./lib/docking-chip-renderer-registry.js";
import { renderHorizontalDockingRail } from "./lib/docking-horizontal-rail-view.js";
import { planDockingRailOverflow } from "./lib/docking-rail-overflow.js";
import { renderVerticalDockingRail } from "./lib/docking-vertical-rail-view.js";
import type { DockingDocuments } from "./lib/docking-persistence-model.js";
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
import {
  buildPanelBayModels,
  loadPanelDockingState,
} from "./lib/panel-docking-bootstrap.js";
import { createFolderNavigationHistory } from "./lib/folder-navigation-history.js";
import type { FolderNavigationHistory } from "./lib/folder-navigation-history.js";
import { renderListView } from "./lib/list-view.js";
import type { FolderHistoryDirection } from "./lib/panel-folder-history-input.js";
import { bindLayoutManagement } from "./lib/layout-management-controller.js";
import { createLayoutManagementCoordinator } from "./lib/layout-management-coordinator.js";
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
import { renderPanelStatus } from "./lib/panel-status-view.js";
import { bindPanelTileOpen } from "./lib/panel-tile-open.js";
import { bindPanelTileDrag } from "./lib/panel-tile-drag.js";
import {
  loadFolderOrders,
  loadOrder,
  saveFolderOrders,
} from "./lib/overlay.js";
import { createVisitStatusFilters } from "./lib/visit-status-filter.js";
import type { VisitStatusFilterValue } from "./lib/visit-status-filter.js";
import { presentSelectedView } from "./lib/selected-view-presenter.js";
import { resolveViewDragMode } from "./lib/view-drag-policy.js";
import type { ViewType } from "./lib/view-type.js";

const root = document.getElementById("app") as HTMLElement;
const folderRoot = document.getElementById("folders") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;
const dockingRailRoots = {
  top: document.getElementById("docking-rail-top") as HTMLElement,
  left: document.getElementById("docking-rail-left") as HTMLElement,
  right: document.getElementById("docking-rail-right") as HTMLElement,
  bottom: document.getElementById("docking-rail-bottom") as HTMLElement,
};
const officialMoveNoticeRoot = document.getElementById("official-move-notice") as HTMLElement;
const officialMoveMessage = document.getElementById("official-move-message") as HTMLElement;
const officialMoveUndoButton = document.getElementById("official-move-undo") as HTMLButtonElement;
const layoutSelect = document.getElementById("layout-select") as HTMLSelectElement;
const layoutDefault = document.getElementById("layout-default") as HTMLButtonElement;
const layoutManage = document.getElementById("layout-manage") as HTMLButtonElement;
const layoutDialog = document.getElementById("layout-dialog") as HTMLDialogElement;
const layoutDialogClose = document.getElementById("layout-dialog-close") as HTMLButtonElement;
const layoutName = document.getElementById("layout-name") as HTMLInputElement;
const layoutSource = document.getElementById("layout-source") as HTMLSelectElement;
const layoutDuplicationModes = document.getElementById(
  "layout-duplication-modes",
) as HTMLFieldSetElement;
const layoutDuplicationShared = document.getElementById(
  "layout-duplication-shared",
) as HTMLInputElement;
const layoutDuplicationIndependent = document.getElementById(
  "layout-duplication-independent",
) as HTMLInputElement;
const layoutCreate = document.getElementById("layout-create") as HTMLButtonElement;
const layoutRename = document.getElementById("layout-rename") as HTMLButtonElement;
const layoutPreferred = document.getElementById("layout-preferred") as HTMLButtonElement;
const layoutDelete = document.getElementById("layout-delete") as HTMLButtonElement;
const layoutRetry = document.getElementById("layout-retry") as HTMLButtonElement;
const layoutStatus = document.getElementById("layout-status") as HTMLElement;
const bayFactoryAdd = document.getElementById("bay-factory-add") as HTMLButtonElement;
const bayFactoryEntry = document.getElementById("bay-factory-entry") as HTMLButtonElement;
const bayFactorySelection = document.getElementById("bay-factory-selection") as HTMLElement;
const bayFactorySelect = document.getElementById("bay-factory-select") as HTMLSelectElement;
const bayFactoryOpen = document.getElementById("bay-factory-open") as HTMLButtonElement;
const bayFactoryDialog = document.getElementById("bay-factory-dialog") as HTMLDialogElement;
const bayFactoryClose = document.getElementById("bay-factory-close") as HTMLButtonElement;
const bayFactoryName = document.getElementById("bay-factory-name") as HTMLInputElement;
const bayFactoryDuplicate = document.getElementById("bay-factory-duplicate") as HTMLButtonElement;
const bayFactoryEditor = document.getElementById("bay-factory-editor") as HTMLElement;
const bayFactoryDiscardConfirmation = document.getElementById(
  "bay-factory-discard-confirmation",
) as HTMLElement;
const bayFactoryContinueEditing = document.getElementById(
  "bay-factory-continue-editing",
) as HTMLButtonElement;
const bayFactoryDiscardChanges = document.getElementById(
  "bay-factory-discard-changes",
) as HTMLButtonElement;
void bayFactoryDuplicate;
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
let visitStatusValue: VisitStatusFilterValue = "all";
let officialMovePending = false;
let lastOfficialMove: BookmarkMoveSnapshot | null = null;
let activeChipRuntime: DockingBasicChipRuntime | null = null;
let activeDockingController: ActiveDockingLayoutController | null = null;
const dragClickGuard = createPanelDragClickGuard();

// 永続ユーザーベイとの接続はDB-8で行い、現段階では偽データを注入しない。
const bayFactoryConnection = bindBayFactory({
  entry: bayFactoryEntry,
  selection: bayFactorySelection,
  select: bayFactorySelect,
  open: bayFactoryOpen,
  dialog: bayFactoryDialog,
  close: bayFactoryClose,
  name: bayFactoryName,
  editor: bayFactoryEditor,
  discardConfirmation: bayFactoryDiscardConfirmation,
  continueEditing: bayFactoryContinueEditing,
  discardChanges: bayFactoryDiscardChanges,
}, []);
let temporaryBaySequence = 1;
bindNewBayFactory({
  add: bayFactoryAdd,
  dialog: bayFactoryDialog,
  name: bayFactoryName,
}, {
  createTemporaryId: () => `new-bay-session-${temporaryBaySequence++}`,
  render: (model) => renderBayFactoryEditor(bayFactoryEditor, model),
});
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
bindBayFactoryChipDrag(bayFactoryEditor, () => {
  // DB-7で並べ替え・削除結果を編集中ドラフトへ反映する。
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
  activeChipRuntime?.sync();
}

function syncMovementControls(): void {
  activeChipRuntime?.sync();
}

function redraw(): void {
  root.dataset.viewType = fixedDisplayState.activeViewType;
  activeChipRuntime?.sync();
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

/** 動的な移動モードチップから共有表示状態を更新する。 */
function setMovementMode(mode: MovementMode): void {
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
}

/** 動的な検索チップから共有検索状態を更新する。 */
function setSearchQuery(nextQuery: string): void {
  const previousMode = fixedDisplayState.display.movementMode;
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "setQuery",
    query: nextQuery,
  });
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
}

/** 動的な訪問状態チップから共有フィルター状態を更新する。 */
function setVisitStatus(value: VisitStatusFilterValue): void {
  visitStatusValue = value;
  const previousMode = fixedDisplayState.display.movementMode;
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "setFilters",
    filters: createVisitStatusFilters(value),
  });
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
}

/** 動的な表示形式チップから共有ビュー状態を更新する。 */
function setViewType(viewType: ViewType): void {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "selectView",
    viewType,
  });
  redraw();
}

/** 動的なソートチップから共有ソート軸を更新する。 */
function setSortAxis(axisId: StandardSortAxisId): void {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "selectSort",
    axisId,
    direction: fixedDisplayState.display.sort.direction,
  });
  syncMovementControls();
  redraw();
}

/** 動的なソートチップから共有ソート方向を反転する。 */
function toggleSortDirection(): void {
  fixedDisplayState = reduceFixedDisplayState(fixedDisplayState, {
    type: "toggleDirection",
  });
  syncSortDirectionButton();
  redraw();
}

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

/** 現在の共有状態と操作callbackへ接続した基本6チップruntimeを生成する。 */
function createPanelChipRuntime(): DockingBasicChipRuntime {
  return createDockingBasicChipRuntime({
    snapshot: () => ({
      query: fixedDisplayState.query,
      visitStatus: visitStatusValue,
      folderHistory: {
        canGoBack: (folderHistory?.backDestination() ?? null) !== null,
        canGoForward: (folderHistory?.forwardDestination() ?? null) !== null,
        pending: folderNavigationPending,
      },
      sortAxis: fixedDisplayState.display.lastStandardSort.axisId,
      sortDirection: fixedDisplayState.display.lastStandardSort.direction,
      sortDisabled: fixedDisplayState.display.movementMode !== "normal",
      viewType: fixedDisplayState.activeViewType,
      movementMode: fixedDisplayState.display.movementMode,
    }),
    onSearch: setSearchQuery,
    onVisitStatus: setVisitStatus,
    onFolderHistory: (direction) => void moveFolderHistory(direction).catch(showLoadError),
    onSortAxis: setSortAxis,
    onSortDirection: toggleSortDirection,
    onViewType: setViewType,
    onMovementMode: setMovementMode,
  });
}

/** 描画済みベイ寸法からレールの間隔とスクロール状態をDOMへ反映する。 */
function applyDockingRailOverflow(
  rail: HTMLElement,
  orientation: "horizontal" | "vertical",
): void {
  const available = orientation === "horizontal" ? rail.clientWidth : rail.clientHeight;
  const extents = Array.from(rail.children).map((child) => {
    const rect = child.getBoundingClientRect();
    return orientation === "horizontal" ? rect.width : rect.height;
  });
  const overflow = planDockingRailOverflow(available, extents);
  rail.dataset.gap = String(overflow.gap);
  rail.dataset.scroll = String(overflow.scroll);
}

/** 動的4レールのライフサイクルコントローラーを遅延生成する。 */
function dockingLayoutController(): ActiveDockingLayoutController {
  if (activeDockingController !== null) return activeDockingController;
  activeDockingController = createActiveDockingLayoutController({
    clearDynamicRails: () => {
      for (const rail of Object.values(dockingRailRoots)) {
        rail.replaceChildren();
        delete rail.dataset.gap;
        delete rail.dataset.scroll;
      }
    },
    resetTransientState: () => {
      if (currentFolderGuid === null) throw new Error("current folder is required for layout rebuild");
      const transient = createDockingTransientState(currentFolderGuid);
      fixedDisplayState = transient.fixedDisplayState;
      visitStatusValue = "all";
      folderHistory = transient.folderHistory;
      lastOfficialMove = transient.officialUndo;
      officialMovePending = transient.officialMovePending;
      folderNavigationPending = transient.folderNavigationPending;
    },
    render: (plan) => {
      const runtime = createPanelChipRuntime();
      activeChipRuntime = runtime;
      const registry = createDockingChipRendererRegistry(runtime.renderers);
      for (const railPlan of plan.rails) {
        const rail = dockingRailRoots[railPlan.rail];
        const result = railPlan.orientation === "horizontal"
          ? renderHorizontalDockingRail(rail, railPlan, registry)
          : renderVerticalDockingRail(rail, railPlan, registry);
        if (result.skippedChips.length > 0) {
          console.warn("docking chips were skipped:", result.skippedChips);
        }
        applyDockingRailOverflow(rail, railPlan.orientation);
      }
      runtime.sync();
      redraw();
      return {
        disconnect(): void {
          runtime.disconnect();
          if (activeChipRuntime === runtime) activeChipRuntime = null;
        },
      };
    },
  });
  return activeDockingController;
}

/** 正常化済み文書のactiveレイアウトを動的4レールへ再構築する。 */
function rebuildActiveDockingLayout(documents: DockingDocuments): void {
  if (currentFolderGuid === null) return;
  const plan = dockingLayoutController().rebuild(documents);
  root.dataset.activeLayoutId = plan.activeLayoutId;
}

async function main(): Promise<void> {
  try {
    const dockingState = await loadPanelDockingState();
    bayFactoryConnection.replaceBays(dockingState.bays);
    // 後続の動的レール描画が同じactiveレイアウトを参照できる境界として保持する。
    root.dataset.activeLayoutId = dockingState.activeLayout.id;
    const layoutCoordinator = createLayoutManagementCoordinator(dockingState.documents);
    bindLayoutManagement({
      select: layoutSelect,
      restoreDefault: layoutDefault,
      manage: layoutManage,
      dialog: layoutDialog,
      close: layoutDialogClose,
      name: layoutName,
      source: layoutSource,
      duplicationModes: layoutDuplicationModes,
      shared: layoutDuplicationShared,
      independent: layoutDuplicationIndependent,
      create: layoutCreate,
      rename: layoutRename,
      preferred: layoutPreferred,
      delete: layoutDelete,
      retry: layoutRetry,
      status: layoutStatus,
    }, layoutCoordinator, {
      onStateChange: (documents) => {
        root.dataset.activeLayoutId = documents.dockingMetadata.activeLayoutId;
        bayFactoryConnection.replaceBays(buildPanelBayModels(documents));
        rebuildActiveDockingLayout(documents);
      },
    });
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
    rebuildActiveDockingLayout(dockingState.documents);
    redraw();
  } catch (error) {
    showLoadError(error);
  }
}

main();
