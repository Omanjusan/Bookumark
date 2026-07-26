import type {
  BayConfiguration,
  BayConfigurationsDocument,
  JsonObject,
} from "./docking-persistence-model.js";
import { issueChipId } from "./docking-persistence-model.js";

export interface BayEditSession {
  readonly bayId: string;
  readonly dirty: boolean;
  readonly nextChipSequence: number;
  savedBay(): BayConfiguration;
  draftBay(): BayConfiguration;
  addChip(chipType: string, index: number): string;
  deleteChip(instanceId: string): void;
  reorderChip(instanceId: string, index: number): boolean;
  updateChipSettings(instanceId: string, settings: JsonObject): void;
}

interface BayEditSessionOptions {
  readonly createInitialSettings?: (chipType: string) => JsonObject;
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
  const saved = structuredClone(sourceBay);
  const draft = structuredClone(sourceBay);
  let nextChipSequence = document.nextChipSequence;
  let dirty = false;

  /** 指定位置へ新しいチップインスタンスを追加し、発行したIDを返す。 */
  const addChip = (chipType: string, index: number): string => {
    if (chipType.trim() === "") {
      throw new TypeError("chipType must not be empty");
    }
    if (!Number.isInteger(index) || index < 0 || index > draft.chips.length) {
      throw new RangeError("index must be an insertion boundary in the draft");
    }

    // 生成処理を先に完了させ、失敗時に採番やドラフトを部分変更しない。
    const settings = structuredClone(options.createInitialSettings?.(chipType) ?? {});
    const issued = issueChipId(nextChipSequence);
    const chips = draft.chips.map((chip) => structuredClone(chip));
    chips.splice(index, 0, {
      instanceId: issued.id,
      chipType,
      order: index + 1,
      settings,
    });
    chips.forEach((chip, chipIndex) => {
      chip.order = chipIndex + 1;
    });

    draft.chips = chips;
    nextChipSequence = issued.nextSequence;
    dirty = true;
    return issued.id;
  };

  /** 指定したチップをドラフトから削除し、残ったorderを正規化する。 */
  const deleteChip = (instanceId: string): void => {
    const sourceIndex = chipIndex(draft, instanceId);
    const chips = draft.chips
      .filter((_, index) => index !== sourceIndex)
      .map((chip) => structuredClone(chip));
    normalizeChipOrder(chips);
    draft.chips = chips;
    dirty = true;
  };

  /** 移動元を除いた後の最終添字へチップを移し、変更の有無を返す。 */
  const reorderChip = (instanceId: string, index: number): boolean => {
    const sourceIndex = chipIndex(draft, instanceId);
    if (!Number.isInteger(index) || index < 0 || index >= draft.chips.length) {
      throw new RangeError("index must be a chip position in the draft");
    }
    if (sourceIndex === index) return false;

    const chips = draft.chips.map((chip) => structuredClone(chip));
    const [moved] = chips.splice(sourceIndex, 1);
    chips.splice(index, 0, moved);
    normalizeChipOrder(chips);
    draft.chips = chips;
    dirty = true;
    return true;
  };

  /** 指定したチップの設定を呼び出し元と共有しない値へ置き換える。 */
  const updateChipSettings = (instanceId: string, settings: JsonObject): void => {
    const index = chipIndex(draft, instanceId);
    const nextSettings = structuredClone(settings);
    const chips = draft.chips.map((chip) => structuredClone(chip));
    chips[index].settings = nextSettings;
    draft.chips = chips;
    dirty = true;
  };

  return {
    bayId,
    get dirty(): boolean {
      return dirty;
    },
    get nextChipSequence(): number {
      return nextChipSequence;
    },
    /** 最後に保存されたベイの変更可能なスナップショットを返す。 */
    savedBay: (): BayConfiguration => structuredClone(saved),
    /** 現在の編集ドラフトの変更可能なスナップショットを返す。 */
    draftBay: (): BayConfiguration => structuredClone(draft),
    addChip,
    deleteChip,
    reorderChip,
    updateChipSettings,
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
