import {
  DOCKING_SCHEMA_VERSION,
} from "./docking-persistence-model.js";
import type {
  BayConfiguration,
  BayConfigurationsDocument,
} from "./docking-persistence-model.js";

const UNNAMED_BAY = "名称未設定";
const BAY_ID_PATTERN = /^bay-([1-9]\d*)$/;

export type DockingRecovery = "unchanged" | "normalized" | "fallback";

export interface BayConfigurationsNormalizationResult {
  document: BayConfigurationsDocument;
  changed: boolean;
  recovery: DockingRecovery;
}

/** 保存されたベイ文書の外形を検証し、復旧可能な文書を防御的コピーで返す。 */
export function normalizeBayConfigurationsDocument(
  value: unknown,
  fallback: BayConfigurationsDocument,
): BayConfigurationsNormalizationResult {
  if (!isRecord(value)) return fallbackResult(fallback);
  if (value.schemaVersion !== DOCKING_SCHEMA_VERSION) return fallbackResult(fallback);
  if (!Array.isArray(value.bays)) return fallbackResult(fallback);
  if (isSequenceOverflow(value.nextBaySequence) || isSequenceOverflow(value.nextChipSequence)) {
    return fallbackResult(fallback);
  }

  const nextBaySequence = normalizeSequence(value.nextBaySequence);
  const nextChipSequence = normalizeSequence(value.nextChipSequence);
  const bays = normalizeBays(value.bays);
  const changed = nextBaySequence !== value.nextBaySequence
    || nextChipSequence !== value.nextChipSequence
    || bays.changed;
  const document: BayConfigurationsDocument = {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    nextBaySequence,
    nextChipSequence,
    bays: bays.value,
  };
  return {
    document,
    changed,
    recovery: changed ? "normalized" : "unchanged",
  };
}

/** 復旧用文書を呼び出し元と状態共有しない結果へ変換する。 */
function fallbackResult(
  fallback: BayConfigurationsDocument,
): BayConfigurationsNormalizationResult {
  return {
    document: structuredClone(fallback),
    changed: true,
    recovery: "fallback",
  };
}

/** 不正な採番値を最初の採番値へ補正する。 */
function normalizeSequence(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 1 ? value as number : 1;
}

/** 次回のID発行が安全整数の範囲を越える採番値か判定する。 */
function isSequenceOverflow(value: unknown): boolean {
  return typeof value === "number" && value >= Number.MAX_SAFE_INTEGER;
}

/** 値が配列以外のオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** ベイを保存順に検証し、有効なIDの最初の項目だけを残す。 */
function normalizeBays(values: unknown[]): { value: BayConfiguration[]; changed: boolean } {
  const ids = new Set<string>();
  const bays: BayConfiguration[] = [];
  let changed = false;

  for (const value of values) {
    if (!isRecord(value) || !isValidBayId(value.id) || ids.has(value.id)) {
      changed = true;
      continue;
    }

    ids.add(value.id);
    const name = typeof value.name === "string" && value.name.trim() !== ""
      ? value.name
      : UNNAMED_BAY;
    const permanent = typeof value.permanent === "boolean" ? value.permanent : false;
    if (name !== value.name || permanent !== value.permanent) changed = true;

    bays.push({
      id: value.id,
      name,
      permanent,
      // チップ自体の検証はDB-4B-3で行うため、この段階では内容を維持する。
      chips: structuredClone(value.chips) as BayConfiguration["chips"],
    });
  }

  return { value: bays, changed };
}

/** 値が正規形かつ安全整数範囲内のベイIDか判定する。 */
function isValidBayId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = BAY_ID_PATTERN.exec(value);
  if (!match) return false;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence);
}
