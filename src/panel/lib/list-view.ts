import type { ListViewModel } from "./list-view-model.js";
import type {
  DisplaySortSelection,
  StandardSortAxisId,
} from "./display-state.js";
import {
  DEFAULT_LIST_COLUMN_WIDTHS,
  LIST_COLUMN_IDS,
  LIST_COLUMN_MIN_WIDTHS,
} from "./list-column-width-preferences.js";
import type {
  ListColumnId,
  ListColumnWidths,
} from "./list-column-width-preferences.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface ListViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
  readonly sort?: DisplaySortSelection<StandardSortAxisId>;
  readonly onSort?: (selection: DisplaySortSelection<StandardSortAxisId>) => void;
  readonly onDateSettings?: () => void;
  readonly columnWidths?: ListColumnWidths;
  readonly onColumnResize?: (columnId: ListColumnId, width: number) => void;
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
  const widths = options.columnWidths ?? DEFAULT_LIST_COLUMN_WIDTHS;
  const columns = columnsOf(documentRef, widths);
  table.style.width = `${totalWidth(widths)}px`;
  table.appendChild(columns.group);
  table.appendChild(headerOf(
    documentRef,
    table,
    columns.byId,
    widths,
    options.sort,
    options.onSort,
    options.onColumnResize,
  ));
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

interface ListColumns {
  readonly group: HTMLTableColElement;
  readonly byId: Readonly<Record<ListColumnId, HTMLTableColElement>>;
}

const COLUMN_CLASSES: Readonly<Record<ListColumnId, string>> = {
  icon: "list-col-icon",
  title: "list-col-title",
  dateAdded: "list-col-date-added",
  lastVisitTime: "list-col-last-visit",
  visitCount: "list-col-visit-count",
};

/** 保存済み幅を適用した5列のcol要素群を生成する。 */
function columnsOf(
  documentRef: Pick<Document, "createElement">,
  widths: ListColumnWidths,
): ListColumns {
  const group = documentRef.createElement("colgroup");
  const byId = {} as Record<ListColumnId, HTMLTableColElement>;
  for (const columnId of LIST_COLUMN_IDS) {
    const column = documentRef.createElement("col");
    column.className = COLUMN_CLASSES[columnId];
    column.style.width = `${widths[columnId]}px`;
    byId[columnId] = column;
    group.appendChild(column);
  }
  return { group, byId };
}

/** アイコン名を可視表示しない5列ヘッダーを生成する。 */
function headerOf(
  documentRef: Pick<Document, "createElement">,
  table: HTMLTableElement,
  columns: Readonly<Record<ListColumnId, HTMLTableColElement>>,
  widths: ListColumnWidths,
  sort: DisplaySortSelection<StandardSortAxisId> | undefined,
  onSort: ((selection: DisplaySortSelection<StandardSortAxisId>) => void) | undefined,
  onColumnResize: ((columnId: ListColumnId, width: number) => void) | undefined,
): HTMLTableSectionElement {
  const head = documentRef.createElement("thead");
  const row = documentRef.createElement("tr");
  const iconHeader = documentRef.createElement("th");
  iconHeader.className = "list-header list-header-icon";
  iconHeader.setAttribute("scope", "col");
  iconHeader.appendChild(resizeHandleOf(
    documentRef, table, columns.icon, "icon", widths, onColumnResize,
  ));
  row.appendChild(iconHeader);
  for (const [axisId, className, label] of SORTABLE_HEADERS) {
    const header = sortHeaderOf(documentRef, axisId, className, label, sort, onSort);
    header.appendChild(resizeHandleOf(
      documentRef, table, columns[axisId], axisId, widths, onColumnResize,
    ));
    row.appendChild(header);
  }
  head.appendChild(row);
  return head;
}

/** 右端ドラッグを対象列だけの幅変更へ変換し、完了時だけ保存を通知する。 */
function resizeHandleOf(
  documentRef: Pick<Document, "createElement">,
  table: HTMLTableElement,
  column: HTMLTableColElement,
  columnId: ListColumnId,
  widths: ListColumnWidths,
  onCommit: ((columnId: ListColumnId, width: number) => void) | undefined,
): HTMLSpanElement {
  const handle = documentRef.createElement("span");
  handle.className = "list-column-resize-handle";
  handle.dataset.columnResize = columnId;
  handle.textContent = "|";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("aria-label", `${columnLabel(columnId)}列の幅を変更`);
  handle.setAttribute("aria-valuemin", String(LIST_COLUMN_MIN_WIDTHS[columnId]));
  handle.setAttribute("aria-valuenow", String(widths[columnId]));

  let activeTableWidth = totalWidth(widths);
  let startTableWidth = activeTableWidth;
  let startX = 0;
  let startWidth = widths[columnId];
  let activeWidth = startWidth;
  let pointerId: number | null = null;
  const applyWidth = (width: number): void => {
    activeWidth = width;
    column.style.width = `${width}px`;
    table.style.width = `${startTableWidth - startWidth + width}px`;
    handle.setAttribute("aria-valuenow", String(width));
  };
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startX = event.clientX;
    startWidth = activeWidth;
    startTableWidth = activeTableWidth;
    pointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    applyWidth(Math.max(
      LIST_COLUMN_MIN_WIDTHS[columnId],
      Math.round(startWidth + event.clientX - startX),
    ));
  });
  handle.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;
    handle.releasePointerCapture(event.pointerId);
    pointerId = null;
    if (activeWidth !== startWidth) {
      activeTableWidth = startTableWidth - startWidth + activeWidth;
      onCommit?.(columnId, activeWidth);
    }
  });
  handle.addEventListener("pointercancel", (event) => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    applyWidth(startWidth);
  });
  return handle;
}

/** 列幅文書の合計をテーブルの明示幅へ変換する。 */
function totalWidth(widths: ListColumnWidths): number {
  return LIST_COLUMN_IDS.reduce((sum, columnId) => sum + widths[columnId], 0);
}

/** リサイズ区切りのアクセシブル名に使う列名を返す。 */
function columnLabel(columnId: ListColumnId): string {
  return {
    icon: "アイコン",
    title: "タイトル",
    dateAdded: "登録日時",
    lastVisitTime: "最終訪問日時",
    visitCount: "訪問回数",
  }[columnId];
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
