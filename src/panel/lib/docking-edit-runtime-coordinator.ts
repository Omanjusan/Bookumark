import type { DockingDocuments } from "./docking-persistence-model.js";
import type { DockingSaveReevaluationResult } from "./docking-save-reevaluation-session.js";
import type { DockingSharedState } from "./docking-shared-state.js";

interface DockingEditRuntimeCoordinatorOptions {
  disconnectNormalRuntime(): void;
  renderPreview(documents: DockingDocuments): void;
  connectNormalRuntime(documents: DockingDocuments, state: DockingSharedState): void;
}

export interface DockingEditRuntimeCoordinator {
  readonly editing: boolean;
  readonly previewLayoutId: string | null;
  getSavedDocuments(): DockingDocuments;
  getSavedState(): DockingSharedState;
  enter(documents: DockingDocuments, layoutId?: string): void;
  preview(documents: DockingDocuments, layoutId?: string): void;
  commit(result: DockingSaveReevaluationResult): void;
  exit(): void;
}

/** 編集プレビューと通常runtime接続を分離し、終了時だけ保存済み基準へ再接続する。 */
export function createDockingEditRuntimeCoordinator(
  initialDocuments: DockingDocuments,
  initialState: DockingSharedState,
  options: DockingEditRuntimeCoordinatorOptions,
): DockingEditRuntimeCoordinator {
  assertMatchingActiveLayout(initialDocuments, initialState);
  let savedDocuments = structuredClone(initialDocuments);
  let savedState = structuredClone(initialState);
  let editing = false;
  let previewLayoutId: string | null = null;

  /** 指定レイアウトをactiveとして投影したコピーだけをプレビューへ渡す。 */
  const renderPreview = (documents: DockingDocuments, layoutId: string): void => {
    if (!documents.mainLayouts.layouts.some(({ id }) => id === layoutId)) {
      throw new Error(`preview layout was not found: ${layoutId}`);
    }
    const projected = structuredClone(documents);
    projected.dockingMetadata.activeLayoutId = layoutId;
    options.renderPreview(projected);
    previewLayoutId = layoutId;
  };

  return {
    get editing(): boolean { return editing; },
    get previewLayoutId(): string | null { return previewLayoutId; },
    getSavedDocuments(): DockingDocuments {
      return structuredClone(savedDocuments);
    },
    getSavedState(): DockingSharedState {
      return structuredClone(savedState);
    },
    enter(documents, layoutId = documents.dockingMetadata.activeLayoutId): void {
      if (editing) return;
      options.disconnectNormalRuntime();
      editing = true;
      renderPreview(documents, layoutId);
    },
    preview(documents, layoutId = documents.dockingMetadata.activeLayoutId): void {
      if (!editing) throw new Error("layout edit runtime is not active");
      renderPreview(documents, layoutId);
    },
    commit(result): void {
      if (!editing) throw new Error("layout edit runtime is not active");
      assertMatchingActiveLayout(result.documents, result.state);
      // 現在のプレビューDOMと対象IDは維持し、保存済み終了基準だけを更新する。
      savedDocuments = structuredClone(result.documents);
      savedState = structuredClone(result.state);
    },
    exit(): void {
      if (!editing) return;
      editing = false;
      previewLayoutId = null;
      options.connectNormalRuntime(
        structuredClone(savedDocuments),
        structuredClone(savedState),
      );
    },
  };
}

/** 保存文書と評価済み共有状態が同じactiveレイアウトを参照することを保証する。 */
function assertMatchingActiveLayout(
  documents: DockingDocuments,
  state: DockingSharedState,
): void {
  if (documents.dockingMetadata.activeLayoutId !== state.activeLayoutId) {
    throw new Error("Docking documents and shared state have different active layouts");
  }
}
