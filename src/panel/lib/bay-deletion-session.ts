import { planBayDeletion } from "./bay-management.js";
import type { BayDeletionPlan } from "./bay-management.js";
import type { NewBaySaveDocuments } from "./new-bay-save.js";
import { saveDockingDocuments } from "./docking-storage.js";

interface BayDeletionOptions {
  readonly saveDocuments?: (documents: NewBaySaveDocuments) => Promise<void>;
}

export interface BayDeletionSaveResult {
  readonly bayId: string;
  readonly documents: NewBaySaveDocuments;
}

export interface BayDeletionSession {
  readonly pending: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saving: boolean;
  readonly deleted: boolean;
  plan(): BayDeletionPlan;
  currentPlan(): BayDeletionPlan | null;
  undo(): boolean;
  redo(): boolean;
  save(): Promise<BayDeletionSaveResult>;
}

/** 1ユーザーベイの完全削除予定とUndo・Redo状態を管理する。 */
export function createBayDeletionSession(
  documents: NewBaySaveDocuments,
  bayId: string,
  options: BayDeletionOptions = {},
): BayDeletionSession {
  const baseDocuments = structuredClone(documents);
  const source = baseDocuments.bayConfigurations.bays.find((bay) => bay.id === bayId);
  if (source === undefined) throw new Error(`bay was not found: ${bayId}`);
  const deletionPlan = planBayDeletion(source, baseDocuments.mainLayouts.layouts);
  let pending = false;
  let redoAvailable = false;
  let saving = false;
  let deleted = false;

  /** 保存中または削除完了後の予定・履歴操作を拒否する。 */
  const assertMutable = (): void => {
    if (saving) throw new Error("deletion save is in progress");
    if (deleted) throw new Error("bay is already deleted");
  };

  /** 完全削除を保存前の予定状態にする。 */
  const plan = (): BayDeletionPlan => {
    assertMutable();
    if (!pending) {
      pending = true;
      redoAvailable = false;
    }
    return structuredClone(deletionPlan);
  };

  /** 削除予定を取り消す。 */
  const undo = (): boolean => {
    assertMutable();
    if (!pending) return false;
    pending = false;
    redoAvailable = true;
    return true;
  };

  /** 取り消した削除予定を復元する。 */
  const redo = (): boolean => {
    assertMutable();
    if (!redoAvailable) return false;
    pending = true;
    redoAvailable = false;
    return true;
  };

  /** 対象ベイと全配置参照を除去した2文書を1回で保存する。 */
  const save = async (): Promise<BayDeletionSaveResult> => {
    if (saving) throw new Error("deletion save is already in progress");
    if (deleted) throw new Error("bay is already deleted");
    if (!pending) throw new Error("deletion is not pending");

    const candidate = structuredClone(baseDocuments);
    candidate.bayConfigurations.bays = candidate.bayConfigurations.bays
      .filter((bay) => bay.id !== bayId);
    for (const layout of candidate.mainLayouts.layouts) {
      layout.placements = layout.placements.filter((placement) => placement.bayId !== bayId);
      normalizePlacementOrders(layout.placements);
    }

    saving = true;
    try {
      const persist = options.saveDocuments
        ?? ((patch: NewBaySaveDocuments) => saveDockingDocuments(patch));
      await persist(structuredClone(candidate));
      pending = false;
      redoAvailable = false;
      deleted = true;
      return { bayId, documents: structuredClone(candidate) };
    } finally {
      saving = false;
    }
  };

  return {
    get pending(): boolean { return pending; },
    get canUndo(): boolean { return pending; },
    get canRedo(): boolean { return redoAvailable; },
    get saving(): boolean { return saving; },
    get deleted(): boolean { return deleted; },
    plan,
    /** 予定中だけ外側と状態共有しない削除計画を返す。 */
    currentPlan: (): BayDeletionPlan | null => pending ? structuredClone(deletionPlan) : null,
    undo,
    redo,
    save,
  };
}

/** 参照削除後の各レール内orderを1始まりの連続値へ戻す。 */
function normalizePlacementOrders(
  placements: NewBaySaveDocuments["mainLayouts"]["layouts"][number]["placements"],
): void {
  for (const rail of ["top", "left", "right", "bottom"] as const) {
    let order = 1;
    for (const placement of placements) {
      if (placement.rail === rail) placement.order = order++;
    }
  }
}
