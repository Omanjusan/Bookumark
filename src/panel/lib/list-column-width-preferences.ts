export const LIST_COLUMN_IDS = [
  "icon",
  "title",
  "dateAdded",
  "lastVisitTime",
  "visitCount",
] as const;

export type ListColumnId = typeof LIST_COLUMN_IDS[number];
export type ListColumnWidths = Readonly<Record<ListColumnId, number>>;

export const LIST_COLUMN_MIN_WIDTHS: ListColumnWidths = {
  icon: 24,
  title: 60,
  dateAdded: 64,
  lastVisitTime: 64,
  visitCount: 36,
};

export const DEFAULT_LIST_COLUMN_WIDTHS: ListColumnWidths = {
  icon: 24,
  title: 292,
  dateAdded: 160,
  lastVisitTime: 160,
  visitCount: 84,
};

export const LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY = "listColumnWidthPreferences.v1";

export interface ListColumnWidthPreferences {
  readonly version: 1;
  readonly widths: ListColumnWidths;
}

export interface ListColumnWidthPreferencesResult {
  readonly preferences: ListColumnWidthPreferences;
  readonly changed: boolean;
}

/** 未保存・破損した列幅を既定値または最小幅へ補正する。 */
export function normalizeListColumnWidthPreferences(
  candidate: unknown,
): ListColumnWidthPreferencesResult {
  if (!isRecord(candidate) || candidate.version !== 1 || !isRecord(candidate.widths)) {
    return { preferences: defaultPreferences(), changed: true };
  }

  const widths = {} as Record<ListColumnId, number>;
  let changed = Object.keys(candidate.widths).length !== LIST_COLUMN_IDS.length;
  for (const columnId of LIST_COLUMN_IDS) {
    const stored = candidate.widths[columnId];
    if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= 0) {
      widths[columnId] = DEFAULT_LIST_COLUMN_WIDTHS[columnId];
      changed = true;
      continue;
    }
    widths[columnId] = Math.max(LIST_COLUMN_MIN_WIDTHS[columnId], stored);
    if (widths[columnId] !== stored) changed = true;
  }
  return { preferences: { version: 1, widths }, changed };
}

/** 指定した1列だけを更新し、最小幅を下回る値をクランプする。 */
export function setListColumnWidth(
  preferences: ListColumnWidthPreferences,
  columnId: ListColumnId,
  width: number,
): ListColumnWidthPreferences {
  if (!Number.isFinite(width)) throw new RangeError("list column width must be finite");
  return {
    version: 1,
    widths: {
      ...preferences.widths,
      [columnId]: Math.max(LIST_COLUMN_MIN_WIDTHS[columnId], width),
    },
  };
}

/** 全列を共有参照のない初期幅へ戻す。 */
export function resetListColumnWidths(): ListColumnWidthPreferences {
  return defaultPreferences();
}

/** 列幅設定専用キーを読み込み、正規化前の値を返す。 */
export async function loadListColumnWidthPreferences(): Promise<unknown> {
  const stored = await browser.storage.local.get([LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY]);
  return stored[LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY];
}

/** 5列の幅を防御的コピーして専用キーへ保存する。 */
export async function saveListColumnWidthPreferences(
  preferences: ListColumnWidthPreferences,
): Promise<void> {
  await browser.storage.local.set({
    [LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY]: {
      version: 1,
      widths: { ...preferences.widths },
    },
  });
}

/** 共有参照のない初期列幅設定を生成する。 */
function defaultPreferences(): ListColumnWidthPreferences {
  return { version: 1, widths: { ...DEFAULT_LIST_COLUMN_WIDTHS } };
}

/** unknownが非配列オブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
