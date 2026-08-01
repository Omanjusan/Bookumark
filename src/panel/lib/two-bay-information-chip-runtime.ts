import type { DockingChipDrawingPlan } from "./docking-rail-drawing-plan.js";
import type { DockingChipRenderer } from "./docking-chip-renderer-registry.js";

interface TwoBayInformationChipRuntimeOptions {
  readonly document?: Pick<Document, "createElement">;
  bookmarkCount(): number;
}

export interface TwoBayInformationChipRuntime {
  readonly renderers: Readonly<Record<"bookmark-summary", DockingChipRenderer>>;
  sync(): void;
  disconnect(): void;
}

/** ブックマーク件数へ追従する情報チップrendererと同期処理を生成する。 */
export function createTwoBayInformationChipRuntime(
  options: TwoBayInformationChipRuntimeOptions,
): TwoBayInformationChipRuntime {
  const documentRef = options.document ?? document;
  const summaries = new Set<HTMLElement>();
  let connected = true;

  /** 現在件数をタイトル付きの利用者向け表示へ反映する。 */
  const renderSummaryText = (root: HTMLElement): void => {
    root.textContent = `Bookumark ${options.bookmarkCount()}件`;
  };

  /** 保存されたinstance識別情報を持つ情報チップを生成する。 */
  const renderBookmarkSummary = (plan: DockingChipDrawingPlan): Node => {
    const root = documentRef.createElement("span");
    root.className = "two-bay-information-chip two-bay-information-chip--bookmark-summary";
    root.dataset.chipInstanceId = plan.instanceId;
    root.dataset.chipType = plan.chipType;
    renderSummaryText(root);
    summaries.add(root);
    return root;
  };

  return {
    renderers: { "bookmark-summary": renderBookmarkSummary },
    sync(): void {
      if (!connected) return;
      for (const summary of summaries) renderSummaryText(summary);
    },
    disconnect(): void {
      connected = false;
      summaries.clear();
    },
  };
}
