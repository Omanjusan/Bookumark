import type {
  BayConfiguration,
  JsonObject,
  LayoutConfiguration,
} from "./docking-persistence-model.js";

export interface NewBayDraft {
  readonly temporaryId: string;
  readonly name: string;
  readonly chips: [];
}

export interface DuplicateChipDraft {
  readonly chipType: string;
  readonly order: number;
  settings: JsonObject;
}

export interface BayDuplicationPlan {
  readonly sourceBayId: string;
  readonly name: string;
  readonly chips: DuplicateChipDraft[];
}

export interface BayDeletionPlan {
  readonly bayId: string;
  readonly referencedLayoutIds: string[];
  readonly referencedLayoutCount: number;
}

/** 保存前だけ使う一時識別子を持つ空の新規ベイドラフトを生成する。 */
export function createNewBayDraft(temporaryId: string, name: string): NewBayDraft {
  if (temporaryId.trim() === "") {
    throw new TypeError("temporaryId must not be empty");
  }
  return {
    temporaryId,
    name: validBayName(name),
    chips: [],
  };
}

/** ユーザーベイを防御的コピーし、検証済みの名前へ変更する。 */
export function renameUserBay(bay: BayConfiguration, name: string): BayConfiguration {
  assertUserBay(bay, "renamed");
  const renamed = structuredClone(bay);
  renamed.name = validBayName(name);
  return renamed;
}

/** 元ベイと独立した値と重複しない連番名を持つ複製素案を生成する。 */
export function planBayDuplication(
  source: BayConfiguration,
  existingNames: readonly string[],
): BayDuplicationPlan {
  assertUserBay(source, "duplicated");
  const baseName = validBayName(source.name);
  const usedNames = new Set(existingNames);
  let suffix = 2;
  while (usedNames.has(`${baseName} ${suffix}`)) suffix += 1;
  return {
    sourceBayId: source.id,
    name: `${baseName} ${suffix}`,
    // 正式なベイ・チップIDは保存要求を組み立てるDB-8Eで発行する。
    chips: source.chips.map((chip, index) => ({
      chipType: chip.chipType,
      order: index + 1,
      settings: structuredClone(chip.settings),
    })),
  };
}

/** 完全削除によって参照を除去するレイアウトを保存順で集計する。 */
export function planBayDeletion(
  bay: BayConfiguration,
  layouts: readonly LayoutConfiguration[],
): BayDeletionPlan {
  assertUserBay(bay, "deleted");
  const referencedLayoutIds = layouts
    .filter((layout) => layout.placements.some((placement) => placement.bayId === bay.id))
    .map((layout) => layout.id);
  return {
    bayId: bay.id,
    referencedLayoutIds,
    referencedLayoutCount: referencedLayoutIds.length,
  };
}

/** 空白を除いた有効なベイ名を返す。 */
function validBayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") throw new TypeError("bay name must not be empty");
  return trimmed;
}

/** 固定ベイに対するユーザー管理操作を状態層で拒否する。 */
function assertUserBay(
  bay: BayConfiguration,
  operation: "renamed" | "duplicated" | "deleted",
): void {
  if (bay.permanent) throw new Error(`permanent bay cannot be ${operation}`);
}
