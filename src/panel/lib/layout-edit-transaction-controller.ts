export interface LayoutEditTransactionSession {
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saving: boolean;
  undo(): boolean;
  redo(): boolean;
}

interface LayoutEditTransactionElements {
  readonly undo: HTMLButtonElement;
  readonly redo: HTMLButtonElement;
  readonly save: HTMLButtonElement;
  readonly delete: HTMLButtonElement;
  readonly exit: HTMLButtonElement;
  readonly unsaved: HTMLElement;
}

interface LayoutEditTransactionOptions {
  readonly onStateChange: () => void;
  readonly onSave: () => void;
  readonly onDelete: () => void;
}

export interface LayoutEditTransactionConnection {
  refresh(): void;
  disconnect(): void;
}

/** 配置履歴と未保存・保存中状態を編集バーの操作へ同期する。 */
export function bindLayoutEditTransaction(
  session: LayoutEditTransactionSession,
  elements: LayoutEditTransactionElements,
  options: LayoutEditTransactionOptions,
): LayoutEditTransactionConnection {
  /** 現在の履歴、未保存、保存中状態から全ボタン表示を更新する。 */
  const refresh = (): void => {
    elements.undo.disabled = session.saving || !session.canUndo;
    elements.redo.disabled = session.saving || !session.canRedo;
    elements.save.disabled = session.saving || !session.dirty;
    elements.delete.disabled = session.saving;
    elements.exit.disabled = session.saving;
    elements.unsaved.hidden = !session.dirty;
  };
  const onUndo = (): void => {
    if (session.saving || !session.canUndo || !session.undo()) return;
    options.onStateChange();
    refresh();
  };
  const onRedo = (): void => {
    if (session.saving || !session.canRedo || !session.redo()) return;
    options.onStateChange();
    refresh();
  };
  const onSave = (): void => {
    if (session.saving || !session.dirty) return;
    options.onSave();
  };
  const onDelete = (): void => {
    if (session.saving) return;
    options.onDelete();
  };

  elements.undo.addEventListener("click", onUndo);
  elements.redo.addEventListener("click", onRedo);
  elements.save.addEventListener("click", onSave);
  elements.delete.addEventListener("click", onDelete);
  refresh();

  return {
    refresh,
    disconnect(): void {
      elements.undo.removeEventListener("click", onUndo);
      elements.redo.removeEventListener("click", onRedo);
      elements.save.removeEventListener("click", onSave);
      elements.delete.removeEventListener("click", onDelete);
    },
  };
}
