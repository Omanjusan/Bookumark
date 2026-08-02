import {
  PANEL_FLAVOR_IDS,
  createPanelFlavorSeed,
  panelFlavorForGuid,
} from "./panel-flavor.js";
import type { PanelFlavorId } from "./panel-flavor.js";

export const PANEL_FLAVOR_PREFERENCES_STORAGE_KEY = "panelFlavorPreferences.v1";

export interface PanelFlavorPreferences {
  readonly version: 1;
  readonly seed: number;
  readonly overrides: Record<string, PanelFlavorId>;
}

export interface PanelFlavorPreferencesResult {
  readonly preferences: PanelFlavorPreferences;
  readonly changed: boolean;
}

/** 永続化可能な初期seedと空の個別指定を生成する。 */
export function createPanelFlavorPreferences(
  random: () => number = Math.random,
): PanelFlavorPreferences {
  return {
    version: 1,
    seed: createPanelFlavorSeed(random),
    overrides: {},
  };
}

/** 未保存・破損値をv1契約へ補正し、保存し直す必要性を返す。 */
export function normalizePanelFlavorPreferences(
  candidate: unknown,
  random: () => number = Math.random,
): PanelFlavorPreferencesResult {
  if (!isRecord(candidate) || candidate.version !== 1 || !isSeed(candidate.seed)) {
    return { preferences: createPanelFlavorPreferences(random), changed: true };
  }

  const overrides: Record<string, PanelFlavorId> = {};
  let changed = !isRecord(candidate.overrides);
  if (isRecord(candidate.overrides)) {
    for (const [guid, flavor] of Object.entries(candidate.overrides)) {
      if (guid.length > 0 && isPanelFlavorId(flavor)) overrides[guid] = flavor;
      else changed = true;
    }
  }
  return {
    preferences: { version: 1, seed: candidate.seed, overrides },
    changed,
  };
}

/** 個別指定を優先し、未指定時だけ永続seedから配色を決定する。 */
export function panelFlavorFromPreferences(
  guid: string,
  preferences: PanelFlavorPreferences,
): PanelFlavorId {
  return preferences.overrides[guid] ?? panelFlavorForGuid(guid, preferences.seed);
}

/** GUIDの個別指定を設定し、nullでは自動配色へ戻した新しい文書を返す。 */
export function setPanelFlavorOverride(
  preferences: PanelFlavorPreferences,
  guid: string,
  flavor: PanelFlavorId | null,
): PanelFlavorPreferences {
  if (guid.length === 0) throw new Error("panel flavor override requires a GUID");
  if (flavor !== null && !isPanelFlavorId(flavor)) {
    throw new Error("unknown panel flavor override");
  }
  const overrides = { ...preferences.overrides };
  if (flavor === null) delete overrides[guid];
  else overrides[guid] = flavor;
  return { version: 1, seed: preferences.seed, overrides };
}

/** Firefox全ブックマークGUIDとの突き合わせで、削除済み個別指定だけを除外する。 */
export function reconcilePanelFlavorOverrides(
  preferences: PanelFlavorPreferences,
  currentGuids: readonly string[],
): PanelFlavorPreferencesResult {
  const current = new Set(currentGuids);
  const overrides = Object.fromEntries(
    Object.entries(preferences.overrides).filter(([guid]) => current.has(guid)),
  ) as Record<string, PanelFlavorId>;
  return {
    preferences: { version: 1, seed: preferences.seed, overrides },
    changed: Object.keys(overrides).length !== Object.keys(preferences.overrides).length,
  };
}

/** パネル配色専用キーだけを読み込み、正規化前の値を返す。 */
export async function loadPanelFlavorPreferences(): Promise<unknown> {
  const stored = await browser.storage.local.get([PANEL_FLAVOR_PREFERENCES_STORAGE_KEY]);
  return stored[PANEL_FLAVOR_PREFERENCES_STORAGE_KEY];
}

/** seedと個別指定の防御的コピーをパネル配色専用キーへ全量保存する。 */
export async function savePanelFlavorPreferences(
  preferences: PanelFlavorPreferences,
): Promise<void> {
  await browser.storage.local.set({
    [PANEL_FLAVOR_PREFERENCES_STORAGE_KEY]: clonePanelFlavorPreferences(preferences),
  });
}

function clonePanelFlavorPreferences(
  preferences: PanelFlavorPreferences,
): PanelFlavorPreferences {
  return {
    version: 1,
    seed: preferences.seed,
    overrides: { ...preferences.overrides },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeed(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffffffff;
}

function isPanelFlavorId(value: unknown): value is PanelFlavorId {
  return typeof value === "string"
    && (PANEL_FLAVOR_IDS as readonly string[]).includes(value);
}
