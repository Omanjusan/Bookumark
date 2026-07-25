import type { DisplayBookmarkItem } from "./display-item.js";

export interface ListViewModel {
  readonly guid: string;
  readonly title: string;
  readonly url: string;
  readonly domain: string;
}

/** 表示順を維持し、一覧式のDOM非依存モデルへ変換する。 */
export function buildListViewModels(
  items: readonly DisplayBookmarkItem[],
): ListViewModel[] {
  return items.map((item) => ({
    guid: item.guid,
    title: item.title,
    url: item.url,
    domain: hostnameOf(item.url),
  }));
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
