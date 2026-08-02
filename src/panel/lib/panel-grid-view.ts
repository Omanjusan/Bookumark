import type { PanelInformationField, PanelTileModel } from "./panel-tile-model.js";
import { createPanelFlavorSeed, panelFlavorForGuid } from "./panel-flavor.js";
import { panelFlavorFromPreferences } from "./panel-flavor-preferences.js";
import type { PanelFlavorPreferences } from "./panel-flavor-preferences.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface PanelGridViewOptions {
  readonly draggable?: boolean;
  readonly document?: Document;
  readonly flavorSeed?: number;
  readonly flavorPreferences?: PanelFlavorPreferences;
}

const SESSION_FLAVOR_SEED = createPanelFlavorSeed();

/** 表示順に並んだモデルからパネルグリッドを描画する。 */
export function renderPanelGrid(
  root: HTMLElement,
  tiles: readonly PanelTileModel[],
  options: PanelGridViewOptions = {},
): void {
  root.textContent = "";

  const draggable = options.draggable ?? false;
  const documentRef = options.document ?? document;
  const flavorSeed = options.flavorSeed ?? SESSION_FLAVOR_SEED;
  if (draggable && tiles.length > 0) {
    root.appendChild(boundaryElementOf("start", tiles[0].guid, documentRef));
  }
  const grid = documentRef.createElement("ul");
  grid.className = "panel-grid";
  for (const tile of tiles) {
    grid.appendChild(tileElementOf(
      tile,
      draggable,
      options.flavorPreferences,
      flavorSeed,
      documentRef,
    ));
  }
  root.appendChild(grid);
  if (draggable && tiles.length > 0) {
    root.appendChild(boundaryElementOf("end", tiles[tiles.length - 1].guid, documentRef));
  }
}

function boundaryElementOf(
  position: "start" | "end",
  targetGuid: string,
  documentRef: Document,
): HTMLDivElement {
  const boundary = documentRef.createElement("div");
  boundary.className = "panel-drop-boundary";
  boundary.dataset.boundary = position;
  boundary.dataset.targetGuid = targetGuid;
  boundary.setAttribute("aria-hidden", "true");
  return boundary;
}

function tileElementOf(
  tile: PanelTileModel,
  draggable: boolean,
  flavorPreferences: PanelFlavorPreferences | undefined,
  flavorSeed: number,
  documentRef: Document,
): HTMLLIElement {
  const element = documentRef.createElement("li");
  element.className = "panel-tile";
  element.dataset.guid = tile.guid;
  element.dataset.url = tile.url;
  element.dataset.size = tile.size;
  element.dataset.panelFlavor = flavorPreferences === undefined
    ? panelFlavorForGuid(tile.guid, flavorSeed)
    : panelFlavorFromPreferences(tile.guid, flavorPreferences);
  element.title = tile.url;
  element.draggable = draggable;

  if (hasField(tile, "favicon")) {
    const favicon = documentRef.createElement("img");
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
    const title = documentRef.createElement("span");
    title.className = "panel-title";
    title.textContent = tile.title;
    element.appendChild(title);
  }

  if (hasField(tile, "domain") && tile.domain) {
    appendText(element, "panel-domain", tile.domain, documentRef);
  }
  if (hasField(tile, "scaleValue") && tile.scaleValue) {
    appendText(element, "panel-scale-value", tile.scaleValue, documentRef);
  }
  if (hasField(tile, "auxiliary") && tile.auxiliary) {
    appendText(element, "panel-auxiliary", tile.auxiliary, documentRef);
  }

  return element;
}

function hasField(tile: PanelTileModel, field: PanelInformationField): boolean {
  return tile.fields.includes(field);
}

function appendText(
  parent: HTMLElement,
  className: string,
  text: string,
  documentRef: Document,
): void {
  const element = documentRef.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
}
