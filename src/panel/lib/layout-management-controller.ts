import type { LayoutManagementCoordinator } from "./layout-management-coordinator.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

export interface LayoutManagementElements {
  readonly select: HTMLSelectElement;
  readonly restoreDefault: HTMLButtonElement;
  readonly manage: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly close: HTMLButtonElement;
  readonly name: HTMLInputElement;
  readonly source: HTMLSelectElement;
  readonly duplicationModes: HTMLFieldSetElement;
  readonly shared: HTMLInputElement;
  readonly independent: HTMLInputElement;
  readonly create: HTMLButtonElement;
  readonly rename: HTMLButtonElement;
  readonly preferred: HTMLButtonElement;
  readonly delete: HTMLButtonElement;
  readonly retry: HTMLButtonElement;
  readonly status: HTMLElement;
}

interface LayoutManagementControllerOptions {
  readonly document?: Pick<Document, "createElement">;
  readonly onStateChange?: (documents: DockingDocuments) => void;
}

/** 名前付きレイアウト管理操作をDOMと保存コーディネーターへ接続する。 */
export function bindLayoutManagement(
  elements: LayoutManagementElements,
  coordinator: LayoutManagementCoordinator,
  options: LayoutManagementControllerOptions = {},
): void {
  const documentRef = options.document ?? document;

  /** 保存済み状態から通常選択肢、複製元、管理操作可否を再描画する。 */
  const render = (documents: DockingDocuments): void => {
    const activeId = documents.dockingMetadata.activeLayoutId;
    const active = documents.mainLayouts.layouts.find((layout) => layout.id === activeId);
    const named = documents.mainLayouts.layouts.filter((layout) => !layout.systemDefault);
    replaceOptions(elements.select, named, "名前付きレイアウトを選択", documentRef);
    elements.select.value = named.some((layout) => layout.id === activeId) ? activeId : "";

    elements.source.textContent = "";
    appendOption(elements.source, "", "空白から作成", documentRef);
    for (const layout of documents.mainLayouts.layouts) {
      appendOption(elements.source, layout.id, layout.name, documentRef);
    }
    elements.source.value = "";
    elements.duplicationModes.disabled = true;

    const manageable = active !== undefined && !active.systemDefault;
    elements.rename.disabled = !manageable;
    elements.delete.disabled = !manageable;
    elements.preferred.disabled = !manageable;
    elements.name.value = manageable ? active.name : "";
    elements.preferred.textContent = manageable
      && documents.dockingMetadata.preferredLayoutId === activeId
      ? "既定を解除"
      : "既定にする";
  };

  /** 非同期管理操作を実行し、成功状態またはエラーを画面へ反映する。 */
  const run = async (
    operation: () => Promise<DockingDocuments>,
    successMessage: string,
  ): Promise<void> => {
    elements.status.textContent = "保存中…";
    try {
      const documents = await operation();
      render(documents);
      elements.status.textContent = successMessage;
      options.onStateChange?.(structuredClone(documents));
      elements.retry.hidden = true;
    } catch (error) {
      elements.status.textContent = error instanceof Error ? error.message : "保存できませんでした";
      elements.retry.hidden = !coordinator.pending;
    }
  };

  elements.select.addEventListener("change", () => {
    if (elements.select.value !== "") {
      void run(() => coordinator.switchTo(elements.select.value), "レイアウトを切り替えました");
    }
  });
  elements.restoreDefault.addEventListener("click", () => {
    void run(() => coordinator.restoreDefault(), "内部デフォルトへ切り替えました");
  });
  elements.manage.addEventListener("click", () => {
    render(coordinator.state());
    elements.status.textContent = "";
    if (!elements.dialog.open) elements.dialog.showModal();
  });
  elements.close.addEventListener("click", () => elements.dialog.close());
  elements.source.addEventListener("change", () => {
    elements.duplicationModes.disabled = elements.source.value === "";
  });
  elements.create.addEventListener("click", () => {
    void run(() => coordinator.create({
      name: elements.name.value,
      sourceLayoutId: elements.source.value || null,
      duplicateBays: elements.independent.checked,
    }), "レイアウトを作成しました");
  });
  elements.rename.addEventListener("click", () => {
    const activeId = coordinator.state().dockingMetadata.activeLayoutId;
    void run(() => coordinator.rename(activeId, elements.name.value), "名前を変更しました");
  });
  elements.preferred.addEventListener("click", () => {
    const state = coordinator.state();
    const activeId = state.dockingMetadata.activeLayoutId;
    const next = state.dockingMetadata.preferredLayoutId === activeId ? undefined : activeId;
    void run(() => coordinator.setPreferred(next), next === undefined ? "既定を解除しました" : "既定にしました");
  });
  elements.delete.addEventListener("click", () => {
    const activeId = coordinator.state().dockingMetadata.activeLayoutId;
    void run(() => coordinator.delete(activeId), "レイアウトを削除しました");
  });
  elements.retry.addEventListener("click", () => {
    void run(() => coordinator.retry(), "保存を再試行しました");
  });

  elements.retry.hidden = true;
  render(coordinator.state());
}

/** selectの内容をプレースホルダーと指定レイアウトへ置換する。 */
function replaceOptions(
  select: HTMLSelectElement,
  layouts: readonly { readonly id: string; readonly name: string }[],
  placeholder: string,
  documentRef: Pick<Document, "createElement">,
): void {
  select.textContent = "";
  appendOption(select, "", placeholder, documentRef);
  for (const layout of layouts) appendOption(select, layout.id, layout.name, documentRef);
}

/** 1つのoption要素を生成してselectへ追加する。 */
function appendOption(
  select: HTMLSelectElement,
  value: string,
  label: string,
  documentRef: Pick<Document, "createElement">,
): void {
  const option = documentRef.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}
