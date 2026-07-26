import {
  DOCKING_SCHEMA_VERSION,
} from "./docking-persistence-model.js";
import type {
  BayConfiguration,
  BayConfigurationsDocument,
  ChipInstanceConfiguration,
  JsonObject,
  JsonValue,
} from "./docking-persistence-model.js";

const UNNAMED_BAY = "名称未設定";
const BAY_ID_PATTERN = /^bay-([1-9]\d*)$/;
const CHIP_ID_PATTERN = /^chip-([1-9]\d*)$/;

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

  const bays = normalizeBays(value.bays);
  if (bays.sequenceOverflow) return fallbackResult(fallback);

  const normalizedBaySequence = normalizeSequence(value.nextBaySequence);
  const normalizedChipSequence = normalizeSequence(value.nextChipSequence);
  const nextBaySequence = Math.max(normalizedBaySequence, bays.maxBaySequence + 1);
  const nextChipSequence = Math.max(normalizedChipSequence, bays.maxChipSequence + 1);
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
function normalizeBays(values: unknown[]): {
  value: BayConfiguration[];
  changed: boolean;
  maxBaySequence: number;
  maxChipSequence: number;
  sequenceOverflow: boolean;
} {
  const ids = new Set<string>();
  const chipIds = new Set<string>();
  const bays: BayConfiguration[] = [];
  let changed = false;
  let maxBaySequence = 0;
  let maxChipSequence = 0;
  let sequenceOverflow = false;

  for (const value of values) {
    if (!isRecord(value) || !isValidBayId(value.id) || ids.has(value.id)) {
      changed = true;
      continue;
    }

    ids.add(value.id);
    const baySequence = extractIdSequence(value.id, BAY_ID_PATTERN);
    maxBaySequence = Math.max(maxBaySequence, baySequence ?? 0);
    if (baySequence !== null && baySequence >= Number.MAX_SAFE_INTEGER - 1) {
      sequenceOverflow = true;
    }
    const name = typeof value.name === "string" && value.name.trim() !== ""
      ? value.name
      : UNNAMED_BAY;
    const permanent = typeof value.permanent === "boolean" ? value.permanent : false;
    if (name !== value.name || permanent !== value.permanent) changed = true;
    const chips = normalizeChips(value.chips, chipIds);
    changed ||= chips.changed;
    maxChipSequence = Math.max(maxChipSequence, chips.maxSequence);
    sequenceOverflow ||= chips.sequenceOverflow;

    bays.push({
      id: value.id,
      name,
      permanent,
      chips: chips.value,
    });
  }

  return {
    value: bays,
    changed,
    maxBaySequence,
    maxChipSequence,
    sequenceOverflow,
  };
}

/** 値が正規形かつ安全整数範囲内のベイIDか判定する。 */
function isValidBayId(value: unknown): value is string {
  return extractIdSequence(value, BAY_ID_PATTERN) !== null;
}

/** チップを検証し、有効order順へ並べた後に1始まりで再採番する。 */
function normalizeChips(
  value: unknown,
  ids: Set<string>,
): {
  value: ChipInstanceConfiguration[];
  changed: boolean;
  maxSequence: number;
  sequenceOverflow: boolean;
} {
  if (!Array.isArray(value)) {
    return { value: [], changed: true, maxSequence: 0, sequenceOverflow: false };
  }

  const chips: Array<ChipInstanceConfiguration & { sourceIndex: number; sourceOrder: number | null }> = [];
  let changed = false;
  let maxSequence = 0;
  let sequenceOverflow = false;

  for (const [sourceIndex, candidate] of value.entries()) {
    if (!isRecord(candidate)) {
      changed = true;
      continue;
    }
    const sequence = extractIdSequence(candidate.instanceId, CHIP_ID_PATTERN);
    const validType = typeof candidate.chipType === "string" && candidate.chipType.trim() !== "";
    if (sequence === null || ids.has(candidate.instanceId as string) || !validType) {
      changed = true;
      continue;
    }

    ids.add(candidate.instanceId as string);
    maxSequence = Math.max(maxSequence, sequence);
    if (sequence >= Number.MAX_SAFE_INTEGER - 1) sequenceOverflow = true;
    let settings: JsonObject;
    if (isJsonObject(candidate.settings)) {
      settings = structuredClone(candidate.settings);
    } else {
      settings = {};
      changed = true;
    }
    const sourceOrder = isPositiveSafeInteger(candidate.order) ? candidate.order : null;
    chips.push({
      instanceId: candidate.instanceId as string,
      chipType: candidate.chipType as string,
      order: 0,
      settings,
      sourceIndex,
      sourceOrder,
    });
  }

  // 不正orderは保存順を保ったまま、有効orderを持つチップの後ろへ送る。
  chips.sort((left, right) => {
    if (left.sourceOrder === null && right.sourceOrder === null) {
      return left.sourceIndex - right.sourceIndex;
    }
    if (left.sourceOrder === null) return 1;
    if (right.sourceOrder === null) return -1;
    return left.sourceOrder - right.sourceOrder || left.sourceIndex - right.sourceIndex;
  });

  const normalized = chips.map(({ sourceIndex, sourceOrder, ...chip }, index) => {
    const order = index + 1;
    if (sourceOrder !== order) changed = true;
    return { ...chip, order };
  });
  return { value: normalized, changed, maxSequence, sequenceOverflow };
}

/** 指定prefixの正規形IDから安全整数の連番を取り出す。 */
function extractIdSequence(value: unknown, pattern: RegExp): number | null {
  if (typeof value !== "string") return null;
  const match = pattern.exec(value);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

/** 値が1以上の安全整数か判定する。 */
function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

/** 値がJSONとして保存可能なオブジェクトか再帰的に判定する。 */
function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    && isJsonValue(value, new Set<object>());
}

/** 循環参照を拒否しながらJSON値を再帰的に検証する。 */
function isJsonValue(value: unknown, ancestors: Set<object>): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;

  const isArray = Array.isArray(value);
  if (!isArray && (Object.getPrototypeOf(value) !== Object.prototype
    && Object.getPrototypeOf(value) !== null)) return false;
  ancestors.add(value);
  const entries = isArray ? value : Object.values(value);
  const valid = entries.every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
}
