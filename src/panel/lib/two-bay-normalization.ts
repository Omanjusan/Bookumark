import {
  MAX_BAY_ROWS,
  TWO_BAY_SCHEMA_VERSION,
  assertTwoBayConfigurationInvariants,
  cloneTwoBayConfiguration,
  createInitialTwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import type {
  TwoBayChipInstance,
  TwoBayConfiguration,
  TwoBayId,
  TwoBayJsonObject,
  TwoBayState,
} from "./two-bay-persistence-model.js";
import {
  loadTwoBayConfiguration,
  saveTwoBayConfiguration,
} from "./two-bay-storage.js";

export type TwoBayRecovery = "unchanged" | "normalized" | "fallback";

export interface TwoBayNormalizationResult {
  configuration: TwoBayConfiguration;
  recovery: TwoBayRecovery;
}

interface NormalizedChip {
  chip: TwoBayChipInstance;
  rowRepaired: boolean;
}

/** 未解釈の保存値を、実行時不変条件を満たす独立した上下2ベイ構成へ変換する。 */
export function normalizeTwoBayConfiguration(stored: unknown): TwoBayNormalizationResult {
  if (!hasTwoBayEnvelope(stored)) {
    return { configuration: createInitialTwoBayConfiguration(), recovery: "fallback" };
  }

  const migrateBookmarkSummary = stored.schemaVersion === 1;
  let changed = migrateBookmarkSummary;
  const usedIds = new Set<string>();
  const greatestStoredId = greatestValidChipSequence([
    ...stored.bays.top.chips,
    ...stored.bays.bottom.chips,
  ]);
  let nextChipSequence = validPositiveSafeInteger(stored.nextChipSequence)
    ? Math.max(stored.nextChipSequence, greatestStoredId + 1)
    : greatestStoredId + 1;
  if (nextChipSequence !== stored.nextChipSequence) changed = true;

  const bays = {} as Record<TwoBayId, TwoBayState>;
  for (const bayId of ["top", "bottom"] as const) {
    const storedBay = stored.bays[bayId];
    let visibleRows = normalizeVisibleRows(storedBay.visibleRows);
    if (visibleRows !== storedBay.visibleRows) changed = true;
    if (bayId === stored.systemBay && visibleRows === 0) {
      visibleRows = 1;
      changed = true;
    }

    const normalized: NormalizedChip[] = [];
    for (const candidate of storedBay.chips) {
      if (!hasUsableChipFields(candidate)) {
        changed = true;
        continue;
      }
      let instanceId = candidate.instanceId;
      if (!isIssuedChipId(instanceId) || usedIds.has(instanceId)) {
        instanceId = `chip-${nextChipSequence}`;
        nextChipSequence += 1;
        changed = true;
      }
      usedIds.add(instanceId);

      const row = normalizeChipRow(candidate.row);
      const rowRepaired = row !== candidate.row;
      if (rowRepaired) changed = true;
      const settings = isJsonObject(candidate.settings)
        ? structuredClone(candidate.settings) as TwoBayJsonObject
        : {};
      if (!isJsonObject(candidate.settings)) changed = true;
      normalized.push({
        chip: {
          instanceId,
          chipType: candidate.chipType,
          row,
          order: candidate.order,
          settings,
        },
        rowRepaired,
      });
    }

    const chips = normalizeRowOrders(normalized, () => { changed = true; });
    bays[bayId] = { visibleRows, chips };
  }

  if (migrateBookmarkSummary) {
    const summaryInstanceId = usedIds.has("chip-bookmark-summary")
      ? `chip-${nextChipSequence++}`
      : "chip-bookmark-summary";
    const summary: TwoBayChipInstance = {
      instanceId: summaryInstanceId,
      chipType: "bookmark-summary",
      row: 1,
      order: 1,
      settings: {},
    };
    bays.top.chips = [
      summary,
      ...bays.top.chips.map((entry) => entry.row === 1
        ? { ...entry, order: entry.order + 1 }
        : entry),
    ];
  }

  const greatestNormalizedId = greatestValidChipSequence([
    ...bays.top.chips,
    ...bays.bottom.chips,
  ]);
  if (nextChipSequence <= greatestNormalizedId) {
    nextChipSequence = greatestNormalizedId + 1;
    changed = true;
  }
  const configuration: TwoBayConfiguration = {
    schemaVersion: TWO_BAY_SCHEMA_VERSION,
    systemBay: stored.systemBay,
    nextChipSequence,
    bays,
  };
  assertTwoBayConfigurationInvariants(configuration);
  return {
    configuration: cloneTwoBayConfiguration(configuration),
    recovery: changed ? "normalized" : "unchanged",
  };
}

/** 専用キーを読み込み、補正・fallbackが必要な場合だけ候補を保存して返す。 */
export async function loadNormalizedTwoBayConfiguration(): Promise<TwoBayNormalizationResult> {
  const result = normalizeTwoBayConfiguration(await loadTwoBayConfiguration());
  if (result.recovery !== "unchanged") {
    await saveTwoBayConfiguration(result.configuration);
  }
  return result;
}

/** schemaと上下ベイを持つ、部分補正可能な保存文書か判定する。 */
function hasTwoBayEnvelope(value: unknown): value is {
  schemaVersion: number;
  systemBay: TwoBayId;
  nextChipSequence: unknown;
  bays: Record<TwoBayId, { visibleRows: unknown; chips: unknown[] }>;
} {
  if (!isRecord(value)
    || (value.schemaVersion !== 1 && value.schemaVersion !== TWO_BAY_SCHEMA_VERSION)
    || (value.systemBay !== "top" && value.systemBay !== "bottom")
    || !isRecord(value.bays)) {
    return false;
  }
  for (const bayId of ["top", "bottom"] as const) {
    const bay = value.bays[bayId];
    if (!isRecord(bay) || !Array.isArray(bay.chips)) return false;
  }
  return true;
}

/** 表示行数を整数化し、0～共通最大行数へ収める。 */
function normalizeVisibleRows(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_BAY_ROWS, Math.max(0, Math.trunc(value)));
}

