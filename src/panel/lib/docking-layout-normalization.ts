import { DOCKING_SCHEMA_VERSION } from "./docking-persistence-model.js";
import type {
  LayoutConfiguration,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

const UNNAMED_LAYOUT = "名称未設定";
const LAYOUT_ID_PATTERN = /^layout-([1-9]\d*)$/;

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
): MainLayoutsNormalizationResult {
  if (!isRecord(value)) return fallbackResult(fallback);
  if (value.schemaVersion !== DOCKING_SCHEMA_VERSION) return fallbackResult(fallback);
  if (!Array.isArray(value.layouts)) return fallbackResult(fallback);
  if (isSequenceOverflow(value.nextLayoutSequence)) return fallbackResult(fallback);

  const systemDefaultId = fallback.layouts.find((layout) => layout.systemDefault)?.id;
  if (!systemDefaultId) return fallbackResult(fallback);
  const layouts = normalizeLayouts(value.layouts, systemDefaultId);
  if (!layouts.hasSystemDefault || layouts.sequenceOverflow) return fallbackResult(fallback);

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
): {
  value: LayoutConfiguration[];
  changed: boolean;
  hasSystemDefault: boolean;
  maxSequence: number;
  sequenceOverflow: boolean;
} {
  const ids = new Set<string>();
  const layouts: LayoutConfiguration[] = [];
  let changed = false;
  let hasSystemDefault = false;
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

    layouts.push({
      id,
      name,
      systemDefault,
      // 配置内容の検証はDB-4C-2で行う。
      placements: structuredClone(candidate.placements) as LayoutConfiguration["placements"],
    });
  }

  return {
    value: layouts,
    changed,
    hasSystemDefault,
    maxSequence,
    sequenceOverflow,
  };
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
