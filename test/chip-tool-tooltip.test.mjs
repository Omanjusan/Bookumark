import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bindChipToolTooltip } from "../dist/panel/lib/chip-tool-tooltip.js";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("shows the tool label and description only after 150ms hover", () => {
  const fake = harness();
  const tool = fake.tool("検索", "文字で絞り込み", 24);
  bindChipToolTooltip(fake.root, fake.tooltip, fake.title, fake.description, fake.timers);

  fake.emit("mouseover", { target: fake.nestedIn(tool), relatedTarget: null });
  fake.advance(149);
  assert.equal(fake.tooltip.hidden, true);
  fake.advance(1);

  assert.equal(fake.tooltip.hidden, false);
  assert.equal(fake.title.textContent, "検索");
  assert.equal(fake.description.textContent, "文字で絞り込み");
  assert.equal(fake.tooltip.style.top, "24px");
  assert.equal(tool.attributes["aria-describedby"], "chip-tool-tooltip");
});

test("uses the same delay for keyboard focus", () => {
  const fake = harness();
  const tool = fake.tool("表示形式", "表示形式を選択", 8);
  bindChipToolTooltip(fake.root, fake.tooltip, fake.title, fake.description, fake.timers);

  fake.emit("focusin", { target: tool });
  fake.advance(150);

  assert.equal(fake.tooltip.hidden, false);
  assert.equal(fake.title.textContent, "表示形式");
});

test("cancels pending display and hides visible tooltip on exit, blur, or drag", () => {
  for (const eventType of ["mouseout", "focusout", "dragstart"]) {
    const fake = harness();
    const tool = fake.tool("訪問状態", "訪問状態で絞り込み", 12);
    bindChipToolTooltip(fake.root, fake.tooltip, fake.title, fake.description, fake.timers);
    fake.emit("mouseover", { target: tool, relatedTarget: null });

    fake.emit(eventType, { target: tool, relatedTarget: null });
    fake.advance(150);

    assert.equal(fake.tooltip.hidden, true);
    assert.equal(tool.attributes["aria-describedby"], undefined);
  }
});

test("does not hide when moving between descendants of the same tool", () => {
  const fake = harness();
  const tool = fake.tool("検索", "文字で絞り込み", 20);
  const nested = fake.nestedIn(tool);
  bindChipToolTooltip(fake.root, fake.tooltip, fake.title, fake.description, fake.timers);
  fake.emit("mouseover", { target: tool, relatedTarget: null });
  fake.advance(150);

  fake.emit("mouseout", { target: nested, relatedTarget: tool.child });

  assert.equal(fake.tooltip.hidden, false);
});

test("clears timers, tooltip, attributes, and listeners on disconnect", () => {
  const fake = harness();
  const tool = fake.tool("検索", "文字で絞り込み", 0);
  const connection = bindChipToolTooltip(
    fake.root,
    fake.tooltip,
    fake.title,
    fake.description,
    fake.timers,
  );
  fake.emit("focusin", { target: tool });

  connection.disconnect();
  fake.advance(150);

  assert.equal(fake.tooltip.hidden, true);
  assert.equal(tool.attributes["aria-describedby"], undefined);
  assert.equal(fake.listenerCount(), 0);
});

test("defines a wrapped tooltip beside the dedicated tool-list root", () => {
  assert.match(
    html,
    /id="chip-tool-list"[\s\S]*?id="chip-tool-tooltip"[^>]+role="tooltip"[^>]+hidden[\s\S]*?id="chip-tool-tooltip-title"[\s\S]*?id="chip-tool-tooltip-description"/,
  );
  assert.match(
    css,
    /\.chip-tool-tooltip\s*\{[^}]*position:\s*absolute[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/s,
  );
});

function harness() {
  const listeners = new Map();
  const scheduled = new Map();
  let now = 0;
  let nextId = 1;
  const root = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const tooltip = { id: "chip-tool-tooltip", hidden: true, style: {} };
  const title = { textContent: "" };
  const description = { textContent: "" };
  const timers = {
    setTimeout(callback, delay) {
      const id = nextId++;
      scheduled.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { scheduled.delete(id); },
  };
  const advance = (milliseconds) => {
    now += milliseconds;
    for (const [id, task] of [...scheduled]) {
      if (task.at <= now) {
        scheduled.delete(id);
        task.callback();
      }
    }
  };
  const tool = (label, descriptionText, offsetTop) => {
    const attributes = {};
    const button = {
      className: "chip-tool-button",
      textContent: label,
      dataset: { description: descriptionText },
      offsetTop,
      attributes,
      child: {},
      contains(value) { return value === this || value === this.child; },
      closest(selector) { return selector === ".chip-tool-button" ? this : null; },
      setAttribute(name, value) { attributes[name] = value; },
      removeAttribute(name) { delete attributes[name]; },
    };
    return button;
  };
  const nestedIn = (button) => ({
    closest: (selector) => selector === ".chip-tool-button" ? button : null,
  });
  return {
    root, tooltip, title, description, timers, tool, nestedIn, advance,
    emit(type, event) { listeners.get(type)?.({ type, ...event }); },
    listenerCount: () => listeners.size,
  };
}
