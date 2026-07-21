type PanelStatusState =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | {
    readonly status: "error";
    readonly error: unknown;
    readonly reportError: (error: unknown) => void;
  };

type StatusDocument = Pick<Document, "createElement">;

/** グリッド以外の状態を、詳細を画面へ露出せず排他的に描画する。 */
export function renderPanelStatus(
  root: HTMLElement,
  state: PanelStatusState,
  ownerDocument: StatusDocument = document,
): void {
  root.textContent = "";
  const element = ownerDocument.createElement("p");
  element.className = state.status === "error" ? "status error" : "status";

  switch (state.status) {
    case "loading":
      element.textContent = "読み込み中…";
      break;
    case "empty":
      element.textContent = "ブックマークがありません";
      break;
    case "error":
      element.textContent = "読み込みに失敗しました";
      state.reportError(state.error);
      break;
  }
  root.appendChild(element);
}
