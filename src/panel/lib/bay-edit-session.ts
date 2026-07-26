import type {
  BayConfiguration,
  BayConfigurationsDocument,
  JsonObject,
} from "./docking-persistence-model.js";
import { issueChipId } from "./docking-persistence-model.js";
import { saveBayConfigurations } from "./docking-storage.js";

export interface BayEditSession {
  readonly bayId: string;
  readonly dirty: boolean;
  readonly nextChipSequence: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saving: boolean;
  savedBay(): BayConfiguration;
  draftBay(): BayConfiguration;
  addChip(chipType: string, index: number): string;
  deleteChip(instanceId: string): void;
  reorderChip(instanceId: string, index: number): boolean;
  updateChipSettings(instanceId: string, settings: JsonObject): void;
  undo(): boolean;
  redo(): boolean;
  markSaved(): void;
  discardChanges(): void;
  save(): Promise<void>;
}

interface BayEditSessionOptions {
  readonly createInitialSettings?: (chipType: string) => JsonObject;
  readonly saveDocument?: (document: BayConfigurationsDocument) => Promise<void>;
}

/** 保存済みベイと独立した初期ドラフトを持つ編集セッションを開始する。 */
export function createBayEditSession(
  document: BayConfigurationsDocument,
  bayId: string,
  options: BayEditSessionOptions = {},
): BayEditSession {
  const sourceBay = document.bays.find((bay) => bay.id === bayId);
  if (sourceBay === undefined) {
    throw new Error(`editable bay was not found: ${bayId}`);
  }
  if (sourceBay.permanent) {
    throw new Error(`permanent bay cannot be edited: ${bayId}`);
  }

  // 保存基準とドラフトを別々に複製し、原本や返却値からの変更を遮断する。
  let saved = structuredClone(sourceBay);
  let draft = structuredClone(sourceBay);
  let baseDocument = structuredClone(document);
  let nextChipSequence = document.nextChipSequence;
  let dirty = false;
  let saving = false;
  const undoStack: BayConfiguration[] = [];
  const redoStack: BayConfiguration[] = [];

  /** 次のドラフトを1操作として確定し、Redo分岐を破棄する。 */
  const commitMutation = (nextDraft: BayConfiguration): void => {
    undoStack.push(structuredClone(draft));
    draft = structuredClone(nextDraft);
    redoStack.length = 0;
    dirty = !sameBay(draft, saved);
  };

  /** 指定位置へ新しいチップインスタンスを追加し、発行したIDを返す。 */
  const addChip = (chipType: string, index: number): string => {
    assertNotSaving();
    if (chipType.trim() === "") {
      throw new TypeError("chipType must not be empty");
    }
    if (!Number.isInteger(index) || index < 0 || index > draft.chips.length) {
      throw new RangeError("index must be an insertion boundary in the draft");
    }

    // 生成処理を先に完了させ、失敗時に採番やドラフトを部分変更しない。
    const settings = structuredClone(options.createInitialSettings?.(chipType) ?? {});
    const issued = issueChipId(nextChipSequence);
    const nextDraft = structuredClone(draft);
    nextDraft.chips.splice(index, 0, {
      instanceId: issued.id,
      chipType,
      order: index + 1,
      settings,
    });
    nextDraft.chips.forEach((chip, chipIndex) => {
      chip.order = chipIndex + 1;
    });

    commitMutation(nextDraft);
    nextChipSequence = issued.nextSequence;
    return issued.id;
  };

  /** 指定したチップをドラフトから削除し、残ったorderを正規化する。 */
  const deleteChip = (instanceId: string): void => {
    assertNotSaving();
    const sourceIndex = chipIndex(draft, instanceId);
    const nextDraft = structuredClone(draft);
    nextDraft.chips.splice(sourceIndex, 1);
    normalizeChipOrder(nextDraft.chips);
    commitMutation(nextDraft);
  };

  /** 移動元を除いた後の最終添字へチップを移し、変更の有無を返す。 */
  const reorderChip = (instanceId: string, index: number): boolean => {
    assertNotSaving();
    const sourceIndex = chipIndex(draft, instanceId);
    if (!Number.isInteger(index) || index < 0 || index >= draft.chips.length) {
      throw new RangeError("index must be a chip position in the draft");
    }
    if (sourceIndex === index) return false;

    const nextDraft = structuredClone(draft);
    const [moved] = nextDraft.chips.splice(sourceIndex, 1);
    nextDraft.chips.splice(index, 0, moved);
    normalizeChipOrder(nextDraft.chips);
    commitMutation(nextDraft);
    return true;
  };

  /** 指定したチップの設定を呼び出し元と共有しない値へ置き換える。 */
  const updateChipSettings = (instanceId: string, settings: JsonObject): void => {
    assertNotSaving();
    const index = chipIndex(draft, instanceId);
    const nextSettings = structuredClone(settings);
    const nextDraft = structuredClone(draft);
    nextDraft.chips[index].settings = nextSettings;
    commitMutation(nextDraft);
  };

  /** 直前の操作を戻し、保存境界では変更なしを返す。 */
  const undo = (): boolean => {
    assertNotSaving();
    const previous = undoStack.pop();
    if (previous === undefined) return false;
    redoStack.push(structuredClone(draft));
    draft = previous;
    dirty = !sameBay(draft, saved);
    return true;
  };

  /** Undoした操作を同じチップIDを含む状態として再適用する。 */
  const redo = (): boolean => {
    assertNotSaving();
    const next = redoStack.pop();
    if (next === undefined) return false;
    undoStack.push(structuredClone(draft));
    draft = next;
    dirty = !sameBay(draft, saved);
    return true;
  };

  /** 現在のドラフトを新しい保存基準とし、それ以前の履歴を破棄する。 */
  const applySavedBoundary = (): void => {
    saved = structuredClone(draft);
    undoStack.length = 0;
    redoStack.length = 0;
    dirty = false;
  };

  /** 現在のドラフトを外部保存なしで新しい保存境界にする。 */
  const markSaved = (): void => {
    assertNotSaving();
    applySavedBoundary();
  };

  /** 未保存変更と履歴を破棄し、最後の保存成功状態へ戻す。 */
  const discardChanges = (): void => {
    assertNotSaving();
    draft = structuredClone(saved);
    undoStack.length = 0;
    redoStack.length = 0;
    dirty = false;
  };

  /** 対象ベイと採番値だけを反映したベイ文書を保存する。 */
  const save = async (): Promise<void> => {
    if (saving) throw new Error("save is already in progress");
    if (!dirty) return;

    const candidate = structuredClone(baseDocument);
    const targetIndex = candidate.bays.findIndex((bay) => bay.id === bayId);
    if (targetIndex < 0) throw new Error(`editable bay was not found: ${bayId}`);
    candidate.bays[targetIndex] = structuredClone(draft);
    candidate.nextChipSequence = nextChipSequence;

    saving = true;
    try {
      const persist = options.saveDocument ?? saveBayConfigurations;
      await persist(structuredClone(candidate));
      baseDocument = candidate;
      applySavedBoundary();
    } finally {
      saving = false;
    }
  };

  /** 保存中に編集状態が分岐しないよう同期操作を拒否する。 */
  function assertNotSaving(): void {
    if (saving) throw new Error("save is in progress");
  }

  return {
    bayId,
    get dirty(): boolean {
      return dirty;
    },
    get nextChipSequence(): number {
      return nextChipSequence;
    },
    get canUndo(): boolean {
      return undoStack.length > 0;
    },
    get canRedo(): boolean {
      return redoStack.length > 0;
    },
    get saving(): boolean {
      return saving;
    },
    /** 最後に保存されたベイの変更可能なスナップショットを返す。 */
    savedBay: (): BayConfiguration => structuredClone(saved),
    /** 現在の編集ドラフトの変更可能なスナップショットを返す。 */
    draftBay: (): BayConfiguration => structuredClone(draft),
    addChip,
    deleteChip,
    reorderChip,
    updateChipSettings,
    undo,
    redo,
    markSaved,
    discardChanges,
    save,
  };
}

/** ドラフト内のチップ位置を返し、存在しなければ操作を拒否する。 */
function chipIndex(draft: BayConfiguration, instanceId: string): number {
  const index = draft.chips.findIndex((chip) => chip.instanceId === instanceId);
  if (index < 0) throw new Error(`chip was not found: ${instanceId}`);
  return index;
}

/** 現在の配列順を1始まりの連続orderへ反映する。 */
function normalizeChipOrder(chips: BayConfiguration["chips"]): void {
  chips.forEach((chip, index) => {
    chip.order = index + 1;
  });
}

/** JSON保存可能なベイ同士が同じ編集状態か判定する。 */
function sameBay(left: BayConfiguration, right: BayConfiguration): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
