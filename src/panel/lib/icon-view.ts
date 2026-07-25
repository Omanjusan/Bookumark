import type { IconViewModel } from "./icon-view-model.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface IconViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
}

/** アイコンモデルを既存のクリック・D&D契約を持つ均一グリッドへ描画する。 */
export function renderIconView(
  root: HTMLElement,
  items: readonly IconViewModel[],
  options: IconViewOptions = {},
): void {
  root.textContent = "";
  const documentRef = options.document ?? document;
  const draggable = options.draggable ?? false;

  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "start", items[0].guid));
  }
  const grid = documentRef.createElement("ul");
  grid.className = "icon-view";
  for (const item of items) grid.appendChild(tileOf(documentRef, item, draggable));
  root.appendChild(grid);
  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "end", items[items.length - 1].guid));
  }
}

function tileOf(
  documentRef: Pick<Document, "createElement">,
  item: IconViewModel,
  draggable: boolean,
): HTMLLIElement {
  const tile = documentRef.createElement("li");
  tile.className = "panel-tile icon-tile";
  tile.dataset.guid = item.guid;
  tile.dataset.url = item.url;
  tile.title = item.url;
  tile.tabIndex = 0;
  tile.draggable = draggable;
  tile.setAttribute("role", "link");

  const icon = documentRef.createElement("img");
  icon.className = "icon-view-image";
  icon.src = FALLBACK_FAVICON_PATH;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  tile.appendChild(icon);

  const title = documentRef.createElement("span");
  title.className = "icon-view-title";
  title.textContent = item.title;
  tile.appendChild(title);
  return tile;
}

function boundaryOf(
  documentRef: Pick<Document, "createElement">,
  position: "start" | "end",
  targetGuid: string,
): HTMLDivElement {
  const boundary = documentRef.createElement("div");
  boundary.className = "panel-drop-boundary";
  boundary.dataset.boundary = position;
  boundary.dataset.targetGuid = targetGuid;
  boundary.setAttribute("aria-hidden", "true");
  return boundary;
}
