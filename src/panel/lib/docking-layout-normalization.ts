import { DOCKING_SCHEMA_VERSION } from "./docking-persistence-model.js";
import type {
  BayPlacement,
  LayoutConfiguration,
  MainLayoutsDocument,
  RailId,
} from "./docking-persistence-model.js";

const UNNAMED_LAYOUT = "名称未設定";
const LAYOUT_ID_PATTERN = /^layout-([1-9]\d*)$/;
const RAILS: readonly RailId[] = ["top", "left", "right", "bottom"];

export type LayoutRecovery = "unchanged" | "normalized" | "fallback";

export interface MainLayoutsNormalizationResult {
  document: MainLayoutsDocument;
  changed: boolean;
  recovery: LayoutRecovery;
}

/** 保存されたレイアウト文書と内部デフォルトを検証し、防御的コピーで返す。 */
export function normalizeMainLayoutsDocument(
  value: unknown,
  fallback: MainLayoutsDocument,
  validBayIds: ReadonlySet<string>,
): MainLayoutsNormalizationResult {
  if (!isRecord(value)) return fallbackResult(fallback);
  if (value.schemaVersion !== DOCKING_SCHEMA_VERSION) return fallbackResult(fallback);
  if (!Array.isArray(value.layouts)) return fallbackResult(fallback);
  if (isSequenceOverflow(value.nextLayoutSequence)) return fallbackResult(fallback);

  const systemDefault = fallback.layouts.find((layout) => layout.systemDefault);
  if (!systemDefault) return fallbackResult(fallback);
  const layouts = normalizeLayouts(
    value.layouts,
    systemDefault.id,
    systemDefault.placements,
    validBayIds,
  );
  if (!layouts.hasSystemDefault
    || layouts.systemDefaultPlacementsChanged
    || layouts.sequenceOverflow) return fallbackResult(fallback);

  const normalizedSequence = normalizeSequence(value.nextLayoutSequence);
  const nextLayoutSequence = Math.max(normalizedSequence, layouts.maxSequence + 1);
  const changed = nextLayoutSequence !== value.nextLayoutSequence || layouts.changed;
  return {
    document: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextLayoutSequence,
      layouts: layouts.value,
    },
    changed,
    recovery: changed ? "normalized" : "unchanged",
  };
}

/** 復旧用レイアウト文書を状態共有しない結果へ変換する。 */
function fallbackResult(fallback: MainLayoutsDocument): MainLayoutsNormalizationResult {
  return {
    document: structuredClone(fallback),
    changed: true,
    recovery: "fallback",
  };
}

/** レイアウトを保存順に検証し、有効IDの最初の項目だけを残す。 */
function normalizeLayouts(
  values: unknown[],
  systemDefaultId: string,
  systemDefaultPlacements: BayPlacement[],
  validBayIds: ReadonlySet<string>,
): {
  value: LayoutConfiguration[];
  changed: boolean;
  hasSystemDefault: boolean;
  systemDefaultPlacementsChanged: boolean;
  maxSequence: number;
  sequenceOverflow: boolean;
} {
  const ids = new Set<string>();
  const layouts: LayoutConfiguration[] = [];
  let changed = false;
  let hasSystemDefault = false;
  let systemDefaultPlacementsChanged = false;
  let maxSequence = 0;
  let sequenceOverflow = false;

  for (const candidate of values) {
    if (!isRecord(candidate)) {
      changed = true;
      continue;
    }
    const sequence = extractLayoutSequence(candidate.id);
    if (sequence === null || ids.has(candidate.id as string)) {
      changed = true;
      continue;
    }

    const id = candidate.id as string;
    ids.add(id);
    maxSequence = Math.max(maxSequence, sequence);
    if (sequence >= Number.MAX_SAFE_INTEGER - 1) sequenceOverflow = true;

    const name = typeof candidate.name === "string" && candidate.name.trim() !== ""
      ? candidate.name
      : UNNAMED_LAYOUT;
    // systemDefaultは保存値を信用せず、注入された内部デフォルトIDから導出する。
    const systemDefault = id === systemDefaultId;
    hasSystemDefault ||= systemDefault;
    if (name !== candidate.name || systemDefault !== candidate.systemDefault) changed = true;
    const placements = normalizePlacements(candidate.placements, validBayIds);
    changed ||= placements.changed;
    if (systemDefault
      && (placements.changed || !placementsEqual(placements.value, systemDefaultPlacements))) {
      systemDefaultPlacementsChanged = true;
    }

    layouts.push({
      id,
      name,
      systemDefault,
      placements: placements.value,
    });
  }

  return {
    value: layouts,
    changed,
    hasSystemDefault,
    systemDefaultPlacementsChanged,
    maxSequence,
    sequenceOverflow,
  };
}

