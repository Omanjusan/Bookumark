import { createNewBayDraft } from "./bay-management.js";
import type { NewBayDraft } from "./bay-management.js";
import type { BayFactoryViewModel } from "./bay-factory-static-view.js";

interface NewBayFactoryElements {
  readonly add: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly name: HTMLInputElement;
}

interface NewBayFactoryOptions {
  readonly createTemporaryId: () => string;
  readonly render: (model: BayFactoryViewModel) => void;
  readonly onStartEditing?: (draft: NewBayDraft) => void;
  readonly onDraftChange?: (draft: NewBayDraft) => void;
  readonly onNameError?: (error: unknown) => void;
}

export interface NewBayFactoryController {
  draft(): NewBayDraft | null;
  discard(): void;
  disconnect(): void;
}

/** 「ベイを追加」入口と未保存の空ベイドラフトをベイ工場へ接続する。 */
export function bindNewBayFactory(
  elements: NewBayFactoryElements,
  options: NewBayFactoryOptions,
): NewBayFactoryController {
  let draft: NewBayDraft | null = null;

  /** 現在の一時ドラフトを工場用表示モデルへ反映する。 */
  const renderDraft = (): void => {
    if (draft === null) return;
    options.render({ bayId: draft.temporaryId, name: draft.name, chips: [] });
  };

  const onAdd = (): void => {
    draft = createNewBayDraft(options.createTemporaryId(), "新しいベイ");
    elements.name.disabled = false;
    elements.name.value = draft.name;
    if (options.onStartEditing) options.onStartEditing(structuredClone(draft));
    else renderDraft();
    if (!elements.dialog.open) elements.dialog.showModal();
  };

  const onNameChange = (): void => {
    if (draft === null) return;
    // 委譲先の通常編集セッションが名前とチップを一体管理する。
    if (options.onStartEditing) return;
    try {
      const renamed = createNewBayDraft(draft.temporaryId, elements.name.value);
      draft = { ...renamed, chips: draft.chips };
      elements.name.value = draft.name;
      renderDraft();
      options.onDraftChange?.(structuredClone(draft));
    } catch (error: unknown) {
      elements.name.value = draft.name;
      options.onNameError?.(error);
    }
  };

  elements.add.addEventListener("click", onAdd);
  elements.name.addEventListener("change", onNameChange);

  return {
    /** 外側と状態共有しない現在の一時ドラフトを返す。 */
    draft: (): NewBayDraft | null => draft === null ? null : structuredClone(draft),
    /** 永続化やダイアログ操作を行わず一時ドラフトだけを破棄する。 */
    discard(): void {
      draft = null;
      elements.name.disabled = true;
    },
    disconnect(): void {
      elements.add.removeEventListener("click", onAdd);
      elements.name.removeEventListener("change", onNameChange);
    },
  };
}