/** チップ所属行を整数化し、1～共通最大行数へ収める。 */
function normalizeChipRow(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_BAY_ROWS, Math.max(1, Math.trunc(value)));
}

/** 保持可能なチップの文字列識別子と数値位置が揃っているか判定する。 */
function hasUsableChipFields(value: unknown): value is {
  instanceId: string;
  chipType: string;
  row: number;
  order: number;
  settings: unknown;
} {
  return isRecord(value)
    && typeof value.instanceId === "string"
    && value.instanceId.trim() !== ""
    && typeof value.chipType === "string"
    && value.chipType.trim() !== ""
    && typeof value.row === "number"
    && typeof value.order === "number";
}

/** 行補正、無効order、重複orderがある行だけを保存配列順で再採番する。 */
function normalizeRowOrders(
  normalized: NormalizedChip[],
  onChange: () => void,
): TwoBayChipInstance[] {
  const repairRows = new Set<number>();
  const ordersByRow = new Map<number, Set<number>>();
  for (const entry of normalized) {
    const { chip } = entry;
    const orders = ordersByRow.get(chip.row) ?? new Set<number>();
    if (entry.rowRepaired
      || !validPositiveSafeInteger(chip.order)
      || orders.has(chip.order)) {
      repairRows.add(chip.row);
    }
    orders.add(chip.order);
    ordersByRow.set(chip.row, orders);
  }

  const nextOrderByRow = new Map<number, number>();
  return normalized.map(({ chip }) => {
    if (!repairRows.has(chip.row)) return chip;
    const order = nextOrderByRow.get(chip.row) ?? 1;
    nextOrderByRow.set(chip.row, order + 1);
    if (chip.order !== order) onChange();
    return { ...chip, order };
  });
}

/** 保存候補に含まれる最大の正規`chip-N`番号を返す。 */
function greatestValidChipSequence(values: unknown[]): number {
  let greatest = 0;
  for (const value of values) {
    if (!isRecord(value) || typeof value.instanceId !== "string") continue;
    const match = /^chip-([1-9]\d*)$/.exec(value.instanceId);
    if (match === null) continue;
    const sequence = Number(match[1]);
    if (Number.isSafeInteger(sequence)) greatest = Math.max(greatest, sequence);
  }
  return greatest;
}

/** instance IDが予約済み初期IDまたは安全な正整数を持つ`chip-N`形式か判定する。 */
function isIssuedChipId(value: string): boolean {
  if (value === "chip-bookmark-summary") return true;
  const match = /^chip-([1-9]\d*)$/.exec(value);
  return match !== null && Number.isSafeInteger(Number(match[1]));
}

/** 値が1以上の安全な整数か判定する。 */
function validPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

/** 配列ではないオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** structured clone可能なJSONオブジェクトか再帰的に判定する。 */
function isJsonObject(value: unknown): value is TwoBayJsonObject {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

/** 値が保存可能なJSON値か再帰的に判定する。 */
function isJsonValue(value: unknown): boolean {
  if (value === null
    || typeof value === "string"
    || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isJsonObject(value);
}
