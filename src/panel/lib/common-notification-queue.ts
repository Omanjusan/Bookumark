export type CommonNotificationSeverity = "info" | "success" | "warning" | "error";

export interface CommonDialogNotification {
  readonly id: string;
  readonly severity: CommonNotificationSeverity;
  readonly title: string;
  readonly message: string;
  readonly primaryActionLabel: string;
}

export interface ActiveCommonDialogNotification extends CommonDialogNotification {
  readonly busy: boolean;
}

export interface CommonDialogSnapshot {
  readonly active: ActiveCommonDialogNotification | null;
  readonly pending: ActiveCommonDialogNotification[];
}

export interface CommonToastNotification {
  readonly id: string;
  readonly aggregateKey: string;
  readonly severity: CommonNotificationSeverity;
  readonly message: string;
}

export interface CommonToastSnapshot extends CommonToastNotification {
  readonly occurrences: number;
}

interface CommonNotificationClock {
  readonly schedule?: (callback: () => void, delay: number) => number;
  readonly cancel?: (handle: number) => void;
}

export interface CommonNotificationQueue {
  enqueueDialog(notification: CommonDialogNotification): void;
  updateActiveDialog(notification: CommonDialogNotification): boolean;
  dialogSnapshot(): CommonDialogSnapshot;
  beginActiveDialogOperation(id: string): boolean;
  endActiveDialogOperation(id: string): boolean;
  completeActiveDialog(id: string): boolean;
  enqueueToast(notification: CommonToastNotification): void;
  toastSnapshot(): CommonToastSnapshot[];
  dismissToast(id: string): boolean;
}

const WARNING_AUTO_DISMISS_MS = 8_000;
const SEVERITIES: readonly CommonNotificationSeverity[] = [
  "info",
  "success",
  "warning",
  "error",
];

/** ダイアログのFIFO制御とトースト集約をDOM非依存の状態として管理する。 */
export function createCommonNotificationQueue(
  clock: CommonNotificationClock = {},
): CommonNotificationQueue {
  const schedule = clock.schedule ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const cancel = clock.cancel ?? ((handle) => globalThis.clearTimeout(handle));
  const dialogs: ActiveCommonDialogNotification[] = [];
  const toasts: CommonToastSnapshot[] = [];
  const toastTimers = new Map<string, number>();

  /** 警告トーストの既存タイマーを破棄し、8秒後の終了を予約する。 */
  const restartWarningTimer = (toast: CommonToastSnapshot): void => {
    const previous = toastTimers.get(toast.id);
    if (previous !== undefined) cancel(previous);
    const handle = schedule(() => {
      toastTimers.delete(toast.id);
      const index = toasts.findIndex(({ id }) => id === toast.id);
      if (index >= 0) toasts.splice(index, 1);
    }, WARNING_AUTO_DISMISS_MS);
    toastTimers.set(toast.id, handle);
  };

  return {
    enqueueDialog(notification): void {
      validateDialog(notification);
      if (dialogs.some(({ id }) => id === notification.id)) {
        throw new Error(`notification id is already queued: ${notification.id}`);
      }
      dialogs.push({ ...structuredClone(notification), busy: false });
    },
    updateActiveDialog(notification): boolean {
      validateDialog(notification);
      const active = dialogs[0];
      if (active === undefined || active.id !== notification.id || active.busy) return false;
      dialogs[0] = { ...structuredClone(notification), busy: false };
      return true;
    },
    dialogSnapshot(): CommonDialogSnapshot {
      return structuredClone({
        active: dialogs[0] ?? null,
        pending: dialogs.slice(1),
      });
    },
    beginActiveDialogOperation(id): boolean {
      const active = dialogs[0];
      if (active === undefined || active.id !== id || active.busy) return false;
      dialogs[0] = { ...active, busy: true };
      return true;
    },
    endActiveDialogOperation(id): boolean {
      const active = dialogs[0];
      if (active === undefined || active.id !== id || !active.busy) return false;
      dialogs[0] = { ...active, busy: false };
      return true;
    },
    completeActiveDialog(id): boolean {
      const active = dialogs[0];
      if (active === undefined || active.id !== id || active.busy) return false;
      dialogs.shift();
      return true;
    },
    enqueueToast(notification): void {
      validateToast(notification);
      const existingIndex = toasts.findIndex(
        ({ aggregateKey }) => aggregateKey === notification.aggregateKey,
      );
      if (existingIndex >= 0) {
        const existing = toasts[existingIndex];
        const updated: CommonToastSnapshot = {
          ...structuredClone(notification),
          id: existing.id,
          occurrences: existing.occurrences + 1,
        };
        toasts[existingIndex] = updated;
        if (updated.severity === "warning") restartWarningTimer(updated);
        return;
      }
      if (toasts.some(({ id }) => id === notification.id)) {
        throw new Error(`notification id is already queued: ${notification.id}`);
      }
      const toast: CommonToastSnapshot = {
        ...structuredClone(notification),
        occurrences: 1,
      };
      toasts.push(toast);
      if (toast.severity === "warning") restartWarningTimer(toast);
    },
    toastSnapshot(): CommonToastSnapshot[] {
      return structuredClone(toasts);
    },
    dismissToast(id): boolean {
      const index = toasts.findIndex((toast) => toast.id === id);
      if (index < 0) return false;
      const handle = toastTimers.get(id);
      if (handle !== undefined) {
        cancel(handle);
        toastTimers.delete(id);
      }
      toasts.splice(index, 1);
      return true;
    },
  };
}

/** ダイアログ通知がキューで安全に識別・表示できる外形か検証する。 */
function validateDialog(notification: CommonDialogNotification): void {
  validateBaseNotification(notification);
  validateNonEmptyString(notification.title, "notification title");
  validateNonEmptyString(notification.primaryActionLabel, "primary action label");
}

/** トースト通知が集約可能な外形か検証する。 */
function validateToast(notification: CommonToastNotification): void {
  validateBaseNotification(notification);
  validateNonEmptyString(notification.aggregateKey, "notification aggregate key");
}

/** 共通通知の識別子、重要度、本文を検証する。 */
function validateBaseNotification(
  notification: Pick<CommonDialogNotification, "id" | "severity" | "message">,
): void {
  validateNonEmptyString(notification.id, "notification id");
  if (!SEVERITIES.some((severity) => severity === notification.severity)) {
    throw new TypeError("invalid notification severity");
  }
  validateNonEmptyString(notification.message, "notification message");
}

/** 空白だけの文字列を通知契約から拒否する。 */
function validateNonEmptyString(value: string, label: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must not be empty`);
  }
}
