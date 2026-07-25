import type { DisplayBookmarkItem } from "./display-item.js";

export interface CardViewModel {
  readonly guid: string;
  readonly title: string;
  readonly url: string;
  readonly domain: string;
  readonly visitText: string;
  readonly lastVisitText: string;
}

interface CardViewModelOptions {
  readonly formatDateTime?: (timestamp: number) => string;
}

/** 表示順を維持し、履歴の状態を区別したカードモデルへ変換する。 */
export function buildCardViewModels(
  items: readonly DisplayBookmarkItem[],
  options: CardViewModelOptions = {},
): CardViewModel[] {
  const formatDateTime = options.formatDateTime ?? ((timestamp) => {
    return formatLocalDateTime(timestamp) ?? "";
  });
  return items.map((item) => ({
    guid: item.guid,
    title: item.title,
    url: item.url,
    domain: hostnameOf(item.url),
    visitText: visitTextOf(item.visitCount),
    lastVisitText: lastVisitTextOf(item.lastVisitTime, formatDateTime),
  }));
}

/** 有効なタイムスタンプをローカル日時の分単位へ整形する。 */
export function formatLocalDateTime(timestamp: number): string | null {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1, 2),
    pad(date.getDate(), 2),
  ].join("/") + " " + [
    pad(date.getHours(), 2),
    pad(date.getMinutes(), 2),
  ].join(":");
}

function visitTextOf(visitCount: number | undefined): string {
  if (!Number.isInteger(visitCount) || visitCount === undefined || visitCount < 0) {
    return "訪問回数: 履歴不明";
  }
  return visitCount === 0 ? "訪問回数: 未訪問" : `訪問回数: ${visitCount}回`;
}

function lastVisitTextOf(
  lastVisitTime: number | undefined,
  formatDateTime: (timestamp: number) => string,
): string {
  if (lastVisitTime === undefined || !Number.isFinite(lastVisitTime)) {
    return "最終訪問: 記録なし";
  }
  const formatted = formatDateTime(lastVisitTime);
  return formatted ? `最終訪問: ${formatted}` : "最終訪問: 記録なし";
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}