/** 配置を検証し、レール順とレール内orderを正規化する。 */
function normalizePlacements(
  value: unknown,
  validBayIds: ReadonlySet<string>,
): { value: BayPlacement[]; changed: boolean } {
  if (!Array.isArray(value)) return { value: [], changed: true };

  const bayIds = new Set<string>();
  const placements: Array<BayPlacement & { sourceIndex: number; sourceOrder: number | null }> = [];
  let changed = false;

  for (const [sourceIndex, candidate] of value.entries()) {
    if (!isRecord(candidate)
      || typeof candidate.bayId !== "string"
      || !validBayIds.has(candidate.bayId)
      || bayIds.has(candidate.bayId)
      || !isRailId(candidate.rail)) {
      changed = true;
      continue;
    }

    bayIds.add(candidate.bayId);
    placements.push({
      bayId: candidate.bayId,
      rail: candidate.rail,
      order: 0,
      sourceIndex,
      sourceOrder: isPositiveSafeInteger(candidate.order) ? candidate.order : null,
    });
  }

  // レールを適用順にまとめ、有効orderを優先して保存順で安定化する。
  placements.sort((left, right) => {
    const railDifference = RAILS.indexOf(left.rail) - RAILS.indexOf(right.rail);
    if (railDifference !== 0) return railDifference;
    if (left.sourceOrder === null && right.sourceOrder === null) {
      return left.sourceIndex - right.sourceIndex;
    }
    if (left.sourceOrder === null) return 1;
    if (right.sourceOrder === null) return -1;
    return left.sourceOrder - right.sourceOrder || left.sourceIndex - right.sourceIndex;
  });

  const nextOrder = new Map<RailId, number>();
  const normalized = placements.map(({ sourceIndex, sourceOrder, ...placement }, index) => {
    const order = (nextOrder.get(placement.rail) ?? 0) + 1;
    nextOrder.set(placement.rail, order);
    if (sourceIndex !== index || sourceOrder !== order) changed = true;
    return { ...placement, order };
  });
  return { value: normalized, changed };
}

/** 2つの配置配列が同じベイ、レール、orderを持つか判定する。 */
function placementsEqual(left: BayPlacement[], right: BayPlacement[]): boolean {
  return left.length === right.length && left.every((placement, index) => {
    const other = right[index];
    return placement.bayId === other?.bayId
      && placement.rail === other.rail
      && placement.order === other.order;
  });
}

/** 値が4つの配置レールのいずれかか判定する。 */
function isRailId(value: unknown): value is RailId {
  return typeof value === "string" && (RAILS as readonly string[]).includes(value);
}

/** 値が1以上の安全整数か判定する。 */
function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

/** 正規形のレイアウトIDから安全整数の連番を取り出す。 */
function extractLayoutSequence(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = LAYOUT_ID_PATTERN.exec(value);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

/** 不正な採番値を最初の採番値へ補正する。 */
function normalizeSequence(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 1 ? value as number : 1;
}

/** 次回のID発行が安全整数範囲を越える採番値か判定する。 */
function isSequenceOverflow(value: unknown): boolean {
  return typeof value === "number" && value >= Number.MAX_SAFE_INTEGER;
}

/** 値が配列以外のオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
