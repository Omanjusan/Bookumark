import type { DisplayBookmarkItem } from "./display-item.js";
import {
  formatListDateTime,
} from "./list-date-format-preferences.js";
import type {
  ListDateFormatPreferences,
} from "./list-date-format-preferences.js";

export interface ListViewModel {
  readonly guid: string;
  readonly title: string;
  readonly url: string;
  readonly domain: string;
  readonly dateAddedText: string;
  readonly lastVisitText: string;
  readonly visitCountText: string;
}

interface ListViewModelOptions {
  readonly preferences?: ListDateFormatPreferences;
  readonly formatDateTime?: (timestamp: number) => string;
}

/** 表示順を維持し、一覧式のDOM非依存モデルへ変換する。 */
export function buildListViewModels(
  items: readonly DisplayBookmarkItem[],
  options: ListViewModelOptions = {},
): ListViewModel[] {
  const preferences = options.preferences ?? { version: 1, format: "browser" };
  const formatDateTime = options.formatDateTime
    ?? ((timestamp: number) => formatListDateTime(timestamp, preferences));
  return items.map((item) => ({
    guid: item.guid,
    title: item.title,
    url: item.url,
    domain: hostnameOf(item.url),
    dateAddedText: dateTimeTextOf(item.dateAdded, formatDateTime),
    lastVisitText: dateTimeTextOf(item.lastVisitTime, formatDateTime),
    visitCountText: visitCountTextOf(item.visitCount),
  }));
}

/** LIST-2までの現行一覧表示互換としてURLのホスト名を返す。 */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** 有効な時刻だけを整形し、欠損・非有限値はプレースホルダーへ変換する。 */
function dateTimeTextOf(
  timestamp: number | undefined,
  formatDateTime: (timestamp: number) => string,
): string {
  return timestamp !== undefined && Number.isFinite(timestamp)
    ? formatDateTime(timestamp)
    : "—";
}

/** 0を未訪問として保持し、欠損・負数・非整数だけを不明値にする。 */
function visitCountTextOf(visitCount: number | undefined): string {
  return visitCount !== undefined && Number.isInteger(visitCount) && visitCount >= 0
    ? String(visitCount)
    : "—";
}
