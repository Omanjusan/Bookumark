import {
  DEFAULT_FOLDER_FRAME_ROWS,
  MAX_FOLDER_FRAME_ROWS,
  MIN_FOLDER_FRAME_ROWS,
} from "./folder-item-frame-rows.js";

export const FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY = "folderFrameRowPreferences.v1";

export interface FolderFrameRowPreferences {
  readonly version: 1;
  readonly defaultRows: number;
}

export interface FolderFrameRowPreferencesResult {
  readonly preferences: FolderFrameRowPreferences;
  readonly changed: boolean;
}

/** 未保存・破損したフォルダ欄既定段数を3段へ補正する。 */
export function normalizeFolderFrameRowPreferences(
  candidate: unknown,
): FolderFrameRowPreferencesResult {
  if (!isRecord(candidate)
    || candidate.version !== 1
    || Object.keys(candidate).length !== 2
    || !isValidRows(candidate.defaultRows)) {
    return {
      preferences: { version: 1, defaultRows: DEFAULT_FOLDER_FRAME_ROWS },
      changed: true,
    };
  }
  return {
    preferences: { version: 1, defaultRows: candidate.defaultRows },
    changed: false,
  };
}

/** フォルダ欄既定段数の専用キーから正規化前の値を読み込む。 */
export async function loadFolderFrameRowPreferences(): Promise<unknown> {
  const stored = await browser.storage.local.get([FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY]);
  return stored[FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY];
}

/** フォルダ欄既定段数だけを専用キーへ保存する。 */
export async function saveFolderFrameRowPreferences(
  preferences: FolderFrameRowPreferences,
): Promise<void> {
  await browser.storage.local.set({
    [FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY]: {
      version: 1,
      defaultRows: preferences.defaultRows,
    },
  });
}

/** unknownが合意した1～5の整数か判定する。 */
function isValidRows(value: unknown): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= MIN_FOLDER_FRAME_ROWS
    && value <= MAX_FOLDER_FRAME_ROWS;
}

/** unknownが非配列オブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
