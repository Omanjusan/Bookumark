import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildChipToolSelectorPlan,
  renderChipToolSelector,
} from "../dist/panel/lib/chip-tool-selector-view.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

const tools = [
  { chipType: "view", kind: "control", label: "表示形式", description: "表示形式を選択" },
  { chipType: "search", kind: "condition", label: "検索", description: "文字で絞り込み" },
  { chipType: "refresh", kind: "action", label: "再読込", description: "一覧を再読込" },
  { chipType: "visit", kind: "condition", label: "訪問状態", description: "訪問状態で絞り込み" },
];

test("groups text tools in condition, control, action order", () => {
  assert.deepEqual(buildChipToolSelectorPlan(tools), [
    {
      kind: "condition",
      label: "条件",
      tools: [tools[1], tools[3]],
    },
    {
      kind: "control",
      label: "操作",
      tools: [tools[0]],
    },
    {
      kind: "action",
      label: "アクション",
      tools: [tools[2]],
    },
  ]);
});

test("omits empty categories while preserving injected order within a category", () => {
  assert.deepEqual(buildChipToolSelectorPlan([tools[3], tools[1]]), [{
    kind: "condition",
    label: "条件",
    tools: [tools[3], tools[1]],
  }]);
  assert.deepEqual(buildChipToolSelectorPlan([]), []);
});

test("renders non-draggable text buttons with chip type and description metadata", () => {
  const fake = createFakeDocument();
  const root = fake.element("aside");

  renderChipToolSelector(root, tools, { document: fake.document });

  assert.deepEqual(root.children.map((category) => ({
    kind: category.dataset.kind,
    heading: category.children[0].textContent,
    tools: category.children[1].children.map((button) => ({
      text: button.textContent,
      chipType: button.dataset.chipType,
      description: button.dataset.description,
      draggable: button.draggable,
    })),
  })), [
    {
      kind: "condition",
      heading: "条件",
      tools: [
        { text: "検索", chipType: "search", description: "文字で絞り込み", draggable: false },
        { text: "訪問状態", chipType: "visit", description: "訪問状態で絞り込み", draggable: false },
      ],
    },
    {
      kind: "control",
      heading: "操作",
      tools: [
        { text: "表示形式", chipType: "view", description: "表示形式を選択", draggable: false },
      ],
    },
    {
      kind: "action",
      heading: "アクション",
      tools: [
        { text: "再読込", chipType: "refresh", description: "一覧を再読込", draggable: false },
      ],
    },
  ]);
});

test("provides one selector root and category styling in the factory tool column", () => {
  assert.equal((html.match(/id="bay-factory-tools"/g) ?? []).length, 1);
  assert.match(
    html,
    /<aside[^>]+id="bay-factory-tools"[^>]+class="bay-factory-tools"[^>]+aria-label="チップツール"[^>]*>[\s\S]*?id="chip-tool-list"[\s\S]*?<\/aside>/,
  );
  assert.match(css, /\.chip-tool-category\s*\{[^}]*border-bottom:/s);
  assert.match(css, /\.chip-tool-button\s*\{[^}]*width:\s*100%[^}]*text-align:\s*left/s);
});

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    draggable: false,
    dataset: {},
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
