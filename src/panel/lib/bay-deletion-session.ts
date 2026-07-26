import { planBayDeletion } from "./bay-management.js";
import type { BayDeletionPlan } from "./bay-management.js";
import type { NewBaySaveDocuments } from "./new-bay-save.js";

export interface BayDeletionSession {
  readonly pending: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  plan(): BayDeletionPlan;
  currentPlan(): BayDeletionPlan | null;
  undo(): boolean;
  redo(): boolean;
}

/** 1ユーザーベイの完全削除予定とUndo・Redo状態を管理する。 */
export function createBayDeletionSession(
  documents: NewBaySaveDocuments,
  bayId: string,
): BayDeletionSession {
  const source = documents.bayConfigurations.bays.find((bay) => bay.id === bayId);
  if (source === undefined) throw new Error(`bay was not found: ${bayId}`);
  const deletionPlan = planBayDeletion(source, documents.mainLayouts.layouts);
  let pending = false;
  let redoAvailable = false;

  /** 完全削除を保存前の予定状態にする。 */
  const plan = (): BayDeletionPlan => {
    if (!pending) {
      pending = true;
      redoAvailable = false;
    }
    return structuredClone(deletionPlan);
  };

  /** 削除予定を取り消す。 */
  const undo = (): boolean => {
    if (!pending) return false;
    pending = false;
    redoAvailable = true;
    return true;
  };

  /** 取り消した削除予定を復元する。 */
  const redo = (): boolean => {
    if (!redoAvailable) return false;
    pending = true;
    redoAvailable = false;
    return true;
  };

  return {
    get pending(): boolean { return pending; },
    get canUndo(): boolean { return pending; },
    get canRedo(): boolean { return redoAvailable; },
    plan,
    /** 予定中だけ外側と状態共有しない削除計画を返す。 */
    currentPlan: (): BayDeletionPlan | null => pending ? structuredClone(deletionPlan) : null,
    undo,
    redo,
  };
}
