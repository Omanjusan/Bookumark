import type { ListViewModel } from "./list-view-model.js";
import type {
  DisplaySortSelection,
  StandardSortAxisId,
} from "./display-state.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface ListViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
  readonly sort?: DisplaySortSelection<StandardSortAxisId>;
  readonly onSort?: (selection: DisplaySortSelection<StandardSortAxisId>) => void;
  readonly onDateSettings?: () => void;
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
  table.appendChild(headerOf(documentRef, options.sort, options.onSort));
  const body = documentRef.createElement("tbody");
  for (const item of items) body.appendChild(rowOf(documentRef, item, draggable));
  table.appendChild(body);
  scroll.appendChild(table);
  if (options.onDateSettings) {
    scroll.appendChild(dateSettingsButtonOf(documentRef, options.onDateSettings));
  }
  root.appendChild(scroll);
  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "end", items[items.length - 1].guid));
  }
}

/** 一覧右上へ日付表示設定を開く歯車を生成する。 */
function dateSettingsButtonOf(
  documentRef: Pick<Document, "createElement">,
  onOpen: () => void,
): HTMLButtonElement {
  const button = documentRef.createElement("button");
  button.className = "list-date-settings-button";
  button.type = "button";
  button.textContent = "⚙";
  button.setAttribute("aria-label", "一覧の日付表示設定");
  button.addEventListener("click", onOpen);
  return button;
}

/** 別軸は昇順で選択し、選択中の同一軸だけ方向を反転する。 */
export function nextListSortSelection(
  current: DisplaySortSelection<StandardSortAxisId>,
  axisId: StandardSortAxisId,
): DisplaySortSelection<StandardSortAxisId> {
  return {
    axisId,
    direction: current.axisId === axisId && current.direction === "asc" ? "desc" : "asc",
  };
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
function headerOf(
  documentRef: Pick<Document, "createElement">,
  sort: DisplaySortSelection<StandardSortAxisId> | undefined,
  onSort: ((selection: DisplaySortSelection<StandardSortAxisId>) => void) | undefined,
): HTMLTableSectionElement {
  const head = documentRef.createElement("thead");
  const row = documentRef.createElement("tr");
  const iconHeader = documentRef.createElement("th");
  iconHeader.className = "list-header list-header-icon";
  iconHeader.setAttribute("scope", "col");
  row.appendChild(iconHeader);
  for (const [axisId, className, label] of SORTABLE_HEADERS) {
    row.appendChild(sortHeaderOf(documentRef, axisId, className, label, sort, onSort));
  }
  head.appendChild(row);
  return head;
}

const SORTABLE_HEADERS: readonly (readonly [StandardSortAxisId, string, string])[] = [
  ["title", "list-header-title", "タイトル"],
  ["dateAdded", "list-header-date-added", "登録日時"],
  ["lastVisitTime", "list-header-last-visit", "最終訪問日時"],
  ["visitCount", "list-header-visit-count", "訪問回数"],
];

/** 共有ソート状態と同期する1つの列見出しボタンを生成する。 */
function sortHeaderOf(
  documentRef: Pick<Document, "createElement">,
  axisId: StandardSortAxisId,
  className: string,
  label: string,
  sort: DisplaySortSelection<StandardSortAxisId> | undefined,
  onSort: ((selection: DisplaySortSelection<StandardSortAxisId>) => void) | undefined,
): HTMLTableCellElement {
  const header = documentRef.createElement("th");
  header.className = `list-header ${className}`;
  header.setAttribute("scope", "col");
  const active = sort?.axisId === axisId;
  header.setAttribute("aria-sort", active
    ? (sort.direction === "asc" ? "ascending" : "descending")
    : "none");
  const button = documentRef.createElement("button");
  button.className = "list-sort-button";
  button.dataset.sortAxis = axisId;
  button.textContent = active ? `${label} ${sort.direction === "asc" ? "▲" : "▼"}` : label;
  button.addEventListener("click", () => {
    const current = sort ?? { axisId, direction: "desc" };
    onSort?.(nextListSortSelection(current, axisId));
  });
  header.appendChild(button);
  return header;
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
