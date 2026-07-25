import type { CardViewModel } from "./card-view-model.js";

const FALLBACK_FAVICON_PATH = "icons/bookmark.svg";

interface CardViewOptions {
  readonly draggable?: boolean;
  readonly document?: Pick<Document, "createElement">;
}

/** カードモデルを既存のクリック・D&D契約を持つ均一グリッドへ描画する。 */
export function renderCardView(
  root: HTMLElement,
  items: readonly CardViewModel[],
  options: CardViewOptions = {},
): void {
  root.textContent = "";
  const documentRef = options.document ?? document;
  const draggable = options.draggable ?? false;

  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "start", items[0].guid));
  }
  const grid = documentRef.createElement("ul");
  grid.className = "card-view";
  for (const item of items) grid.appendChild(cardOf(documentRef, item, draggable));
  root.appendChild(grid);
  if (draggable && items.length > 0) {
    root.appendChild(boundaryOf(documentRef, "end", items[items.length - 1].guid));
  }
}

function cardOf(
  documentRef: Pick<Document, "createElement">,
  item: CardViewModel,
  draggable: boolean,
): HTMLLIElement {
  const card = documentRef.createElement("li");
  card.className = "panel-tile card-tile";
  card.dataset.guid = item.guid;
  card.dataset.url = item.url;
  card.title = item.url;
  card.tabIndex = 0;
  card.draggable = draggable;
  card.setAttribute("role", "link");

  const icon = documentRef.createElement("img");
  icon.className = "card-view-image";
  icon.src = FALLBACK_FAVICON_PATH;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  card.appendChild(icon);

  const content = documentRef.createElement("div");
  content.className = "card-content";
  appendText(documentRef, content, "card-title", item.title);
  appendText(documentRef, content, "card-domain", item.domain);
  appendText(documentRef, content, "card-meta", item.visitText, true);
  appendText(documentRef, content, "card-meta", item.lastVisitText, true);
  card.appendChild(content);
  return card;
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
  preserveFullText = false,
): void {
  const element = documentRef.createElement("span");
  element.className = className;
  element.textContent = text;
  if (preserveFullText) element.title = text;
  parent.appendChild(element);
}
