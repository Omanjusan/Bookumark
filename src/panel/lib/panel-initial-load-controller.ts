import type { CommonNotificationQueue } from "./common-notification-queue.js";

const INITIAL_LOAD_DIALOG_ID = "panel-initial-load-failure";

interface PanelInitialLoadQueue extends Pick<
  CommonNotificationQueue,
  | "dialogSnapshot"
  | "beginActiveDialogOperation"
  | "endActiveDialogOperation"
  | "completeActiveDialog"
> {}

interface PanelInitialLoadDependencies<Candidate> {
  readonly load: () => Promise<Candidate>;
  readonly publish: (candidate: Candidate) => void;
  readonly queue: PanelInitialLoadQueue;
  readonly notifyFailure: (error: unknown) => void;
  readonly reportRetryFailure: (error: unknown) => void;
  readonly render: () => void;
}

export interface PanelInitialLoadController {
  start(): Promise<boolean>;
  handlePrimary(id: string): Promise<boolean>;
}

/** 初期候補を成功時だけ公開し、失敗後の全量再試行と多重実行防止を管理する。 */
export function createPanelInitialLoadController<Candidate>(
  dependencies: PanelInitialLoadDependencies<Candidate>,
): PanelInitialLoadController {
  let running = false;
  let completed = false;
  let retryPending = false;

  return {
    async start(): Promise<boolean> {
      if (running || completed || retryPending) return false;
      running = true;
      try {
        await loadAndPublish();
        completed = true;
        return true;
      } catch (error) {
        retryPending = true;
        safelyRun(() => dependencies.notifyFailure(error));
        safelyRun(dependencies.render);
        return false;
      } finally {
        running = false;
      }
    },

    async handlePrimary(id: string): Promise<boolean> {
      if (id !== INITIAL_LOAD_DIALOG_ID || running || completed || !retryPending) return false;
      if (dependencies.queue.dialogSnapshot().active?.id !== id) return false;
      if (!dependencies.queue.beginActiveDialogOperation(id)) return false;
      running = true;
      safelyRun(dependencies.render);
      try {
        await loadAndPublish();
        completed = true;
        retryPending = false;
        dependencies.queue.endActiveDialogOperation(id);
        dependencies.queue.completeActiveDialog(id);
        safelyRun(dependencies.render);
        return true;
      } catch (error) {
        safelyRun(() => dependencies.reportRetryFailure(error));
        dependencies.queue.endActiveDialogOperation(id);
        safelyRun(dependencies.render);
        return false;
      } finally {
        running = false;
      }
    },
  };

  /** 毎回同じ全量ロードを実行し、完了候補だけをruntimeへ公開する。 */
  async function loadAndPublish(): Promise<void> {
    const candidate = await dependencies.load();
    dependencies.publish(candidate);
  }
}

/** 診断・描画失敗を初期読み込み制御へ逆流させない。 */
function safelyRun(operation: () => void): void {
  try {
    operation();
  } catch {
    // 共通通知側の失敗より、再試行状態と読み込み結果を優先する。
  }
}
