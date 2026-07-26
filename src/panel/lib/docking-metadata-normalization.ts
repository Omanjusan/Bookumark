import { DOCKING_SCHEMA_VERSION } from "./docking-persistence-model.js";
import type {
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

export type MetadataRecovery = "unchanged" | "normalized" | "fallback";

export interface DockingMetadataNormalizationResult {
  document: DockingMetadataDocument;
  changed: boolean;
  recovery: MetadataRecovery;
}

/** メタデータのレイアウト参照を検証し、安全なactiveレイアウトを選択する。 */
export function normalizeDockingMetadataDocument(
  value: unknown,
  fallback: DockingMetadataDocument,
  layouts: MainLayoutsDocument,
): DockingMetadataNormalizationResult {
  if (!isRecord(value)) return fallbackResult(fallback);
  if (value.schemaVersion !== DOCKING_SCHEMA_VERSION) return fallbackResult(fallback);

  const validLayoutIds = new Set(layouts.layouts.map((layout) => layout.id));
  const systemDefaultId = layouts.layouts.find((layout) => layout.systemDefault)?.id;
  if (!systemDefaultId || !validLayoutIds.has(systemDefaultId)) return fallbackResult(fallback);

  const activeLayoutId = firstValidLayoutId([
    value.activeLayoutId,
    value.lastUsedLayoutId,
    value.preferredLayoutId,
    systemDefaultId,
  ], validLayoutIds) ?? systemDefaultId;
  const preferredLayoutId = validLayoutId(value.preferredLayoutId, validLayoutIds);
  const lastUsedLayoutId = validLayoutId(value.lastUsedLayoutId, validLayoutIds);
  const changed = activeLayoutId !== value.activeLayoutId
    || optionalReferenceChanged(value, "preferredLayoutId", preferredLayoutId)
    || optionalReferenceChanged(value, "lastUsedLayoutId", lastUsedLayoutId);

  const document: DockingMetadataDocument = {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    activeLayoutId,
  };
  if (preferredLayoutId !== undefined) document.preferredLayoutId = preferredLayoutId;
  if (lastUsedLayoutId !== undefined) document.lastUsedLayoutId = lastUsedLayoutId;
  return {
    document,
    changed,
    recovery: changed ? "normalized" : "unchanged",
  };
}

/** 復旧用メタデータを呼び出し元と状態共有しない結果へ変換する。 */
function fallbackResult(
  fallback: DockingMetadataDocument,
): DockingMetadataNormalizationResult {
  return {
    document: structuredClone(fallback),
    changed: true,
    recovery: "fallback",
  };
}

/** 候補を優先順に調べ、最初の有効なレイアウトIDを返す。 */
function firstValidLayoutId(
  candidates: unknown[],
  validLayoutIds: ReadonlySet<string>,
): string | undefined {
  for (const candidate of candidates) {
    const id = validLayoutId(candidate, validLayoutIds);
    if (id !== undefined) return id;
  }
  return undefined;
}

/** 値が正常化済みレイアウト文書に存在するIDなら返す。 */
function validLayoutId(
  value: unknown,
  validLayoutIds: ReadonlySet<string>,
): string | undefined {
  return typeof value === "string" && validLayoutIds.has(value) ? value : undefined;
}

/** 任意参照が除去または変更されたか判定する。 */
function optionalReferenceChanged(
  source: Record<string, unknown>,
  key: "preferredLayoutId" | "lastUsedLayoutId",
  normalized: string | undefined,
): boolean {
  return key in source ? source[key] !== normalized : normalized !== undefined;
}

/** 値が配列以外のオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
