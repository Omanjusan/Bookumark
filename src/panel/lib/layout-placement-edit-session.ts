import {
  createBayPlacementDraft,
} from "./bay-placement-draft.js";
import type {
  BayAutoPlacementMeasurements,
  BayAutoPlacementResult,
  BayRailEndPlacementResult,
  BayRailPositionResult,
  BayUnplacementResult,
} from "./bay-placement-draft.js";
import type { BayPickerModel } from "./bay-picker-model.js";
import { createLayoutSaveSession } from "./layout-save-session.js";
import type { DockingDocuments, RailId } from "./docking-persistence-model.js";

type DockingDocumentsPatch = Partial<DockingDocuments>;

interface LayoutPlacementEditSessionOptions {
  readonly saveDocuments?: (documents: DockingDocumentsPatch) => Promise<void>;
}

export interface LayoutPlacementEditSession {
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saving: boolean;
  readonly pendingRetry: boolean;
  documents(): DockingDocuments;
  picker(): BayPickerModel;
  retryCandidate(): DockingDocumentsPatch | null;
  autoPlace(bayId: string, measurements: BayAutoPlacementMeasurements): BayAutoPlacementResult;
  moveToRailEnd(bayId: string, rail: RailId): BayRailEndPlacementResult;
  moveToRailPosition(bayId: string, rail: RailId, index: number): BayRailPositionResult;
  unplace(bayId: string): BayUnplacementResult;
  undo(): boolean;
  redo(): boolean;
  discard(): void;
  save(): Promise<DockingDocuments>;
  retry(): Promise<DockingDocuments>;
}

/** 配置ドラフトをメインレイアウト文書だけの保存・再試行セッションへ接続する。 */
export function createLayoutPlacementEditSession(
  documents: DockingDocuments,
  options: LayoutPlacementEditSessionOptions = {},
): LayoutPlacementEditSession {
  const draft = createBayPlacementDraft(documents);
  const saveSession = createLayoutSaveSession(documents, options);

  /** 保存中にドラフトと履歴を分岐させる同期操作を拒否する。 */
  function assertNotSaving(): void {
    if (saveSession.saving) throw new Error("save is in progress");
  }

  /** ステージ済み候補を保存し、成功時だけ現在ドラフトを新しい基準にする。 */
  async function persistPending(): Promise<DockingDocuments> {
    const committed = await saveSession.save();
    draft.markSaved();
    return committed;
  }

  return {
    get dirty(): boolean { return draft.dirty; },
    get canUndo(): boolean { return draft.canUndo; },
    get canRedo(): boolean { return draft.canRedo; },
    get saving(): boolean { return saveSession.saving; },
    get pendingRetry(): boolean { return saveSession.pending; },
    documents: () => draft.documents(),
    picker: () => draft.picker(),
    retryCandidate: () => saveSession.stagedDocuments(),
    autoPlace(bayId, measurements) {
      assertNotSaving();
      return draft.autoPlace(bayId, measurements);
    },
    moveToRailEnd(bayId, rail) {
      assertNotSaving();
      return draft.moveToRailEnd(bayId, rail);
    },
    moveToRailPosition(bayId, rail, index) {
      assertNotSaving();
      return draft.moveToRailPosition(bayId, rail, index);
    },
    unplace(bayId) {
      assertNotSaving();
      return draft.unplace(bayId);
    },
    undo() {
      assertNotSaving();
      return draft.undo();
    },
    redo() {
      assertNotSaving();
      return draft.redo();
    },
    discard(): void {
      assertNotSaving();
      draft.discard();
    },
    async save(): Promise<DockingDocuments> {
      if (saveSession.saving) throw new Error("save is already in progress");
      if (saveSession.pending) throw new Error("failed layout save must be retried");
      if (!draft.dirty) return saveSession.committedDocuments();
      saveSession.stage({ mainLayouts: draft.documents().mainLayouts });
      return persistPending();
    },
    async retry(): Promise<DockingDocuments> {
      if (saveSession.saving) throw new Error("save is already in progress");
      return persistPending();
    },
  };
}
