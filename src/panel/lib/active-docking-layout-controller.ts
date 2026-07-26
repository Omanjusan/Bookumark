import { INITIAL_FIXED_DISPLAY_STATE } from "./fixed-display-controller.js";
import type { FixedDisplayState } from "./fixed-display-controller.js";
import { createFolderNavigationHistory } from "./folder-navigation-history.js";
import type { FolderNavigationHistory } from "./folder-navigation-history.js";
import { buildDockingRailDrawingPlan } from "./docking-rail-drawing-plan.js";
import type { DockingRailDrawingPlan } from "./docking-rail-drawing-plan.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

export interface DockingTransientState {
  readonly fixedDisplayState: FixedDisplayState;
  readonly folderHistory: FolderNavigationHistory;
  readonly officialUndo: null;
  readonly officialMovePending: false;
  readonly folderNavigationPending: false;
  readonly dragSession: null;
  readonly saving: false;
}

export interface ActiveDockingRenderConnection {
  disconnect(): void;
}

interface ActiveDockingLayoutControllerOptions {
  clearDynamicRails(): void;
  resetTransientState(): void;
  render(plan: DockingRailDrawingPlan): ActiveDockingRenderConnection;
}

export interface ActiveDockingLayoutController {
  readonly activeLayoutId: string | null;
  rebuild(documents: DockingDocuments): DockingRailDrawingPlan;
  disconnect(): void;
}

/** レイアウト切替時に破棄する一時UI状態を、現在フォルダを起点として初期化する。 */
export function createDockingTransientState(
  currentFolderGuid: string,
): DockingTransientState {
  return {
    fixedDisplayState: structuredClone(INITIAL_FIXED_DISPLAY_STATE),
    folderHistory: createFolderNavigationHistory(currentFolderGuid),
    officialUndo: null,
    officialMovePending: false,
    folderNavigationPending: false,
    dragSession: null,
    saving: false,
  };
}

/** activeレイアウト変更を旧接続破棄、一時状態初期化、新計画描画の順で適用する。 */
export function createActiveDockingLayoutController(
  options: ActiveDockingLayoutControllerOptions,
): ActiveDockingLayoutController {
  let connection: ActiveDockingRenderConnection | null = null;
  let activeLayoutId: string | null = null;

  const clearCurrent = (): void => {
    if (connection === null && activeLayoutId === null) return;
    connection?.disconnect();
    connection = null;
    activeLayoutId = null;
    options.clearDynamicRails();
  };

  return {
    get activeLayoutId(): string | null {
      return activeLayoutId;
    },
    rebuild(documents): DockingRailDrawingPlan {
      const hadCurrent = connection !== null || activeLayoutId !== null;
      clearCurrent();
      // 初回構築にも固定DOMを避けて動的レール領域だけを空にする。
      if (!hadCurrent) options.clearDynamicRails();
      options.resetTransientState();
      const plan = buildDockingRailDrawingPlan(documents);
      connection = options.render(plan);
      activeLayoutId = plan.activeLayoutId;
      return structuredClone(plan);
    },
    disconnect(): void {
      clearCurrent();
    },
  };
}
