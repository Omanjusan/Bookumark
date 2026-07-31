import { loadBookmarkHistory } from "./lib/bookmark-history.js";
import {
  createActiveDockingLayoutController,
  createDockingTransientState,
} from "./lib/active-docking-layout-controller.js";
import type { ActiveDockingLayoutController } from "./lib/active-docking-layout-controller.js";
import { bindBayFactory } from "./lib/bay-factory-controller.js";
import { bindBayFactoryChipDrag } from "./lib/bay-factory-chip-drag.js";
import { createBayEditSession } from "./lib/bay-edit-session.js";
import type { BayEditSession } from "./lib/bay-edit-session.js";
import { bindBayEditTransaction } from "./lib/bay-edit-transaction-controller.js";
import type { BayEditTransactionConnection } from "./lib/bay-edit-transaction-controller.js";
import { renderBayFactoryEditor } from "./lib/bay-factory-static-view.js";
import { renderChipToolSelector } from "./lib/chip-tool-selector-view.js";
import { bindChipToolBayDrag } from "./lib/chip-tool-bay-drag.js";
import { bindChipToolTooltip } from "./lib/chip-tool-tooltip.js";
import { bindNewBayFactory } from "./lib/new-bay-factory-controller.js";
import type { NewBayFactoryController } from "./lib/new-bay-factory-controller.js";
import { saveNewBayConfiguration } from "./lib/new-bay-save.js";
import type { NewBayDraft } from "./lib/bay-management.js";
import { getBookmarkTreeItems, moveBookmark } from "./lib/bookmarks.js";
import type {
  BookmarkItem,
  BookmarkTreeFolderItem,
  BookmarkTreeItem,
} from "./lib/bookmarks.js";
import { renderCardView } from "./lib/card-view.js";
import { createCommonNotificationQueue } from "./lib/common-notification-queue.js";
import type { CommonDialogNotification } from "./lib/common-notification-queue.js";
import { bindCommonNotificationView } from "./lib/common-notification-view.js";
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
import { INITIAL_FIXED_DISPLAY_STATE } from "./lib/fixed-display-controller.js";
import { directFolderContents } from "./lib/folder-contents.js";
import { createDockingBasicChipRuntime } from "./lib/docking-basic-chip-runtime.js";
import type { DockingBasicChipRuntime } from "./lib/docking-basic-chip-runtime.js";
import {
  BASIC_DOCKING_CONTROL_DEFINITIONS,
  createDockingBasicControlStore,
} from "./lib/docking-basic-control-definitions.js";
import type {
  DockingBasicControlStore,
} from "./lib/docking-basic-control-definitions.js";
import {
  buildDockingChipApplicationOrder,
} from "./lib/docking-chip-application-order.js";
import { createDockingChipRendererRegistry } from "./lib/docking-chip-renderer-registry.js";
import {
  CURRENT_DOCKING_CHIP_RECORDS,
  PRODUCTION_DOCKING_CHIP_CATALOG,
} from "./lib/docking-chip-catalog.js";
import { createDockingConditionFailureNotification } from "./lib/docking-condition-failure-notification.js";
import type { DockingConditionFailure } from "./lib/docking-condition-evaluator.js";
import {
  createDeprecatedChipDialogNotification,
  createDockingRecoveryDialogNotification,
} from "./lib/docking-recovery-notification.js";
import {
  createDockingEditRuntimeCoordinator,
} from "./lib/docking-edit-runtime-coordinator.js";
import type {
  DockingEditRuntimeCoordinator,
} from "./lib/docking-edit-runtime-coordinator.js";
import { renderHorizontalDockingRail } from "./lib/docking-horizontal-rail-view.js";
import { planDockingRailOverflow } from "./lib/docking-rail-overflow.js";
import { renderVerticalDockingRail } from "./lib/docking-vertical-rail-view.js";
import type { DockingDocuments, RailId } from "./lib/docking-persistence-model.js";
import {
  createDockingSaveReevaluationSession,
} from "./lib/docking-save-reevaluation-session.js";
import type {
  DockingSaveReevaluationSession,
} from "./lib/docking-save-reevaluation-session.js";
import {
  createDefaultDockingSharedState,
  evaluateDockingSharedStateConditions,
} from "./lib/docking-shared-state.js";
import type { DockingSharedState } from "./lib/docking-shared-state.js";
import { saveDockingDocuments } from "./lib/docking-storage.js";
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
  buildPanelDockingState,
  buildPanelBayModels,
  loadPanelDockingState,
} from "./lib/panel-docking-bootstrap.js";
import { runPanelDockingStartup } from "./lib/panel-docking-startup.js";
import { createFolderNavigationHistory } from "./lib/folder-navigation-history.js";
import type { FolderNavigationHistory } from "./lib/folder-navigation-history.js";
import { renderListView } from "./lib/list-view.js";
import type { FolderHistoryDirection } from "./lib/panel-folder-history-input.js";
import { bindLayoutManagement } from "./lib/layout-management-controller.js";
import { createLayoutManagementCoordinator } from "./lib/layout-management-coordinator.js";
import { bindLayoutEditMode } from "./lib/layout-edit-mode-controller.js";
import {
  bindLayoutEditTransaction,
} from "./lib/layout-edit-transaction-controller.js";
import type {
  LayoutEditTransactionConnection,
} from "./lib/layout-edit-transaction-controller.js";
import { renderBayPicker } from "./lib/bay-picker-view.js";
import { bindBayPickerDrag } from "./lib/bay-picker-drag.js";
import { bindBayRailInsertionDrop } from "./lib/bay-rail-insertion-drop.js";
import { bindLayoutBayTrash } from "./lib/layout-bay-trash.js";
import {
  createLayoutPlacementEditSession,
} from "./lib/layout-placement-edit-session.js";
import type {
  LayoutPlacementEditSession,
} from "./lib/layout-placement-edit-session.js";
import {
  measureBayAutoPlacementCandidate,
  renderBayPlacementPreviews,
} from "./lib/bay-placement-preview.js";
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
const frameRoot = document.querySelector(".frame") as HTMLElement;
const folderRoot = document.getElementById("folders") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;
const commonNotificationDialog = document.getElementById(
  "common-notification-dialog",
) as HTMLDialogElement;
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
const layoutEditEntry = document.getElementById("layout-edit-entry") as HTMLButtonElement;
const layoutEditUnavailable = document.getElementById("layout-edit-unavailable") as HTMLElement;
const layoutEditBar = document.getElementById("layout-edit-bar") as HTMLElement;
const layoutEditName = document.getElementById("layout-edit-name") as HTMLElement;
const layoutEditUnsaved = document.getElementById("layout-edit-unsaved") as HTMLElement;
const layoutEditUndo = document.getElementById("layout-edit-undo") as HTMLButtonElement;
const layoutEditRedo = document.getElementById("layout-edit-redo") as HTMLButtonElement;
const layoutEditSave = document.getElementById("layout-edit-save") as HTMLButtonElement;
const layoutEditRetry = document.getElementById("layout-edit-retry") as HTMLButtonElement;
const layoutEditDelete = document.getElementById("layout-edit-delete") as HTMLButtonElement;
const layoutEditExit = document.getElementById("layout-edit-exit") as HTMLButtonElement;
const layoutEditStatus = document.getElementById("layout-edit-status") as HTMLElement;
const layoutEditDiscardConfirmation = document.getElementById(
  "layout-edit-discard-confirmation",
) as HTMLElement;
const layoutEditContinue = document.getElementById("layout-edit-continue") as HTMLButtonElement;
const layoutEditDiscard = document.getElementById("layout-edit-discard") as HTMLButtonElement;
const bayPicker = document.getElementById("bay-picker") as HTMLElement;
const bayPickerUnplaced = document.getElementById("bay-picker-unplaced") as HTMLElement;
const bayPickerPlaced = document.getElementById("bay-picker-placed") as HTMLElement;
const layoutBayTrash = document.getElementById("layout-bay-trash") as HTMLElement;
const bayFactoryAdd = document.getElementById("bay-factory-add") as HTMLButtonElement;
const bayFactoryEntry = document.getElementById("bay-factory-entry") as HTMLButtonElement;
const bayFactorySelection = document.getElementById("bay-factory-selection") as HTMLElement;
const bayFactorySelect = document.getElementById("bay-factory-select") as HTMLSelectElement;
const bayFactoryOpen = document.getElementById("bay-factory-open") as HTMLButtonElement;
const bayFactoryDialog = document.getElementById("bay-factory-dialog") as HTMLDialogElement;
const bayFactoryClose = document.getElementById("bay-factory-close") as HTMLButtonElement;
const bayFactoryName = document.getElementById("bay-factory-name") as HTMLInputElement;
const bayFactoryUndo = document.getElementById("bay-factory-undo") as HTMLButtonElement;
const bayFactoryRedo = document.getElementById("bay-factory-redo") as HTMLButtonElement;
const bayFactorySave = document.getElementById("bay-factory-save") as HTMLButtonElement;
const bayFactoryDuplicate = document.getElementById("bay-factory-duplicate") as HTMLButtonElement;
const bayFactoryDelete = document.getElementById("bay-factory-delete") as HTMLButtonElement;
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
const notificationQueue = createCommonNotificationQueue({
  schedule: (callback, delay) => globalThis.setTimeout(() => {
    callback();
    renderCommonNotifications();
  }, delay),
});
let activeStartupDialogAction: {
  id: string;
  run: () => Promise<void>;
  retryNotification: CommonDialogNotification;
} | null = null;
let conditionNotificationSequence = 0;
const notificationView = bindCommonNotificationView({
  dialog: commonNotificationDialog,
  title: document.getElementById("common-notification-title") as HTMLElement,
  message: document.getElementById("common-notification-message") as HTMLElement,
  busy: document.getElementById("common-notification-busy") as HTMLElement,
  primary: document.getElementById("common-notification-primary") as HTMLButtonElement,
  toastRegion: document.getElementById("common-toast-region") as HTMLElement,
}, {
  onDialogPrimary: (id) => { void runActiveStartupDialogAction(id); },
  onToastDismiss: (id) => {
    notificationQueue.dismissToast(id);
    renderCommonNotifications();
  },
});
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
let activeDockingSharedState: DockingSharedState | null = null;
let activeControlStore: DockingBasicControlStore | null = null;
let activeDockingController: ActiveDockingLayoutController | null = null;
let pendingDockingSharedState: DockingSharedState | null = null;
let activePlacementDraft: LayoutPlacementEditSession | null = null;
let editRuntimeCoordinator: DockingEditRuntimeCoordinator | null = null;
let saveReevaluation: DockingSaveReevaluationSession | null = null;
let layoutEditTransactionConnection: LayoutEditTransactionConnection | null = null;
let activeBayEditSession: BayEditSession | null = null;
let activeBayEditTransaction: BayEditTransactionConnection | null = null;
let beginBayEditing: ((bayId: string) => void) | null = null;
let beginNewBayEditing: ((draft: NewBayDraft) => void) | null = null;
let newBayFactoryConnection: NewBayFactoryController | null = null;
const dragClickGuard = createPanelDragClickGuard();
const bayPickerDrag = bindBayPickerDrag(
  bayPicker,
  Object.values(dockingRailRoots),
  { isEnabled: () => activePlacementDraft !== null },
);
const bayRailDrop = bindBayRailInsertionDrop(
  dockingRailRoots,
  bayPickerDrag,
  ({ bayId, rail, index }) => {
    if (activePlacementDraft === null) return;
    const result = activePlacementDraft.moveToRailPosition(bayId, rail, index);
    if (result.status !== "moved") return;
    renderActivePlacementDraft();
  },
);
void bayRailDrop;
const layoutBayTrashConnection = bindLayoutBayTrash(
  layoutBayTrash,
  bayPicker,
  bayPickerDrag,
  {
    onUnplace: (bayId) => {
      if (activePlacementDraft === null) return;
      const result = activePlacementDraft.unplace(bayId);
      if (result.status !== "unplaced") return;
      renderActivePlacementDraft();
    },
  },
);

