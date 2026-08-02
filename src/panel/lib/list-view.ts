import type { ListViewModel } from "./list-view-model.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface ListViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
}

/** 一覧モデルを既存のクリック・D&D契約を持つ5列テーブルとして描画する。 */
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
  const scroll = documentRef.createElement("div");
  scroll.className = "list-view-scroll";
  const table = documentRef.createElement("table");
  table.className = "list-view";
  table.appendChild(columnsOf(documentRef));
  table.appendChild(headerOf(documentRef));
  const body = documentRef.createElement("tbody");
  for (const item of items) body.appendChild(rowOf(documentRef, item, draggable));
  table.appendChild(body);
  scroll.appendChild(table);
  root.appendChild(scroll);
  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "end", items[items.length - 1].guid));
  }
}

/** 5列の固定幅契約をCSSへ渡すcol要素群を生成する。 */
function columnsOf(documentRef: Pick<Document, "createElement">): HTMLTableColElement {
  const group = documentRef.createElement("colgroup");
  for (const className of ["list-col-icon", "list-col-title", "list-col-date-added",
    "list-col-last-visit", "list-col-visit-count"]) {
    const column = documentRef.createElement("col");
    column.className = className;
    group.appendChild(column);
  }
  return group;
}

/** アイコン名を可視表示しない5列ヘッダーを生成する。 */
function headerOf(documentRef: Pick<Document, "createElement">): HTMLTableSectionElement {
  const head = documentRef.createElement("thead");
  const row = documentRef.createElement("tr");
  for (const [className, text] of [
    ["list-header-icon", ""],
    ["list-header-title", "タイトル"],
    ["list-header-date-added", "登録日時"],
    ["list-header-last-visit", "最終訪問日時"],
    ["list-header-visit-count", "訪問回数"],
  ]) {
    const header = documentRef.createElement("th");
    header.className = `list-header ${className}`;
    header.setAttribute("scope", "col");
    header.textContent = text;
    row.appendChild(header);
  }
  head.appendChild(row);
  return head;
}

function rowOf(
  documentRef: Pick<Document, "createElement">,
  item: ListViewModel,
  draggable: boolean,
): HTMLTableRowElement {
  const row = documentRef.createElement("tr");
  row.className = "panel-tile list-tile";
  row.dataset.guid = item.guid;
  row.dataset.url = item.url;
  row.title = item.url;
  row.tabIndex = 0;
  row.draggable = draggable;
  row.setAttribute("role", "link");

  const iconCell = documentRef.createElement("td");
  iconCell.className = "list-cell list-icon-cell";
  const icon = documentRef.createElement("img");
  icon.className = "list-icon";
  icon.src = FALLBACK_FAVICON_PATH;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  iconCell.appendChild(icon);
  row.appendChild(iconCell);

  appendCell(documentRef, row, "list-title", item.title);
  appendCell(documentRef, row, "list-date-added", item.dateAddedText);
  appendCell(documentRef, row, "list-last-visit", item.lastVisitText);
  appendCell(documentRef, row, "list-visit-count", item.visitCountText);
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

function appendCell(
  documentRef: Pick<Document, "createElement">,
  parent: HTMLTableRowElement,
  className: string,
  text: string,
): void {
  const element = documentRef.createElement("td");
  element.className = `list-cell ${className}`;
  element.textContent = text;
  parent.appendChild(element);
}
