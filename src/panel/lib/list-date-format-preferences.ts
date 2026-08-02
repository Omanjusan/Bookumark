export const LIST_DATE_FORMAT_IDS = [
  "browser",
  "iso",
  "ja-JP",
  "en-US",
  "en-GB",
  "de-DE",
] as const;

export type ListDateFormatId = typeof LIST_DATE_FORMAT_IDS[number];

export const LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY = "listDateFormatPreferences.v1";

export interface ListDateFormatPreferences {
  readonly version: 1;
  readonly format: ListDateFormatId;
}

export interface ListDateFormatPreferencesResult {
  readonly preferences: ListDateFormatPreferences;
  readonly changed: boolean;
}

interface DateTimeFormatter {
  format(value: Date): string;
}

type DateTimeFormatterFactory = (
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) => DateTimeFormatter;

const DEFAULT_PREFERENCES: ListDateFormatPreferences = { version: 1, format: "browser" };
const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

/** 未保存・破損値をブラウザー方式へ補正し、再保存の必要性を返す。 */
export function normalizeListDateFormatPreferences(
  candidate: unknown,
): ListDateFormatPreferencesResult {
  if (!isRecord(candidate)
    || candidate.version !== 1
    || !isListDateFormatId(candidate.format)) {
    return { preferences: { ...DEFAULT_PREFERENCES }, changed: true };
  }
  return {
    preferences: { version: 1, format: candidate.format },
    changed: false,
  };
}

/** 選択方式に従い、秒を含まないローカル日時文字列を生成する。 */
export function formatListDateTime(
  timestamp: number,
  preferences: ListDateFormatPreferences,
  formatterFactory: DateTimeFormatterFactory = (locale, options) => (
    new Intl.DateTimeFormat(locale, options)
  ),
): string {
  const date = new Date(timestamp);
  if (preferences.format === "iso") return localIsoDateTimeOf(date);
  const locale = preferences.format === "browser" ? undefined : preferences.format;
  return formatterFactory(locale, DATE_TIME_OPTIONS).format(date);
}

/** 一覧日時設定専用キーを読み込み、正規化前の値を返す。 */
export async function loadListDateFormatPreferences(): Promise<unknown> {
  const stored = await browser.storage.local.get([LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY]);
  return stored[LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY];
}

/** 日時方式だけを防御的コピーして専用キーへ保存する。 */
export async function saveListDateFormatPreferences(
  preferences: ListDateFormatPreferences,
): Promise<void> {
  await browser.storage.local.set({
    [LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY]: {
      version: 1,
      format: preferences.format,
    },
  });
}

/** ISO風の年月日時分を、ブラウザーと同じローカルタイムゾーンで生成する。 */
function localIsoDateTimeOf(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
    + ` ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

/** 0以上の整数を最低2桁へ揃える。 */
function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** unknownが非配列オブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** unknownが対応済み日時方式IDか判定する。 */
function isListDateFormatId(value: unknown): value is ListDateFormatId {
  return typeof value === "string"
    && (LIST_DATE_FORMAT_IDS as readonly string[]).includes(value);
}
