import {
  renderBayFactoryEditor,
} from "./bay-factory-static-view.js";
import type {
  BayFactoryViewModel,
} from "./bay-factory-static-view.js";

export interface SelectableBayFactoryViewModel extends BayFactoryViewModel {
  readonly permanent: boolean;
}

export interface BayFactoryElements {
  readonly entry: HTMLButtonElement;
  readonly selection: HTMLElement;
  readonly select: HTMLSelectElement;
  readonly open: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly close: HTMLButtonElement;
  readonly name: HTMLInputElement;
  readonly editor: HTMLElement;
}

interface BayFactoryControllerOptions {
  readonly document?: Pick<Document, "createElement">;
  readonly onSelectionChange?: (bayId: string | null) => void;
  readonly onClose?: () => void;
}

/** ユーザーベイの対象選択と静的ベイ工場の開閉をDOMへ接続する。 */
export function bindBayFactory(
  elements: BayFactoryElements,
  bays: readonly SelectableBayFactoryViewModel[],
  options: BayFactoryControllerOptions = {},
): void {
  const documentRef = options.document ?? document;
  const editableBays = bays.filter((bay) => !bay.permanent);
  const bayById = new Map(editableBays.map((bay) => [bay.bayId, bay]));
  renderBayOptions(elements.select, editableBays, documentRef);
  elements.open.disabled = true;

  elements.entry.addEventListener("click", () => {
    elements.selection.hidden = !elements.selection.hidden;
    if (elements.selection.hidden) {
      elements.select.value = "";
      elements.open.disabled = true;
      options.onSelectionChange?.(null);
    }
  });

  elements.select.addEventListener("change", () => {
    const bay = bayById.get(elements.select.value);
    elements.open.disabled = bay === undefined;
    options.onSelectionChange?.(bay?.bayId ?? null);
  });

  const openSelected = (): void => {
    const bay = bayById.get(elements.select.value);
    if (bay === undefined) return;
    elements.name.value = bay.name;
    renderBayFactoryEditor(elements.editor, bay, { document: documentRef });
    if (!elements.dialog.open) elements.dialog.showModal();
  };
  elements.open.addEventListener("click", openSelected);
  elements.select.addEventListener("dblclick", openSelected);
  elements.select.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      openSelected();
    }
  });

  const closeFactory = (): void => {
    if (elements.dialog.open) elements.dialog.close();
    options.onClose?.();
  };
  elements.close.addEventListener("click", closeFactory);
  elements.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeFactory();
  });
}

/** 空の初期選択肢と編集可能なユーザーベイだけをselectへ描画する。 */
function renderBayOptions(
  select: HTMLSelectElement,
  bays: readonly SelectableBayFactoryViewModel[],
  documentRef: Pick<Document, "createElement">,
): void {
  select.textContent = "";
  const placeholder = documentRef.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "編集するベイを選択";
  select.appendChild(placeholder);
  for (const bay of bays) {
    const option = documentRef.createElement("option");
    option.value = bay.bayId;
    option.textContent = bay.name;
    select.appendChild(option);
  }
  select.value = "";
}
