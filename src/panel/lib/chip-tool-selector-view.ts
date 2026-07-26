import type { ChipKind } from "./chip-contract.js";

export interface ChipToolViewModel {
  readonly chipType: string;
  readonly kind: ChipKind;
  readonly label: string;
  readonly description: string;
}

export interface ChipToolCategoryPlan {
  readonly kind: ChipKind;
  readonly label: string;
  readonly tools: readonly ChipToolViewModel[];
}

interface ChipToolSelectorRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

const CATEGORIES: ReadonlyArray<{ kind: ChipKind; label: string }> = [
  { kind: "condition", label: "条件" },
  { kind: "control", label: "操作" },
  { kind: "action", label: "アクション" },
];

/** 注入された文字ツールを条件・操作・アクションの固定順へ分類する。 */
export function buildChipToolSelectorPlan(
  tools: readonly ChipToolViewModel[],
): ChipToolCategoryPlan[] {
  return CATEGORIES.flatMap((category) => {
    const matching = tools
      .filter((tool) => tool.kind === category.kind)
      .map((tool) => ({ ...tool }));
    return matching.length === 0 ? [] : [{ ...category, tools: matching }];
  });
}

/** 分類済みのチップツールを非ドラッグの文字ボタンとして描画する。 */
export function renderChipToolSelector(
  root: HTMLElement,
  tools: readonly ChipToolViewModel[],
  options: ChipToolSelectorRenderOptions = {},
): void {
  const documentRef = options.document ?? document;
  root.textContent = "";
  for (const category of buildChipToolSelectorPlan(tools)) {
    const section = documentRef.createElement("section");
    section.className = "chip-tool-category";
    section.dataset.kind = category.kind;

    const heading = documentRef.createElement("h3");
    heading.textContent = category.label;
    section.appendChild(heading);

    const list = documentRef.createElement("div");
    list.className = "chip-tool-list";
    for (const tool of category.tools) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = "chip-tool-button";
      button.dataset.chipType = tool.chipType;
      button.dataset.description = tool.description;
      button.draggable = false;
      button.textContent = tool.label;
      list.appendChild(button);
    }
    section.appendChild(list);
    root.appendChild(section);
  }
}
