import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import type { TwoBayEditSession } from "./two-bay-edit-session.js";

export interface TwoBayEditElements {
  readonly entry: HTMLButtonElement;
  readonly menu: HTMLElement;
  readonly frame: HTMLElement;
  readonly canvas: HTMLElement;
  readonly confirm: HTMLButtonElement;
  readonly retry: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

interface TwoBayEditOptions {
  readonly getConfiguration: () => TwoBayConfiguration;
  readonly onDraft: (configuration: TwoBayConfiguration) => void;
  readonly onCancelled: (configuration: TwoBayConfiguration) => void;
  readonly onCommitted: (configuration: TwoBayConfiguration) => void;
}

export interface TwoBayEditController {
  refresh(): void;
  reset(): void;
}

/** ベイ編集導線と中央キャンバスの開始・キャンセル境界を接続する。 */
export function bindTwoBayEditMode(
  elements: TwoBayEditElements,
  session: TwoBayEditSession,
  options: TwoBayEditOptions,
): TwoBayEditController {
  /** 通常中央UIへ戻し、編集キャンバスを閉じる。 */
  const exit = (): void => {
    delete elements.frame.dataset.twoBayEditing;
    delete elements.frame.dataset.twoBayEditBlocked;
    elements.canvas.hidden = true;
  };

  /** dirty、保存中、失敗候補に応じて編集操作と保存操作を同期する。 */
  const renderAvailability = (): void => {
    const blocked = session.saving || session.pending;
    elements.confirm.disabled = !session.dirty || blocked;
    elements.retry.hidden = !session.pending;
    elements.cancel.disabled = session.saving;
    if (blocked) elements.frame.dataset.twoBayEditBlocked = "true";
    else delete elements.frame.dataset.twoBayEditBlocked;
  };

  /** draftまたは失敗候補を保存し、成功時だけ通常画面へ戻る。 */
  const save = async (retry: boolean): Promise<void> => {
    elements.status.textContent = "保存中…";
    try {
      const operation = retry ? session.retry() : session.confirm();
      renderAvailability();
      const committed = await operation;
      elements.status.textContent = "保存しました";
      exit();
      options.onCommitted(committed);
    } catch {
      elements.status.textContent = "保存に失敗しました";
    } finally {
      renderAvailability();
    }
  };

  elements.entry.disabled = false;
  elements.entry.addEventListener("click", () => {
    if (session.active) return;
    const draft = session.begin(options.getConfiguration());
    elements.menu.hidden = true;
    elements.frame.dataset.twoBayEditing = "true";
    elements.canvas.hidden = false;
    elements.status.textContent = "";
    options.onDraft(draft);
    renderAvailability();
  });
  elements.confirm.addEventListener("click", () => { void save(false); });
  elements.retry.addEventListener("click", () => { void save(true); });
  elements.cancel.addEventListener("click", () => {
    if (!session.active) return;
    const restored = session.cancel();
    exit();
    options.onCancelled(restored);
    renderAvailability();
  });
  exit();
  renderAvailability();
  return {
    refresh: renderAvailability,
    reset(): void {
      if (session.active && !session.saving) session.cancel();
      elements.status.textContent = "";
      exit();
      renderAvailability();
    },
  };
}
