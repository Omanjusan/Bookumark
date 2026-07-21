import type { PanelInformationField, PanelTileModel } from "./panel-tile-model.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface PanelGridViewOptions {
  readonly draggable?: boolean;
}

/** 表示順に並んだモデルからパネルグリッドを描画する。 */
export function renderPanelGrid(
  root: HTMLElement,
  tiles: readonly PanelTileModel[],
  options: PanelGridViewOptions = {},
): void {
  root.textContent = "";

  const grid = document.createElement("ul");
  grid.className = "panel-grid";
  for (const tile of tiles) {
    grid.appendChild(tileElementOf(tile, options.draggable ?? false));
  }
  root.appendChild(grid);
}

function tileElementOf(tile: PanelTileModel, draggable: boolean): HTMLLIElement {
  const element = document.createElement("li");
  element.className = "panel-tile";
  element.dataset.guid = tile.guid;
  element.dataset.url = tile.url;
  element.dataset.size = tile.size;
  element.title = tile.url;
  element.draggable = draggable;

  if (hasField(tile, "favicon")) {
    const favicon = document.createElement("img");
    favicon.className = "panel-favicon";
    favicon.src = tile.faviconUrl ?? FALLBACK_FAVICON_PATH;
    favicon.alt = "";
    favicon.setAttribute("aria-hidden", "true");
    if (tile.faviconUrl) {
      favicon.addEventListener("error", () => {
        favicon.src = FALLBACK_FAVICON_PATH;
      }, { once: true });
    }
    element.appendChild(favicon);
  }

  if (hasField(tile, "title")) {
    const title = document.createElement("span");
    title.className = "panel-title";
    title.textContent = tile.title;
    element.appendChild(title);
  }

  if (hasField(tile, "domain") && tile.domain) {
    appendText(element, "panel-domain", tile.domain);
  }
  if (hasField(tile, "scaleValue") && tile.scaleValue) {
    appendText(element, "panel-scale-value", tile.scaleValue);
  }
  if (hasField(tile, "auxiliary") && tile.auxiliary) {
    appendText(element, "panel-auxiliary", tile.auxiliary);
  }

  return element;
}

function hasField(tile: PanelTileModel, field: PanelInformationField): boolean {
  return tile.fields.includes(field);
}

function appendText(parent: HTMLElement, className: string, text: string): void {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
}
