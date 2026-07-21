import type { BookmarkItem } from "./bookmarks.js";
import type { PanelSize } from "./desired-size.js";

export type PanelInformationField =
  | "favicon"
  | "title"
  | "domain"
  | "scaleValue"
  | "auxiliary";

interface PanelInformationSpec {
  readonly fields: readonly PanelInformationField[];
  readonly titleLineLimit?: 1 | 2;
}

export const PANEL_INFORMATION_BY_SIZE: Readonly<Record<PanelSize, PanelInformationSpec>> = {
  "1/16": { fields: ["favicon"] },
  "1/8": { fields: ["favicon"] },
  "1/4": { fields: ["favicon", "title"], titleLineLimit: 1 },
  "1/2": { fields: ["favicon", "title"], titleLineLimit: 2 },
  "1": { fields: ["favicon", "title", "domain"] },
  "2": { fields: ["favicon", "title", "domain", "scaleValue"] },
  "4": { fields: ["favicon", "title", "domain", "scaleValue", "auxiliary"] },
};

export interface PanelTileInput {
  readonly item: BookmarkItem;
  readonly size: PanelSize;
  readonly faviconUrl?: string;
  readonly scaleValue?: string;
  readonly auxiliary?: string;
}

export interface PanelTileModel {
  readonly guid: string;
  readonly url: string;
  readonly title: string;
  readonly domain: string;
  readonly size: PanelSize;
  readonly fields: readonly PanelInformationField[];
  readonly faviconUrl?: string;
  readonly scaleValue?: string;
  readonly auxiliary?: string;
}

/** ソート済み入力から、DOMに依存しないタイル表示モデルを生成する。 */
export function buildPanelTileModels(inputs: readonly PanelTileInput[]): PanelTileModel[] {
  return inputs.map(({ item, size, faviconUrl, scaleValue, auxiliary }) => ({
    guid: item.guid,
    url: item.url,
    title: item.title,
    domain: hostnameOf(item.url),
    size,
    fields: PANEL_INFORMATION_BY_SIZE[size].fields,
    ...(faviconUrl ? { faviconUrl } : {}),
    scaleValue,
    auxiliary,
  }));
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
