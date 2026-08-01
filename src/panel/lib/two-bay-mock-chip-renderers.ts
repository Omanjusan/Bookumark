import type { DockingChipDrawingPlan } from "./docking-rail-drawing-plan.js";
import type { DockingChipRenderer } from "./docking-chip-renderer-registry.js";

interface TwoBayMockRendererOptions {
  readonly document?: Pick<Document, "createElement">;
}

export type TwoBayMockChipRenderers = Readonly<Record<"date" | "clock", DockingChipRenderer>>;

/** 日時取得や共有状態接続を持たない日付・時計プレースホルダーrendererを生成する。 */
export function createTwoBayMockChipRenderers(
  options: TwoBayMockRendererOptions = {},
): TwoBayMockChipRenderers {
  const documentRef = options.document ?? document;
  /** instance識別情報と固定表示文言だけを持つ非機能チップを生成する。 */
  const render = (plan: DockingChipDrawingPlan, label: string): HTMLElement => {
    const root = documentRef.createElement("span");
    root.className = "two-bay-mock-chip";
    root.dataset.chipInstanceId = plan.instanceId;
    root.dataset.chipType = plan.chipType;
    root.textContent = label;
    return root;
  };
  return {
    date: (plan) => render(plan, "日付"),
    clock: (plan) => render(plan, "時計"),
  };
}

