import type { ListViewModel } from "./list-view-model.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface ListViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
}

/** 一覧モデルを既存のクリック・D&D契約を持つ1行タイルとして描画する。 */
export function renderListView(
  root: HTMLElement,
  items: readonly ListViewModel[],
  options: ListViewOptions = {},
): void {
  root.textContent = "";
  const documentRef = options.document ?? document;
  const draggable = options.draggable ?? false;

  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "start", items[0].guid));
  }
  const list = documentRef.createElement("ul");
  list.className = "list-view";
  for (const item of items) list.appendChild(rowOf(documentRef, item, draggable));
  root.appendChild(list);
  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "end", items[items.length - 1].guid));
  }
}

function rowOf(
  documentRef: Pick<Document, "createElement">,
  item: ListViewModel,
  draggable: boolean,
): HTMLLIElement {
  const row = documentRef.createElement("li");
  row.className = "panel-tile list-tile";
  row.dataset.guid = item.guid;
  row.dataset.url = item.url;
  row.title = item.url;
  row.tabIndex = 0;
  row.draggable = draggable;
  row.setAttribute("role", "link");

  const icon = documentRef.createElement("img");
  icon.className = "list-icon";
  icon.src = FALLBACK_FAVICON_PATH;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  row.appendChild(icon);

  appendText(documentRef, row, "list-title", item.title);
  appendText(documentRef, row, "list-domain", item.domain);
  return row;
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

function appendText(
  documentRef: Pick<Document, "createElement">,
  parent: HTMLElement,
  className: string,
  text: string,
): void {
  const element = documentRef.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
}
