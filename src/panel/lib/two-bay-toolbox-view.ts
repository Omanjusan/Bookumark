import { TWO_BAY_TOOLBOX_CATEGORIES } from "./two-bay-toolbox-catalog.js";

interface TwoBayToolboxRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

/** カテゴリ定義からタブとドラッグ可能なチップツールを描画する。 */
export function renderTwoBayToolbox(
  root: HTMLElement,
  options: TwoBayToolboxRenderOptions = {},
): void {
  const documentRef = options.document ?? document;
  const tabs = documentRef.createElement("div");
  tabs.className = "two-bay-toolbox-tabs";
  tabs.setAttribute("role", "tablist");
  const panels: HTMLElement[] = [];
  const tabButtons: HTMLButtonElement[] = [];

  /** 選択カテゴリだけを表示し、tab選択状態を同期する。 */
  const select = (selectedIndex: number): void => {
    panels.forEach((panel, index) => { panel.hidden = index !== selectedIndex; });
    tabButtons.forEach((tab, index) => tab.setAttribute("aria-selected", String(index === selectedIndex)));
  };

  TWO_BAY_TOOLBOX_CATEGORIES.forEach((category, index) => {
    const tab = documentRef.createElement("button");
    tab.type = "button";
    tab.textContent = category.label;
    tab.setAttribute("role", "tab");
    tab.dataset.category = category.id;
    tab.addEventListener("click", () => select(index));
    tabs.appendChild(tab);
    tabButtons.push(tab);

    const panel = documentRef.createElement("div");
    panel.className = "two-bay-toolbox-panel";
    panel.setAttribute("role", "tabpanel");
    panel.dataset.category = category.id;
    for (const definition of category.tools) {
      const tool = documentRef.createElement("button");
      tool.type = "button";
      tool.className = "two-bay-tool";
      tool.dataset.chipType = definition.chipType;
      tool.textContent = definition.label;
      tool.draggable = definition.enabled;
      tool.disabled = !definition.enabled;
      panel.appendChild(tool);
    }
    panels.push(panel);
  });
  root.replaceChildren(tabs, ...panels);
  select(0);
}

