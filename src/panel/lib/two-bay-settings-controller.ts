import type { TwoBayConfiguration, TwoBayId } from "./two-bay-persistence-model.js";
import type { TwoBaySystemSwitchSession } from "./two-bay-system-switch-session.js";

export interface TwoBaySettingsElements {
  readonly menuButton: HTMLButtonElement;
  readonly menu: HTMLElement;
  readonly settings: HTMLButtonElement;
  readonly bayEdit: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly close: HTMLButtonElement;
  readonly top: HTMLInputElement;
  readonly bottom: HTMLInputElement;
  readonly retry: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly reset: HTMLButtonElement;
}

interface TwoBaySettingsOptions {
  readonly onCommitted?: (configuration: TwoBayConfiguration) => void;
}

/** 固定システムメニューとsystemベイ即時保存UIを接続する。 */
export function bindTwoBaySettings(
  elements: TwoBaySettingsElements,
  session: TwoBaySystemSwitchSession,
  options: TwoBaySettingsOptions = {},
): void {
  /** 保存済み構成または失敗候補をラジオ選択へ反映する。 */
  const renderSelection = (configuration: TwoBayConfiguration): void => {
    elements.top.checked = configuration.systemBay === "top";
    elements.bottom.checked = configuration.systemBay === "bottom";
  };

  /** 保存中と失敗候補保持中の操作可否を一括更新する。 */
  const renderAvailability = (): void => {
    const blocked = session.saving || session.pending;
    elements.top.disabled = blocked;
    elements.bottom.disabled = blocked;
    elements.close.disabled = blocked;
    elements.reset.disabled = blocked;
    elements.retry.hidden = !session.pending;
    elements.cancel.hidden = !session.pending;
  };

  /** 初回切り替えまたは固定候補の再試行を実行する。 */
  const save = async (systemBay: TwoBayId | null): Promise<void> => {
    elements.status.textContent = "保存中…";
    try {
      const committed = systemBay === null
        ? await session.retry()
        : await session.switchTo(systemBay);
      renderSelection(committed);
      elements.status.textContent = "保存しました";
      options.onCommitted?.(committed);
    } catch {
      const candidate = session.candidate();
      if (candidate !== null) renderSelection(candidate);
      elements.status.textContent = "保存に失敗しました";
    } finally {
      renderAvailability();
    }
  };

  elements.menuButton.addEventListener("click", () => {
    elements.menu.hidden = !elements.menu.hidden;
  });
  elements.settings.addEventListener("click", () => {
    elements.menu.hidden = true;
    renderSelection(session.candidate() ?? session.committed());
    elements.status.textContent = "";
    if (!elements.dialog.open) elements.dialog.showModal();
  });
  elements.close.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("cancel", (event) => {
    if (session.saving || session.pending) event.preventDefault();
  });
  elements.top.addEventListener("change", () => {
    if (elements.top.checked) void save("top");
  });
  elements.bottom.addEventListener("change", () => {
    if (elements.bottom.checked) void save("bottom");
  });
  elements.retry.addEventListener("click", () => { void save(null); });
  elements.cancel.addEventListener("click", () => {
    const restored = session.cancel();
    renderSelection(restored);
    elements.status.textContent = "";
    renderAvailability();
  });

  elements.bayEdit.disabled = true;
  renderSelection(session.committed());
  renderAvailability();
}
