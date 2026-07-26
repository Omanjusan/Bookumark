import type {
  BayConfiguration,
  BayConfigurationsDocument,
} from "./docking-persistence-model.js";

export interface BayEditSession {
  readonly bayId: string;
  readonly dirty: boolean;
  savedBay(): BayConfiguration;
  draftBay(): BayConfiguration;
}

/** 保存済みベイと独立した初期ドラフトを持つ編集セッションを開始する。 */
export function createBayEditSession(
  document: BayConfigurationsDocument,
  bayId: string,
): BayEditSession {
  const sourceBay = document.bays.find((bay) => bay.id === bayId);
  if (sourceBay === undefined) {
    throw new Error(`editable bay was not found: ${bayId}`);
  }
  if (sourceBay.permanent) {
    throw new Error(`permanent bay cannot be edited: ${bayId}`);
  }

  // 保存基準とドラフトを別々に複製し、原本や返却値からの変更を遮断する。
  const saved = structuredClone(sourceBay);
  const draft = structuredClone(sourceBay);
  return {
    bayId,
    dirty: false,
    /** 最後に保存されたベイの変更可能なスナップショットを返す。 */
    savedBay: (): BayConfiguration => structuredClone(saved),
    /** 現在の編集ドラフトの変更可能なスナップショットを返す。 */
    draftBay: (): BayConfiguration => structuredClone(draft),
  };
}
