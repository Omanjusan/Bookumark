import type {
  BayPickerModel,
  PlacedBayPickerTag,
  UnplacedBayPickerTag,
} from "./bay-picker-model.js";

export interface BayPickerElements {
  readonly root: HTMLElement;
  readonly unplaced: HTMLElement;
  readonly placed: HTMLElement;
}

interface BayPickerViewOptions {
  readonly document?: Pick<Document, "createElement">;
}

const RAIL_LABELS = {
  top: "上",
  left: "左",
  right: "右",
  bottom: "下",
} as const;

/** 未配置・配置済みベイを識別情報と状態バッジを持つ2行のタグへ描画する。 */
export function renderBayPicker(
  elements: BayPickerElements,
  model: BayPickerModel,
  options: BayPickerViewOptions = {},
): void {
  const documentRef = options.document ?? document;
  elements.root.dataset.activeLayoutId = model.activeLayoutId;
  renderTagRow(elements.unplaced, model.unplaced, documentRef);
  renderTagRow(elements.placed, model.placed, documentRef);
}

/** 1区分のタグをモデル順で置換し、0件でも観測可能な空状態を残す。 */
function renderTagRow(
  root: HTMLElement,
  tags: readonly (UnplacedBayPickerTag | PlacedBayPickerTag)[],
  documentRef: Pick<Document, "createElement">,
): void {
  root.replaceChildren();
  if (tags.length === 0) {
    const empty = documentRef.createElement("p");
    empty.className = "bay-picker-empty";
    empty.textContent = "該当するベイはありません";
    root.appendChild(empty);
    return;
  }
  for (const tag of tags) root.appendChild(createTag(tag, documentRef));
}

/** 後続のクリック・D&Dで再利用できるベイタグDOMを生成する。 */
function createTag(
  tag: UnplacedBayPickerTag | PlacedBayPickerTag,
  documentRef: Pick<Document, "createElement">,
): HTMLElement {
  const button = documentRef.createElement("span");
  button.tabIndex = 0;
  button.className = "bay-picker-tag";
  button.dataset.bayId = tag.bayId;
  button.draggable = true;

  const name = documentRef.createElement("span");
  name.className = "bay-picker-tag__name";
  name.textContent = tag.name;
  button.appendChild(name);

  appendBadge(button, compactBayId(tag.bayId), "id", documentRef);
  if (tag.permanent) appendBadge(button, "デフォルト", "default", documentRef);
  if ("rail" in tag) {
    button.dataset.rail = tag.rail;
    appendBadge(button, RAIL_LABELS[tag.rail], "rail", documentRef);
  }
  return button;
}

/** タグへ用途を識別可能な小型バッジを追加する。 */
function appendBadge(
  root: HTMLElement,
  label: string,
  kind: "id" | "default" | "rail",
  documentRef: Pick<Document, "createElement">,
): void {
  const badge = documentRef.createElement("span");
  badge.className = `bay-picker-tag__badge bay-picker-tag__badge--${kind}`;
  badge.textContent = label;
  root.appendChild(badge);
}

/** 永続IDの接頭辞を省略し、同名ベイを見分ける短縮表記へ変換する。 */
function compactBayId(bayId: string): string {
  return bayId.startsWith("bay-") ? `#${bayId.slice(4)}` : bayId;
}
