import type { DisplayBookmarkItem } from "./display-item.js";

export interface IconViewModel {
  readonly guid: string;
  readonly title: string;
  readonly url: string;
}

/** 表示順を維持し、アイコン式に必要な項目だけを取り出す。 */
export function buildIconViewModels(
  items: readonly DisplayBookmarkItem[],
): IconViewModel[] {
  return items.map(({ guid, title, url }) => ({ guid, title, url }));
}
