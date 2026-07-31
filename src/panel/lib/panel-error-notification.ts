import type {
  CommonDialogNotification,
  CommonToastNotification,
} from "./common-notification-queue.js";

export type PanelErrorOperation =
  | "initial-load"
  | "folder-navigation"
  | "bookmark-custom-order-save"
  | "folder-custom-order-save";

export interface PanelErrorDiagnostic {
  readonly operation: PanelErrorOperation;
  readonly error: unknown;
}

export interface PanelNotificationFailure {
  readonly stage: "diagnostic" | "enqueue" | "render";
  readonly error: unknown;
  readonly diagnostic: PanelErrorDiagnostic;
}

interface PanelErrorNotificationQueue {
  enqueueDialog(notification: CommonDialogNotification): void;
  enqueueToast(notification: CommonToastNotification): void;
}

interface PanelErrorNotificationDependencies {
  readonly queue: PanelErrorNotificationQueue;
  readonly render: () => void;
  readonly reportDiagnostic: (diagnostic: PanelErrorDiagnostic) => void;
  readonly reportNotificationFailure?: (failure: PanelNotificationFailure) => void;
}

export interface PanelErrorNotificationAdapter {
  notify(operation: PanelErrorOperation, error: unknown): void;
}

const INITIAL_LOAD_NOTIFICATION: CommonDialogNotification = {
  id: "panel-initial-load-failure",
  severity: "error",
  title: "Bookumarkの読み込みに失敗しました",
  message: "Bookumarkの読み込みに失敗しました。再試行してください",
  primaryActionLabel: "再試行",
};

const FOLDER_NAVIGATION_MESSAGE =
  "フォルダを読み込めませんでした。元の表示を維持しています";
const CUSTOM_ORDER_SAVE_MESSAGE =
  "表示順を保存できませんでした。現在の並びはこの画面で維持されています";

const TOAST_DETAILS: Record<Exclude<PanelErrorOperation, "initial-load">, {
  readonly idPrefix: string;
  readonly aggregateKey: string;
  readonly message: string;
}> = {
  "folder-navigation": {
    idPrefix: "panel-folder-navigation-failure",
    aggregateKey: "panel-folder-navigation-failures",
    message: FOLDER_NAVIGATION_MESSAGE,
  },
  "bookmark-custom-order-save": {
    idPrefix: "panel-bookmark-custom-order-save-failure",
    aggregateKey: "panel-bookmark-custom-order-save-failures",
    message: CUSTOM_ORDER_SAVE_MESSAGE,
  },
  "folder-custom-order-save": {
    idPrefix: "panel-folder-custom-order-save-failure",
    aggregateKey: "panel-folder-custom-order-save-failures",
    message: CUSTOM_ORDER_SAVE_MESSAGE,
  },
};

/** 既存エラーを固定された共通通知へ変換し、診断・通知失敗を呼び出し元から隔離する。 */
export function createPanelErrorNotificationAdapter(
  dependencies: PanelErrorNotificationDependencies,
): PanelErrorNotificationAdapter {
  const sequences: Record<Exclude<PanelErrorOperation, "initial-load">, number> = {
    "folder-navigation": 0,
    "bookmark-custom-order-save": 0,
    "folder-custom-order-save": 0,
  };

  return {
    notify(operation, error): void {
      const diagnostic: PanelErrorDiagnostic = { operation, error };
      safelyRun("diagnostic", diagnostic, () => dependencies.reportDiagnostic(diagnostic));

      const enqueued = safelyRun("enqueue", diagnostic, () => {
        if (operation === "initial-load") {
          dependencies.queue.enqueueDialog(INITIAL_LOAD_NOTIFICATION);
          return;
        }
        sequences[operation] += 1;
        const details = TOAST_DETAILS[operation];
        dependencies.queue.enqueueToast({
          id: `${details.idPrefix}-${sequences[operation]}`,
          aggregateKey: details.aggregateKey,
          severity: "error",
          message: details.message,
        });
      });
      if (enqueued) safelyRun("render", diagnostic, dependencies.render);
    },
  };

  /** アダプター内の副作用失敗を任意の診断口へ渡し、元の処理へ再送出しない。 */
  function safelyRun(
    stage: PanelNotificationFailure["stage"],
    diagnostic: PanelErrorDiagnostic,
    operation: () => void,
  ): boolean {
    try {
      operation();
      return true;
    } catch (error) {
      try {
        dependencies.reportNotificationFailure?.({ stage, error, diagnostic });
      } catch {
        // 通知失敗の報告自体も、元の読み込み・保存処理へ逆流させない。
      }
      return false;
    }
  }
}
