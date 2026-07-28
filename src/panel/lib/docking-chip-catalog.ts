import type { ChipKind } from "./chip-contract.js";
import type { BayConfigurationsDocument } from "./docking-persistence-model.js";

export const CURRENT_DOCKING_CHIP_TYPES = [
  "search",
  "visit-status",
  "folder-history",
  "sort",
  "view-type",
  "movement-mode",
] as const;

export interface CurrentDockingChipRecord {
  readonly chipType: string;
  readonly displayName: string;
  readonly kind: ChipKind;
}

export interface DeprecatedDockingChipRecord {
  readonly chipType: string;
  readonly displayName: string;
  readonly deprecatedSince: string;
  readonly removedSince: string;
  readonly replacementChipType?: string;
}

export interface DockingChipCatalog {
  readonly currentByType: ReadonlyMap<string, CurrentDockingChipRecord>;
  readonly deprecatedByType: ReadonlyMap<string, DeprecatedDockingChipRecord>;
}

export type DockingChipClassification =
  | ({ readonly status: "current" } & CurrentDockingChipRecord)
  | ({ readonly status: "deprecated" } & DeprecatedDockingChipRecord)
  | { readonly status: "unknown"; readonly chipType: string };

export type DockingDocumentChipClassification = DockingChipClassification & {
  readonly bayId: string;
  readonly bayName: string;
  readonly instanceId: string;
};

export const CURRENT_DOCKING_CHIP_RECORDS: readonly CurrentDockingChipRecord[] = Object.freeze([
  frozenCurrent("search", "検索"),
  frozenCurrent("visit-status", "訪問状態"),
  frozenCurrent("folder-history", "フォルダ履歴"),
  frozenCurrent("sort", "ソート"),
  frozenCurrent("view-type", "表示形式"),
  frozenCurrent("movement-mode", "移動モード"),
]);

export const DEPRECATED_DOCKING_CHIP_RECORDS: readonly DeprecatedDockingChipRecord[] = Object.freeze([]);

export const PRODUCTION_DOCKING_CHIP_CATALOG = createDockingChipCatalog(
  CURRENT_DOCKING_CHIP_RECORDS,
  DEPRECATED_DOCKING_CHIP_RECORDS,
);

/** 現行台帳と永続的な廃止台帳を検証し、分類用の独立した索引を生成する。 */
export function createDockingChipCatalog(
  currentRecords: readonly CurrentDockingChipRecord[],
  deprecatedRecords: readonly DeprecatedDockingChipRecord[],
): DockingChipCatalog {
  const currentByType = new Map<string, CurrentDockingChipRecord>();
  for (const record of currentRecords) {
    if (!isCurrentRecord(record)) throw new TypeError("invalid current chip record");
    if (currentByType.has(record.chipType)) {
      throw new TypeError(`duplicate current chip type: ${record.chipType}`);
    }
    currentByType.set(record.chipType, structuredClone(record));
  }

  const deprecatedByType = new Map<string, DeprecatedDockingChipRecord>();
  for (const record of deprecatedRecords) {
    if (!isDeprecatedRecord(record)) throw new TypeError("invalid deprecated chip record");
    if (deprecatedByType.has(record.chipType)) {
      throw new TypeError(`duplicate deprecated chip type: ${record.chipType}`);
    }
    if (currentByType.has(record.chipType)) {
      throw new TypeError(`chip type is both current and deprecated: ${record.chipType}`);
    }
    deprecatedByType.set(record.chipType, structuredClone(record));
  }
  return { currentByType, deprecatedByType };
}

/** 1つのchipTypeを現行、廃止、未知のいずれかへ分類する。 */
export function classifyDockingChipType(
  chipType: string,
  catalog: DockingChipCatalog,
): DockingChipClassification {
  const current = catalog.currentByType.get(chipType);
  if (current !== undefined) return { status: "current", ...structuredClone(current) };
  const deprecated = catalog.deprecatedByType.get(chipType);
  if (deprecated !== undefined) return { status: "deprecated", ...structuredClone(deprecated) };
  return { status: "unknown", chipType };
}

/** 保存された全ベイのチップを保存順のまま識別情報付きで分類する。 */
export function classifyDockingDocumentChips(
  document: BayConfigurationsDocument,
  catalog: DockingChipCatalog,
): DockingDocumentChipClassification[] {
  return document.bays.flatMap((bay) => bay.chips.map((chip) => ({
    bayId: bay.id,
    bayName: bay.name,
    instanceId: chip.instanceId,
    ...classifyDockingChipType(chip.chipType, catalog),
  })));
}

/** プロダクション現行台帳の変更不能なcontrolレコードを生成する。 */
function frozenCurrent(chipType: string, displayName: string): CurrentDockingChipRecord {
  return Object.freeze({ chipType, displayName, kind: "control" });
}

/** 現行台帳レコードの必須文字列とkindを検証する。 */
function isCurrentRecord(value: unknown): value is CurrentDockingChipRecord {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.chipType)
    && isNonEmptyString(value.displayName)
    && (value.kind === "condition" || value.kind === "control" || value.kind === "action");
}

/** 廃止台帳レコードの必須文字列と任意の代替型を検証する。 */
function isDeprecatedRecord(value: unknown): value is DeprecatedDockingChipRecord {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.chipType)
    && isNonEmptyString(value.displayName)
    && isNonEmptyString(value.deprecatedSince)
    && isNonEmptyString(value.removedSince)
    && (value.replacementChipType === undefined || isNonEmptyString(value.replacementChipType));
}

/** 空白だけではない文字列か判定する。 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** 配列以外のオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
