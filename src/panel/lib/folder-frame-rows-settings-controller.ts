import {
  MAX_FOLDER_FRAME_ROWS,
  MIN_FOLDER_FRAME_ROWS,
} from "./folder-item-frame-rows.js";

interface FolderFrameRowsSettingsElements {
  readonly root: HTMLDialogElement;
  readonly close: HTMLButtonElement;
  readonly input: HTMLInputElement;
  readonly status: HTMLElement;
}

interface FolderFrameRowsSettingsOptions {
  readonly onSave: (rows: number) => Promise<void>;
}

export interface FolderFrameRowsSettingsController {
  open(defaultRows: number): void;
}

const INVALID_ROWS_MESSAGE = "表示段数は1から5の整数で指定してください";
const SAVE_FAILURE_MESSAGE = "フォルダ欄の既定段数を保存できませんでした";

/** フォルダ欄の既定段数をXで保存し、Escapeで破棄するモーダルを接続する。 */
export function bindFolderFrameRowsSettings(
  elements: FolderFrameRowsSettingsElements,
  options: FolderFrameRowsSettingsOptions,
): FolderFrameRowsSettingsController {
  let currentRows = MIN_FOLDER_FRAME_ROWS;
  let pending = false;

  elements.close.addEventListener("click", async () => {
    if (pending) return;
    const candidate = parseRows(elements.input.value);
    if (candidate === null) {
      elements.status.textContent = INVALID_ROWS_MESSAGE;
      return;
    }
    pending = true;
    setDisabled(elements, true);
    elements.status.textContent = "保存中…";
    try {
      await options.onSave(candidate);
      currentRows = candidate;
      elements.status.textContent = "";
      elements.root.close();
    } catch {
      elements.input.value = String(currentRows);
      elements.status.textContent = SAVE_FAILURE_MESSAGE;
    } finally {
      pending = false;
      setDisabled(elements, false);
    }
  });
  elements.input.addEventListener("input", () => {
    elements.status.textContent = parseRows(elements.input.value) === null
      ? INVALID_ROWS_MESSAGE
      : "";
  });
  elements.root.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (pending) return;
    elements.input.value = String(currentRows);
    elements.status.textContent = "";
    elements.root.close();
  });

  return {
    open(defaultRows: number): void {
      currentRows = defaultRows;
      elements.input.value = String(defaultRows);
      elements.status.textContent = "";
      if (!elements.root.open) elements.root.showModal();
      elements.input.focus();
    },
  };
}

/** 入力文字列を1～5の整数へ変換し、余分な入力を拒否する。 */
function parseRows(value: string): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const rows = Number(value);
  return rows >= MIN_FOLDER_FRAME_ROWS && rows <= MAX_FOLDER_FRAME_ROWS ? rows : null;
}

/** 保存中の重複操作を防ぐ。 */
function setDisabled(elements: FolderFrameRowsSettingsElements, disabled: boolean): void {
  elements.input.disabled = disabled;
  elements.close.disabled = disabled;
}
