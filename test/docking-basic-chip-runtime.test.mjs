import test from "node:test";
import assert from "node:assert/strict";

import { createDockingBasicChipRuntime } from "../dist/panel/lib/docking-basic-chip-runtime.js";

test("creates all six basic controls with per-instance DOM identity", () => {
  const fake = createFakeDocument();
  const runtime = runtimeFixture(fake);
  const types = ["search", "visit-status", "folder-history", "sort", "view-type", "movement-mode"];
  const nodes = types.map((chipType, index) => runtime.renderers[chipType](chip(`chip-${index + 1}`, chipType)));

  assert.deepEqual(nodes.map((node) => node.dataset.chipInstanceId), [
    "chip-1", "chip-2", "chip-3", "chip-4", "chip-5", "chip-6",
  ]);
  assert.deepEqual(nodes.map((node) => node.dataset.chipType), types);
  assert.equal(nodes[0].findByTag("INPUT").attributes["aria-label"], "ブックマークを検索");
  assert.equal(nodes[2].findAllByTag("BUTTON").length, 2);
  assert.equal(nodes[3].findByTag("SELECT").attributes["aria-label"], "並び順");
  assert.notEqual(
    nodes[1].findByTag("INPUT").name,
    runtime.renderers["visit-status"](chip("chip-7", "visit-status")).findByTag("INPUT").name,
  );
});

test("synchronizes duplicated search and view controls through shared state", () => {
  const fake = createFakeDocument();
  const state = defaultState();
  const runtime = runtimeFixture(fake, state);
  const firstSearch = runtime.renderers.search(chip("chip-1", "search"));
  const secondSearch = runtime.renderers.search(chip("chip-2", "search"));
  const firstView = runtime.renderers["view-type"](chip("chip-3", "view-type"));
  const secondView = runtime.renderers["view-type"](chip("chip-4", "view-type"));

  const searchInput = firstSearch.findByTag("INPUT");
  searchInput.value = "book";
  searchInput.emit("input");
  runtime.sync();
  assert.equal(secondSearch.findByTag("INPUT").value, "book");

  const card = firstView.findAllByTag("INPUT").find(({ value }) => value === "card");
  card.checked = true;
  card.emit("change");
  runtime.sync();
  assert.equal(
    secondView.findAllByTag("INPUT").find(({ value }) => value === "card").checked,
    true,
  );
  assert.deepEqual(state.events, [
    ["search", "book"],
    ["view", "card"],
  ]);
});

test("renders five accessible glyph choices and keeps favorite as an exclusive visual mock", () => {
  const fake = createFakeDocument();
  const state = defaultState();
  const runtime = runtimeFixture(fake, state);
  const firstView = runtime.renderers["view-type"](chip("chip-1", "view-type"));
  const secondView = runtime.renderers["view-type"](chip("chip-2", "view-type"));
  const firstInputs = firstView.findAllByTag("INPUT");
  const firstLabels = firstView.findAllByTag("LABEL");

  assert.deepEqual(firstInputs.map(({ value }) => value), [
    "favorite", "panel", "icon", "card", "list",
  ]);
  assert.deepEqual(firstInputs.map(({ attributes }) => attributes["aria-label"]), [
    "お気に入り", "パネル", "アイコン", "カード", "一覧",
  ]);
  assert.deepEqual(firstLabels.map(({ className }) => className), [
    "view-type-option view-type-option--favorite",
    "view-type-option view-type-option--panel",
    "view-type-option view-type-option--icon",
    "view-type-option view-type-option--card",
    "view-type-option view-type-option--list",
  ]);
  assert.equal(firstLabels[2].findByTag("IMG").attributes.src, "icons/bookmark.svg");

  firstInputs[0].checked = true;
  firstInputs[0].emit("change");

  assert.equal(state.snapshot.viewType, "panel");
  assert.deepEqual(state.events, []);
  assert.equal(firstInputs[0].checked, true);
  assert.equal(secondView.findAllByTag("INPUT")[0].checked, true);
  assert.equal(firstInputs.filter(({ checked }) => checked).length, 1);

  const card = firstInputs.find(({ value }) => value === "card");
  card.checked = true;
  card.emit("change");
  runtime.sync();

  assert.equal(state.snapshot.viewType, "card");
  assert.deepEqual(state.events, [["view", "card"]]);
  assert.equal(firstInputs[0].checked, false);
  assert.equal(card.checked, true);
});

test("disconnect removes every per-chip event listener", () => {
  const fake = createFakeDocument();
  const state = defaultState();
  const runtime = runtimeFixture(fake, state);
  const search = runtime.renderers.search(chip("chip-1", "search"));
  const input = search.findByTag("INPUT");

  runtime.disconnect();
  input.value = "ignored";
  input.emit("input");

  assert.deepEqual(state.events, []);
});

test("renders only custom order and normal movement choices", () => {
  const fake = createFakeDocument();
  const runtime = runtimeFixture(fake);
  const movement = runtime.renderers["movement-mode"](chip("chip-1", "movement-mode"));
  const inputs = movement.findAllByTag("INPUT");

  assert.deepEqual(inputs.map(({ value }) => value), ["custom-order", "normal"]);
  assert.doesNotMatch(JSON.stringify(movement), /directory-move|公式整理|Firefox本体/);
});

function runtimeFixture(fake, state = defaultState()) {
  return createDockingBasicChipRuntime({
    document: fake.document,
    snapshot: () => structuredClone(state.snapshot),
    onSearch: (value) => { state.snapshot.query = value; state.events.push(["search", value]); },
    onVisitStatus: (value) => { state.snapshot.visitStatus = value; state.events.push(["visit", value]); },
    onFolderHistory: (value) => state.events.push(["history", value]),
    onSortAxis: (value) => { state.snapshot.sortAxis = value; state.events.push(["sort-axis", value]); },
    onSortDirection: () => state.events.push(["sort-direction"]),
    onViewType: (value) => { state.snapshot.viewType = value; state.events.push(["view", value]); },
    onMovementMode: (value) => { state.snapshot.movementMode = value; state.events.push(["movement", value]); },
  });
}

function defaultState() {
  return {
    snapshot: {
      query: "",
      visitStatus: "all",
      folderHistory: { canGoBack: false, canGoForward: false, pending: false },
      sortAxis: "visitCount",
      sortDirection: "desc",
      sortDisabled: false,
      viewType: "panel",
      movementMode: "normal",
    },
    events: [],
  };
}

function chip(instanceId, chipType) {
  return { instanceId, chipType, order: 1, settings: {} };
}

function createFakeDocument() {
  const element = (tagName) => {
    const listeners = new Map();
    const node = {
      tagName: tagName.toUpperCase(),
      className: "",
      textContent: "",
      value: "",
      name: "",
      checked: false,
      disabled: false,
      type: "",
      dataset: {},
      attributes: {},
      children: [],
      appendChild(child) { this.children.push(child); return child; },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(listener);
      },
      removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
      emit(type) { for (const listener of listeners.get(type) ?? []) listener({ target: this }); },
      findAllByTag(tag) {
        return [this, ...this.children.flatMap((child) => child.findAllByTag(tag))]
          .filter(({ tagName: current }) => current === tag.toUpperCase());
      },
      findByTag(tag) { return this.findAllByTag(tag)[0]; },
    };
    return node;
  };
  return { document: { createElement: element }, element };
}
