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
  };
}