bayPicker.addEventListener("click", (event) => {
  const tag = (event.target as Element).closest<HTMLElement>(".bay-picker-tag");
  if (tag === null || activePlacementDraft === null) return;
  const bayId = tag.dataset.bayId;
  if (bayId === undefined) return;
  const measurements = measureBayAutoPlacementCandidate(
    dockingRailRoots,
    activePlacementDraft.documents(),
    bayId,
  );
  const result = activePlacementDraft.autoPlace(bayId, measurements);
  if (result.status !== "placed") return;
  renderActivePlacementDraft();
});

/** 配置ドラフト、4レール、ピッカー、編集バー状態を同じスナップショットへ同期する。 */
function renderActivePlacementDraft(): void {
  if (activePlacementDraft === null) return;
  editRuntimeCoordinator?.preview(activePlacementDraft.documents());
  renderBayPicker({
    root: bayPicker,
    unplaced: bayPickerUnplaced,
    placed: bayPickerPlaced,
  }, activePlacementDraft.picker());
  layoutEditTransactionConnection?.refresh();
}

/** ベイ工場の選択対象だけを4レール上でアウトライン表示する。 */
function highlightBayFactorySelection(bayId: string | null): void {
  for (const rail of Object.values(dockingRailRoots)) {
    for (const bay of rail.querySelectorAll<HTMLElement>(".dock-bay")) {
      bay.classList.toggle("dock-bay--factory-selected", bay.dataset.bayId === bayId);
    }
  }
}

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
}, [], {
  onSelectionChange: (bayId) => highlightBayFactorySelection(bayId),
  onOpen: (bayId) => beginBayEditing?.(bayId),
  hasUnsavedChanges: () => activeBayEditSession?.dirty ?? false,
  onDiscard: () => {
    activeBayEditSession?.discardChanges();
    activeBayEditTransaction?.refresh();
  },
  onClose: () => {
    activeBayEditTransaction?.disconnect();
    activeBayEditTransaction = null;
    activeBayEditSession = null;
    newBayFactoryConnection?.discard();
  },
});
let temporaryBaySequence = 1;
newBayFactoryConnection = bindNewBayFactory({
  add: bayFactoryAdd,
  dialog: bayFactoryDialog,
  name: bayFactoryName,
}, {
  createTemporaryId: () => `new-bay-session-${temporaryBaySequence++}`,
  render: (model) => renderBayFactoryEditor(bayFactoryEditor, model),
  onStartEditing: (draft) => beginNewBayEditing?.(draft),
});
renderChipToolSelector(chipToolList, CURRENT_DOCKING_CHIP_RECORDS.map((record) => ({
  chipType: record.chipType,
  kind: record.kind,
  label: record.displayName,
  description: `${record.displayName}をベイへ追加`,
})));
bindChipToolTooltip(
  chipToolList,
  chipToolTooltip,
  chipToolTooltipTitle,
  chipToolTooltipDescription,
);
bindChipToolBayDrag(chipToolList, bayFactoryEditor, (drop) => {
  activeBayEditTransaction?.handleToolDrop(drop);
});
bindBayFactoryChipDrag(bayFactoryEditor, (change) => {
  activeBayEditTransaction?.handleChipChange(change);
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

/** 評価済みDocking共有状態を既存メイン表示モデルへ原子的に反映する。 */
function applyDockingSharedState(state: DockingSharedState): void {
  activeDockingSharedState = structuredClone(state);
  visitStatusValue = state.filters.visitStatus;
  const standardSort = structuredClone(state.sort);
  fixedDisplayState = {
    query: state.query,
    filters: createVisitStatusFilters(state.filters.visitStatus),
    display: {
      movementMode: state.movementMode,
      sort: state.movementMode === "normal"
        ? standardSort
        : { axisId: "custom", direction: standardSort.direction },
      lastStandardSort: standardSort,
    },
    activeViewType: state.viewType,
  };
}

/** 基本control更新を検証済み共有ストアへ適用し、失敗を当該操作へ隔離する。 */
function updateDockingControl(chipType: string, value: unknown): boolean {
  if (activeControlStore === null) return false;
  try {
    activeControlStore.update({
      instanceId: `panel-${chipType}`,
      chipType,
      order: 1,
      settings: {},
    }, value);
    applyDockingSharedState(activeControlStore.getState());
    return true;
  } catch (error) {
    console.warn("docking control update failed:", { chipType, error });
    return false;
  }
}

/** 動的な移動モードチップから共有表示状態を更新する。 */
function setMovementMode(mode: MovementMode): void {
  if (!updateDockingControl("movement-mode", mode)) return;
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
  if (!updateDockingControl("search", nextQuery)) return;
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
}

/** 動的な訪問状態チップから共有フィルター状態を更新する。 */
function setVisitStatus(value: VisitStatusFilterValue): void {
  const previousMode = fixedDisplayState.display.movementMode;
  if (!updateDockingControl("visit-status", value)) return;
  if (fixedDisplayState.display.movementMode !== previousMode) syncMovementControls();
  redraw();
}

/** 動的な表示形式チップから共有ビュー状態を更新する。 */
function setViewType(viewType: ViewType): void {
  if (!updateDockingControl("view-type", viewType)) return;
  redraw();
}

/** 動的なソートチップから共有ソート軸を更新する。 */
function setSortAxis(axisId: StandardSortAxisId): void {
  if (!updateDockingControl("sort", {
    axisId,
    direction: fixedDisplayState.display.lastStandardSort.direction,
  })) return;
  syncMovementControls();
  redraw();
}

/** 動的なソートチップから共有ソート方向を反転する。 */
function toggleSortDirection(): void {
  const current = fixedDisplayState.display.lastStandardSort;
  if (!updateDockingControl("sort", {
    axisId: current.axisId,
    direction: current.direction === "asc" ? "desc" : "asc",
  })) return;
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
      query: activeDockingSharedState?.query ?? fixedDisplayState.query,
      visitStatus: activeDockingSharedState?.filters.visitStatus ?? visitStatusValue,
      folderHistory: {
        canGoBack: (folderHistory?.backDestination() ?? null) !== null,
        canGoForward: (folderHistory?.forwardDestination() ?? null) !== null,
        pending: folderNavigationPending,
      },
      sortAxis: activeDockingSharedState?.sort.axisId
        ?? fixedDisplayState.display.lastStandardSort.axisId,
      sortDirection: activeDockingSharedState?.sort.direction
        ?? fixedDisplayState.display.lastStandardSort.direction,
      sortDisabled: (activeDockingSharedState?.movementMode
        ?? fixedDisplayState.display.movementMode) !== "normal",
      viewType: activeDockingSharedState?.viewType ?? fixedDisplayState.activeViewType,
      movementMode: activeDockingSharedState?.movementMode
        ?? fixedDisplayState.display.movementMode,
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

/** レール内で複数ベイが増える軸を返す。ベイ内部のチップ方向とは独立している。 */
function dockingRailArrangementAxis(rail: RailId): "horizontal" | "vertical" {
  return rail === "top" || rail === "bottom" ? "vertical" : "horizontal";
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
      if (pendingDockingSharedState === null) {
        throw new Error("evaluated Docking shared state is required for layout rebuild");
      }
      activeControlStore?.disconnect();
      activeControlStore = null;
      activeDockingSharedState = null;
      const transient = createDockingTransientState(currentFolderGuid);
      fixedDisplayState = transient.fixedDisplayState;
      visitStatusValue = "all";
      folderHistory = transient.folderHistory;
      lastOfficialMove = transient.officialUndo;
      officialMovePending = transient.officialMovePending;
      folderNavigationPending = transient.folderNavigationPending;
      applyDockingSharedState(pendingDockingSharedState);
      activeControlStore = createDockingBasicControlStore(pendingDockingSharedState);
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
        applyDockingRailOverflow(rail, dockingRailArrangementAxis(railPlan.rail));
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

/** 通知キューの現在値を共通ダイアログとトーストへ同期する。 */
function renderCommonNotifications(): void {
  notificationView.render({
    dialog: notificationQueue.dialogSnapshot(),
    toasts: notificationQueue.toastSnapshot(),
  });
}

/** 起動ダイアログの主操作を保存ゲートとして実行し、失敗時は同じ操作を再試行可能にする。 */
async function runActiveStartupDialogAction(id: string): Promise<void> {
  const action = activeStartupDialogAction;
  if (action === null || action.id !== id || !notificationQueue.beginActiveDialogOperation(id)) {
    return;
  }
  renderCommonNotifications();
  try {
    await action.run();
  } catch (error) {
    console.warn("docking startup persistence failed:", error);
    notificationQueue.endActiveDialogOperation(id);
    notificationQueue.updateActiveDialog(action.retryNotification);
    renderCommonNotifications();
  }
}

/** 保存成功まで閉じない共通ダイアログを表示し、主操作の完了を待つ。 */
function presentStartupDialog(
  notification: CommonDialogNotification,
  retryNotification: CommonDialogNotification,
  operation: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    activeStartupDialogAction = {
      id: notification.id,
      retryNotification,
      run: async () => {
        await operation();
        notificationQueue.endActiveDialogOperation(notification.id);
        notificationQueue.completeActiveDialog(notification.id);
        activeStartupDialogAction = null;
        renderCommonNotifications();
        resolve();
      },
    };
    notificationQueue.enqueueDialog(notification);
    renderCommonNotifications();
  });
}

/** active文書をデフォルト状態からcondition評価し、失敗を警告へ隔離する。 */
function evaluatePanelDockingState(documents: DockingDocuments): DockingSharedState {
  const initial = createDefaultDockingSharedState(documents.dockingMetadata.activeLayoutId);
  const sequence = buildDockingChipApplicationOrder(documents);
  const evaluation = evaluateDockingSharedStateConditions(
    initial,
    sequence,
    BASIC_DOCKING_CONTROL_DEFINITIONS,
  );
  notifyDockingConditionFailures(evaluation.failures, documents, sequence);
  return structuredClone(evaluation.state) as DockingSharedState;
}

/** condition失敗を診断ログと利用者向け集約トーストへ同時に接続する。 */
function notifyDockingConditionFailures(
  failures: readonly DockingConditionFailure[],
  documents: DockingDocuments,
  sequence = buildDockingChipApplicationOrder(documents),
): void {
  if (failures.length === 0) return;
  conditionNotificationSequence += 1;
  const notification = createDockingConditionFailureNotification(
    `docking-condition-failure-${conditionNotificationSequence}`,
    failures,
    sequence,
    documents,
    PRODUCTION_DOCKING_CHIP_CATALOG,
  );
  if (notification === null) return;
  console.warn("docking condition evaluation failed:", notification.diagnostics);
  notificationQueue.enqueueToast(notification.toast);
  renderCommonNotifications();
}

/** 正常化済み文書と評価済み状態からactiveレイアウトを動的4レールへ再構築する。 */
function rebuildActiveDockingLayout(
  documents: DockingDocuments,
  evaluatedState = evaluatePanelDockingState(documents),
): void {
  if (currentFolderGuid === null) return;
  pendingDockingSharedState = structuredClone(evaluatedState);
  try {
    const plan = dockingLayoutController().rebuild(documents);
    root.dataset.activeLayoutId = plan.activeLayoutId;
  } finally {
    pendingDockingSharedState = null;
  }
}

async function main(): Promise<void> {
  try {
    const loadedDockingState = await loadPanelDockingState();
    let startupDocuments: DockingDocuments | null = null;
    await runPanelDockingStartup(
      loadedDockingState.normalization,
      PRODUCTION_DOCKING_CHIP_CATALOG,
      {
        saveDocuments: saveDockingDocuments,
        presentRecovery: (snapshot, save) => presentStartupDialog(
          createDockingRecoveryDialogNotification(snapshot),
          createDockingRecoveryDialogNotification(snapshot, true),
          save,
        ),
        presentDeprecated: (summary, save) => presentStartupDialog(
          createDeprecatedChipDialogNotification(summary),
          createDeprecatedChipDialogNotification(summary, true),
          save,
        ),
        startRuntime: (documents) => { startupDocuments = documents; },
      },
    );
    if (startupDocuments === null) throw new Error("Docking startup did not produce documents");
    const dockingState = buildPanelDockingState({
      ...loadedDockingState.normalization,
      documents: startupDocuments,
      changedDocuments: [],
    });
    bayFactoryConnection.replaceBays(dockingState.bays);
    // 後続の動的レール描画が同じactiveレイアウトを参照できる境界として保持する。
    root.dataset.activeLayoutId = dockingState.activeLayout.id;
    const layoutCoordinator = createLayoutManagementCoordinator(dockingState.documents);

    /** 保存済み基準を持つ編集runtime調停器を現在文書と評価状態で置き換える。 */
    const replaceEditRuntimeCoordinator = (
      documents: DockingDocuments,
      state: DockingSharedState,
    ): void => {
      editRuntimeCoordinator = createDockingEditRuntimeCoordinator(documents, state, {
        disconnectNormalRuntime: () => {
          activeDockingController?.disconnect();
          activeControlStore?.disconnect();
          activeControlStore = null;
          activeDockingSharedState = null;
        },
        renderPreview: (previewDocuments) => {
          renderBayPlacementPreviews(dockingRailRoots, previewDocuments);
        },
        connectNormalRuntime: (savedDocuments, savedState) => {
          rebuildActiveDockingLayout(savedDocuments, savedState);
        },
      });
    };

    const layoutEditMode = bindLayoutEditMode({
      root: frameRoot,
      entry: layoutEditEntry,
      unavailableReason: layoutEditUnavailable,
      editBar: layoutEditBar,
      layoutName: layoutEditName,
      exit: layoutEditExit,
      discardConfirmation: layoutEditDiscardConfirmation,
      continueEditing: layoutEditContinue,
      discardChanges: layoutEditDiscard,
      guardedControls: [
        layoutSelect,
        layoutDefault,
        layoutManage,
        bayFactoryAdd,
        bayFactoryEntry,
      ],
      guardedRegions: [
        document.getElementById("docking-center") as HTMLElement,
        bayFactorySelection,
      ],
    }, dockingState.documents, {
      initiallyReady: false,
      hasUnsavedChanges: () => activePlacementDraft?.dirty === true,
      onEnter: (documents) => {
        activePlacementDraft = createLayoutPlacementEditSession(documents);
        editRuntimeCoordinator?.enter(documents);
        const reevaluationInitial = editRuntimeCoordinator?.getSavedState()
          ?? evaluatePanelDockingState(documents);
        saveReevaluation = createDockingSaveReevaluationSession(
          reevaluationInitial,
          BASIC_DOCKING_CONTROL_DEFINITIONS,
        );
        const placementDraft = activePlacementDraft;
        let managementOperationPending = false;
        layoutEditTransactionConnection = bindLayoutEditTransaction({
          get dirty() { return placementDraft.dirty; },
          get canUndo() { return placementDraft.canUndo; },
          get canRedo() { return placementDraft.canRedo; },
          get saving() { return placementDraft.saving || managementOperationPending; },
          get retryPending() { return placementDraft.pendingRetry || layoutCoordinator.pending; },
          undo: () => placementDraft.undo(),
          redo: () => placementDraft.redo(),
        }, {
          undo: layoutEditUndo,
          redo: layoutEditRedo,
          save: layoutEditSave,
          delete: layoutEditDelete,
          exit: layoutEditExit,
          unsaved: layoutEditUnsaved,
        }, {
          onStateChange: renderActivePlacementDraft,
          onSave: () => { void savePlacementDraft(false); },
          onDelete: () => { void deleteActiveLayout(); },
        });
        layoutEditRetry.onclick = () => { void savePlacementDraft(true); };
        layoutEditRetry.hidden = true;
        layoutEditStatus.textContent = "";
        renderActivePlacementDraft();
        bayPicker.hidden = false;

        /** 現在候補の初回保存または失敗候補の明示再試行を実行する。 */
        async function savePlacementDraft(retry: boolean): Promise<void> {
          bayPickerDrag.cancel();
          layoutBayTrashConnection.clear();
          bayPicker.inert = true;
          for (const rail of Object.values(dockingRailRoots)) rail.inert = true;
          layoutEditRetry.disabled = true;
          layoutEditStatus.textContent = "保存中…";
          const request = retry ? placementDraft.retry() : placementDraft.save();
          layoutEditTransactionConnection?.refresh();
          try {
            if (saveReevaluation === null) throw new Error("save reevaluation is unavailable");
            const reevaluated = await saveReevaluation.run(() => request);
            if (reevaluated.warnings.length > 0) {
              console.warn("storage reload failed after Docking save:", reevaluated.warnings);
            }
            if (reevaluated.conditionFailures.length > 0) {
              notifyDockingConditionFailures(
                reevaluated.conditionFailures,
                reevaluated.documents,
              );
            }
            layoutCoordinator.replaceState(reevaluated.documents);
            layoutEditMode.commitDocuments(reevaluated.documents);
            editRuntimeCoordinator?.commit(reevaluated);
            layoutEditRetry.hidden = true;
            layoutEditStatus.textContent = "保存しました";
            renderActivePlacementDraft();
          } catch {
            layoutEditRetry.hidden = !placementDraft.pendingRetry;
            layoutEditStatus.textContent = "保存に失敗しました";
          } finally {
            bayPicker.inert = placementDraft.pendingRetry;
            for (const rail of Object.values(dockingRailRoots)) {
              rail.inert = placementDraft.pendingRetry;
            }
            layoutEditRetry.disabled = false;
            layoutEditTransactionConnection?.refresh();
          }
        }

        /** 既存の名前付きレイアウト削除・復元規則でactiveレイアウトを削除する。 */
        async function deleteActiveLayout(retry = false): Promise<void> {
          managementOperationPending = true;
          bayPickerDrag.cancel();
          layoutBayTrashConnection.clear();
          bayPicker.inert = true;
          for (const rail of Object.values(dockingRailRoots)) rail.inert = true;
          layoutEditRetry.disabled = true;
          layoutEditStatus.textContent = "削除中…";
          layoutEditTransactionConnection?.refresh();
          try {
            const activeLayoutId = placementDraft.documents().dockingMetadata.activeLayoutId;
            const deletedDocuments = retry
              ? await layoutCoordinator.retry()
              : await layoutCoordinator.delete(activeLayoutId);
            const deletedState = evaluatePanelDockingState(deletedDocuments);
            editRuntimeCoordinator?.commit({
              documents: deletedDocuments,
              state: deletedState,
              warnings: [],
              conditionFailures: [],
            });
            layoutManagementConnection.replaceDocuments(deletedDocuments);
            root.dataset.activeLayoutId = deletedDocuments.dockingMetadata.activeLayoutId;
            layoutEditStatus.textContent = "レイアウトを削除しました";
            layoutEditMode.finishWithDocuments(deletedDocuments);
          } catch {
            layoutEditRetry.hidden = !layoutCoordinator.pending;
            layoutEditRetry.onclick = () => { void deleteActiveLayout(true); };
            layoutEditStatus.textContent = "削除に失敗しました";
          } finally {
            managementOperationPending = false;
            bayPicker.inert = layoutCoordinator.pending;
            for (const rail of Object.values(dockingRailRoots)) {
              rail.inert = layoutCoordinator.pending;
            }
            layoutEditRetry.disabled = false;
            layoutEditTransactionConnection?.refresh();
          }
        }
      },
      onExit: (_documents) => {
        if (layoutCoordinator.pending) {
          layoutManagementConnection.showPendingRetry("削除の保存を再試行してください");
        }
        bayRailDrop.clear();
        layoutBayTrashConnection.clear();
        bayPickerDrag.cancel();
        layoutEditTransactionConnection?.disconnect();
        layoutEditTransactionConnection = null;
        layoutEditRetry.onclick = null;
        bayPicker.inert = false;
        for (const rail of Object.values(dockingRailRoots)) rail.inert = false;
        activePlacementDraft?.discard();
        activePlacementDraft = null;
        saveReevaluation = null;
        bayPicker.hidden = true;
        editRuntimeCoordinator?.exit();
      },
    });
    beginBayEditing = (bayId): void => {
      activeBayEditTransaction?.disconnect();
      const session = createBayEditSession(
        layoutCoordinator.state().bayConfigurations,
        bayId,
        {
          saveDocument: async (bayConfigurations) => {
            await saveDockingDocuments({ bayConfigurations });
            const documents = { ...layoutCoordinator.state(), bayConfigurations };
            layoutCoordinator.replaceState(documents);
            layoutEditMode.replaceDocuments(documents);
            bayFactoryConnection.replaceBays(buildPanelBayModels(documents));
            const evaluatedState = evaluatePanelDockingState(documents);
            rebuildActiveDockingLayout(documents, evaluatedState);
            replaceEditRuntimeCoordinator(documents, evaluatedState);
          },
        },
      );
      activeBayEditSession = session;
      activeBayEditTransaction = bindBayEditTransaction(session, {
        undo: bayFactoryUndo,
        redo: bayFactoryRedo,
        save: bayFactorySave,
        name: bayFactoryName,
        duplicate: bayFactoryDuplicate,
        delete: bayFactoryDelete,
      }, {
        chipLabels: new Map(
          CURRENT_DOCKING_CHIP_RECORDS.map(({ chipType, displayName }) => [chipType, displayName]),
        ),
        render: (model) => renderBayFactoryEditor(bayFactoryEditor, model),
      });
    };
    beginNewBayEditing = (draft): void => {
      activeBayEditTransaction?.disconnect();
      const current = layoutCoordinator.state();
      const temporaryBayConfigurations = structuredClone(current.bayConfigurations);
      temporaryBayConfigurations.bays.push({
        id: draft.temporaryId,
        name: draft.name,
        permanent: false,
        chips: [],
      });
      let formalBayId: string | null = null;
      const session = createBayEditSession(
        temporaryBayConfigurations,
        draft.temporaryId,
        {
          saveDocument: async (editedTemporaryBayConfigurations) => {
            const latest = layoutCoordinator.state();
            const saved = await saveNewBayConfiguration(
              latest,
              editedTemporaryBayConfigurations,
              draft.temporaryId,
              latest.dockingMetadata.activeLayoutId,
            );
            formalBayId = saved.bay.id;
            const documents = { ...latest, ...saved.documents };
            layoutCoordinator.replaceState(documents);
            layoutEditMode.replaceDocuments(documents);
            bayFactoryConnection.replaceBays(buildPanelBayModels(documents));
            const evaluatedState = evaluatePanelDockingState(documents);
            rebuildActiveDockingLayout(documents, evaluatedState);
            replaceEditRuntimeCoordinator(documents, evaluatedState);
          },
        },
      );
      activeBayEditSession = session;
      activeBayEditTransaction = bindBayEditTransaction(session, {
        undo: bayFactoryUndo,
        redo: bayFactoryRedo,
        save: bayFactorySave,
        name: bayFactoryName,
        duplicate: bayFactoryDuplicate,
        delete: bayFactoryDelete,
      }, {
        chipLabels: new Map(
          CURRENT_DOCKING_CHIP_RECORDS.map(({ chipType, displayName }) => [chipType, displayName]),
        ),
        render: (model) => renderBayFactoryEditor(bayFactoryEditor, model),
        onSaved: () => {
          if (formalBayId !== null) beginBayEditing?.(formalBayId);
        },
      });
    };
    const layoutManagementConnection = bindLayoutManagement({
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
        layoutEditMode.replaceDocuments(documents);
        root.dataset.activeLayoutId = documents.dockingMetadata.activeLayoutId;
        bayFactoryConnection.replaceBays(buildPanelBayModels(documents));
        const evaluatedState = evaluatePanelDockingState(documents);
        rebuildActiveDockingLayout(documents, evaluatedState);
        replaceEditRuntimeCoordinator(documents, evaluatedState);
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
    const initialDockingState = evaluatePanelDockingState(dockingState.documents);
    rebuildActiveDockingLayout(dockingState.documents, initialDockingState);
    replaceEditRuntimeCoordinator(dockingState.documents, initialDockingState);
    layoutEditMode.setReady();
    redraw();
  } catch (error) {
    showLoadError(error);
  }
}

main();
