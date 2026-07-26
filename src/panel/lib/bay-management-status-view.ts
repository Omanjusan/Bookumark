interface BayManagementStatusElements {
  readonly menu: HTMLElement;
  readonly workspace: HTMLElement;
  readonly status: HTMLElement;
  readonly message: HTMLElement;
}

export type BayManagementStatus =
  | { readonly status: "editing" }
  | { readonly status: "deletion-pending"; readonly referencedLayoutCount: number }
  | { readonly status: "deleted" };

/** 削除予定の参照数または削除完了状態をベイ工場へ表示する。 */
export function renderBayManagementStatus(
  elements: BayManagementStatusElements,
  state: BayManagementStatus,
): void {
  elements.status.dataset.status = state.status;
  elements.menu.hidden = state.status === "deleted";
  elements.workspace.hidden = state.status === "deleted";
  if (state.status === "editing") {
    elements.status.hidden = true;
    elements.message.textContent = "";
  } else if (state.status === "deletion-pending") {
    elements.status.hidden = false;
    elements.message.textContent = `このベイは${state.referencedLayoutCount}個のレイアウトから削除されます`;
  } else {
    elements.status.hidden = false;
    elements.message.textContent = "ベイを削除しました";
  }
}
