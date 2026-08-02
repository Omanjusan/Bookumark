import type { ListDateFormatId } from "./list-date-format-preferences.js";

interface ListDateSettingsElements {
  readonly root: HTMLDialogElement;
  readonly close: HTMLButtonElement;
  readonly select: HTMLSelectElement;
  readonly status: HTMLElement;
}

interface ListDateSettingsOptions {
  readonly onChange: (format: ListDateFormatId) => Promise<void>;
}

export interface ListDateSettingsController {
  open(format: ListDateFormatId): void;
}

/** 一覧日時設定をXでのみ閉じ、選択値を即時保存へ接続する。 */
export function bindListDateSettings(
  elements: ListDateSettingsElements,
  options: ListDateSettingsOptions,
): ListDateSettingsController {
  let current: ListDateFormatId = "browser";
  let pending = false;

  elements.close.addEventListener("click", () => {
    if (!pending) elements.root.close();
  });
  elements.root.addEventListener("cancel", (event) => event.preventDefault());
  elements.select.addEventListener("change", async () => {
    if (pending) return;
    const candidate = elements.select.value as ListDateFormatId;
    pending = true;
    elements.select.disabled = true;
    elements.close.disabled = true;
    elements.status.textContent = "保存中…";
    try {
      await options.onChange(candidate);
      current = candidate;
      elements.status.textContent = "";
    } catch {
      elements.select.value = current;
      elements.status.textContent = "日付表示方式を保存できませんでした";
    } finally {
      pending = false;
      elements.select.disabled = false;
      elements.close.disabled = false;
    }
  });

  return {
    open(format: ListDateFormatId): void {
      current = format;
      elements.select.value = format;
      elements.status.textContent = "";
      if (!elements.root.open) elements.root.showModal();
      elements.select.focus();
    },
  };
}
