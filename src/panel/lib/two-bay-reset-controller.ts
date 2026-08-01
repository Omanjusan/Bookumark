import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import type { TwoBayResetSession } from "./two-bay-reset-session.js";

export interface TwoBayResetElements {
  readonly reset: HTMLButtonElement;
  readonly settingsDialog: HTMLDialogElement;
  readonly dialog: HTMLDialogElement;
  readonly confirm: HTMLButtonElement;
  readonly dismiss: HTMLButtonElement;
  readonly retry: HTMLButtonElement;
  readonly status: HTMLElement;
}

interface TwoBayResetOptions {
  readonly getConfiguration: () => TwoBayConfiguration;
  readonly onCommitted: (configuration: TwoBayConfiguration) => void;
}

/** 初期化の確認、保存失敗時の再試行、取り消しを設定画面へ接続する。 */
export function bindTwoBayReset(
  elements: TwoBayResetElements,
  session: TwoBayResetSession,
  options: TwoBayResetOptions,
): void {
  /** 保存状態に応じて確認ダイアログ内の操作可否を同期する。 */
  const renderAvailability = (): void => {
    elements.confirm.disabled = session.saving || session.pending;
    elements.retry.hidden = !session.pending;
    elements.dismiss.disabled = session.saving;
  };

  /** 初回確認または固定候補の再試行を行い、成功時だけ正本を差し替える。 */
  const save = async (retry: boolean): Promise<void> => {
    elements.status.textContent = "初期化中…";
    try {
      const operation = retry ? session.retry() : session.confirm();
      renderAvailability();
      const committed = await operation;
      elements.status.textContent = "";
      elements.dialog.close();
      elements.settingsDialog.close();
      options.onCommitted(committed);
    } catch {
      elements.status.textContent = "初期化の保存に失敗しました";
    } finally {
      renderAvailability();
    }
  };

  elements.reset.addEventListener("click", () => {
    if (session.active) return;
    session.prepare(options.getConfiguration());
    elements.status.textContent = "";
    renderAvailability();
    if (!elements.dialog.open) elements.dialog.showModal();
  });
  elements.confirm.addEventListener("click", () => { void save(false); });
  elements.retry.addEventListener("click", () => { void save(true); });
  elements.dismiss.addEventListener("click", () => {
    if (session.active && !session.saving) session.cancel();
    elements.status.textContent = "";
    elements.dialog.close();
    renderAvailability();
  });
  elements.dialog.addEventListener("cancel", (event) => {
    if (session.saving) {
      event.preventDefault();
      return;
    }
    if (session.active) session.cancel();
    elements.status.textContent = "";
    renderAvailability();
  });

  renderAvailability();
}
