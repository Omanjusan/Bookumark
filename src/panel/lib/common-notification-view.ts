import type {
  CommonDialogSnapshot,
  CommonToastSnapshot,
} from "./common-notification-queue.js";

interface CommonNotificationViewElements {
  readonly dialog: HTMLDialogElement;
  readonly title: HTMLElement;
  readonly message: HTMLElement;
  readonly busy: HTMLElement;
  readonly primary: HTMLButtonElement;
  readonly toastRegion: HTMLElement;
}

interface CommonNotificationViewDocument {
  readonly activeElement: Element | null;
  createElement(tagName: string): HTMLElement;
}

interface CommonNotificationViewOptions {
  readonly document?: CommonNotificationViewDocument;
  readonly onDialogPrimary?: (id: string) => void;
  readonly onToastDismiss?: (id: string) => void;
}

interface CommonNotificationViewState {
  readonly dialog: CommonDialogSnapshot;
  readonly toasts: readonly CommonToastSnapshot[];
}

export interface CommonNotificationViewConnection {
  render(state: CommonNotificationViewState): void;
}

/** 共通通知キューのスナップショットをネイティブdialogとトースト領域へ接続する。 */
export function bindCommonNotificationView(
  elements: CommonNotificationViewElements,
  options: CommonNotificationViewOptions = {},
): CommonNotificationViewConnection {
  const documentRef = options.document ?? document;
  let activeId: string | null = null;
  let activeBusy = false;
  let returnFocus: { focus(): void } | null = null;

  elements.primary.addEventListener("click", () => {
    if (activeId !== null && !activeBusy) options.onDialogPrimary?.(activeId);
  });
  elements.dialog.addEventListener("cancel", (event) => {
    if (activeId !== null) event.preventDefault();
  });

  return {
    render(state): void {
      const snapshot = structuredClone(state);
      renderDialog(snapshot.dialog);
      renderToasts(elements.toastRegion, snapshot.toasts, documentRef, options.onToastDismiss);
    },
  };

  /** activeダイアログの開閉、内容、処理中状態、フォーカスを同期する。 */
  function renderDialog(snapshot: CommonDialogSnapshot): void {
    const active = snapshot.active;
    if (active === null) {
      activeId = null;
      activeBusy = false;
      if (elements.dialog.open) elements.dialog.close();
      const target = returnFocus;
      returnFocus = null;
      target?.focus();
      return;
    }

    activeId = active.id;
    activeBusy = active.busy;
    elements.dialog.dataset.severity = active.severity;
    elements.title.textContent = active.title;
    elements.message.textContent = active.message;
    elements.primary.textContent = active.primaryActionLabel;
    elements.primary.disabled = active.busy;
    elements.busy.hidden = !active.busy;
    elements.busy.textContent = active.busy ? "処理中…" : "";

    if (!elements.dialog.open) {
      returnFocus = focusTarget(documentRef.activeElement);
      elements.dialog.showModal();
      elements.primary.focus();
    }
  }
}

/** 現在のトースト列だけを順序どおり再生成する。 */
function renderToasts(
  root: HTMLElement,
  toasts: readonly CommonToastSnapshot[],
  documentRef: CommonNotificationViewDocument,
  onDismiss: ((id: string) => void) | undefined,
): void {
  const children = toasts.map((toast) => {
    const item = documentRef.createElement("article");
    item.className = "common-toast";
    item.dataset.notificationId = toast.id;
    item.dataset.severity = toast.severity;

    const message = documentRef.createElement("p");
    message.className = "common-toast-message";
    message.textContent = toast.message;
    item.appendChild(message);

    const occurrences = documentRef.createElement("span");
    occurrences.className = "common-toast-occurrences";
    occurrences.textContent = toast.occurrences > 1 ? `${toast.occurrences}回` : "";
    item.appendChild(occurrences);

    const dismiss = documentRef.createElement("button");
    dismiss.className = "common-toast-dismiss";
    dismiss.textContent = "×";
    dismiss.setAttribute("type", "button");
    dismiss.setAttribute("aria-label", "通知を閉じる");
    dismiss.addEventListener("click", () => onDismiss?.(toast.id));
    item.appendChild(dismiss);
    return item;
  });
  root.replaceChildren(...children);
}

/** 現在のactive elementが終了時にフォーカスを戻せる対象か判定する。 */
function focusTarget(value: Element | null): { focus(): void } | null {
  if (value === null || !("focus" in value) || typeof value.focus !== "function") return null;
  return value as Element & { focus(): void };
}
