import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import type { TwoBayEditSession } from "./two-bay-edit-session.js";

export interface TwoBayEditElements {
  readonly entry: HTMLButtonElement;
  readonly menu: HTMLElement;
  readonly frame: HTMLElement;
  readonly canvas: HTMLElement;
  readonly confirm: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
}

interface TwoBayEditOptions {
  readonly getConfiguration: () => TwoBayConfiguration;
  readonly onDraft: (configuration: TwoBayConfiguration) => void;
  readonly onCancelled: (configuration: TwoBayConfiguration) => void;
}

/** ベイ編集導線と中央キャンバスの開始・キャンセル境界を接続する。 */
export function bindTwoBayEditMode(
  elements: TwoBayEditElements,
  session: TwoBayEditSession,
  options: TwoBayEditOptions,
): void {
  /** 通常中央UIへ戻し、編集キャンバスを閉じる。 */
  const exit = (): void => {
    delete elements.frame.dataset.twoBayEditing;
    elements.canvas.hidden = true;
  };

  elements.entry.disabled = false;
  elements.confirm.disabled = true;
  elements.entry.addEventListener("click", () => {
    if (session.active) return;
    const draft = session.begin(options.getConfiguration());
    elements.menu.hidden = true;
    elements.frame.dataset.twoBayEditing = "true";
    elements.canvas.hidden = false;
    options.onDraft(draft);
  });
  elements.cancel.addEventListener("click", () => {
    if (!session.active) return;
    const restored = session.cancel();
    exit();
    options.onCancelled(restored);
  });
  exit();
}
