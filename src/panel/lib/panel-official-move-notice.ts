export type OfficialMoveNoticeState =
  | { readonly status: "hidden" }
  | {
    readonly status: "success" | "error";
    readonly message: string;
    readonly canUndo: boolean;
  };

interface OfficialMoveNoticeElements {
  readonly root: Pick<HTMLElement, "hidden" | "dataset">;
  readonly message: Pick<HTMLElement, "textContent">;
  readonly undoButton: Pick<HTMLButtonElement, "hidden">;
}

interface OfficialMoveUndoConnection {
  disconnect(): void;
}

/** 公式移動の結果とUndo可否を通知領域へ反映する。 */
export function renderOfficialMoveNotice(
  elements: OfficialMoveNoticeElements,
  state: OfficialMoveNoticeState,
): void {
  if (state.status === "hidden") {
    elements.root.hidden = true;
    return;
  }
  elements.root.hidden = false;
  elements.root.dataset.state = state.status;
  elements.message.textContent = state.message;
  elements.undoButton.hidden = !state.canUndo;
}

/** Undoボタンを直前の公式移動取消へ接続する。 */
export function bindOfficialMoveUndo(
  button: Pick<HTMLButtonElement, "addEventListener" | "removeEventListener">,
  undo: () => void,
): OfficialMoveUndoConnection {
  const onClick = (): void => undo();
  button.addEventListener("click", onClick);
  return {
    disconnect(): void {
      button.removeEventListener("click", onClick);
    },
  };
}
