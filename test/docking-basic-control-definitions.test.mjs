import test from "node:test";
import assert from "node:assert/strict";

import {
  BASIC_DOCKING_CONTROL_DEFINITIONS,
  createDockingBasicControlStore,
} from "../dist/panel/lib/docking-basic-control-definitions.js";
import { createDefaultDockingSharedState } from "../dist/panel/lib/docking-shared-state.js";

const BASIC_TYPES = [
  "search", "visit-status", "folder-history", "sort", "view-type", "movement-mode",
];

test("defines all six basic chips as controls over condition-evaluated state", () => {
  assert.deepEqual([...BASIC_DOCKING_CONTROL_DEFINITIONS.keys()], BASIC_TYPES);
  assert.deepEqual(
    [...BASIC_DOCKING_CONTROL_DEFINITIONS.values()].map(({ kind }) => kind),
    BASIC_TYPES.map(() => "control"),
  );

  const state = {
    ...createDefaultDockingSharedState("layout-1"),
    query: "condition query",
    filters: { visitStatus: "visited", future: true },
    sort: { axisId: "title", direction: "asc" },
    viewType: "card",
    movementMode: "custom-order",
    folderHistory: { canGoBack: true, canGoForward: false, pending: false },
  };
  const store = createDockingBasicControlStore(state);

  assert.deepEqual(BASIC_TYPES.map((type) => store.read(instance(type))), [
    "condition query",
    "visited",
    { canGoBack: true, canGoForward: false, pending: false },
    { axisId: "title", direction: "asc" },
    "card",
    "custom-order",
  ]);
});

test("synchronizes duplicate and related controls after one shared-state update", () => {
  const store = createDockingBasicControlStore(createDefaultDockingSharedState("layout-1"));
  const firstSearch = [];
  const secondSearch = [];
  const visit = [];
  store.connect(instance("search", "search-1"), (value) => firstSearch.push(value));
  store.connect(instance("search", "search-2"), (value) => secondSearch.push(value));
  store.connect(instance("visit-status", "visit-1"), (value) => visit.push(value));

  store.update(instance("search", "search-1"), "book");
  store.update(instance("visit-status", "visit-1"), "unvisited");

  assert.deepEqual(firstSearch, ["", "book", "book"]);
  assert.deepEqual(secondSearch, ["", "book", "book"]);
  assert.deepEqual(visit, ["all", "all", "unvisited"]);
  assert.deepEqual(store.getState(), {
    ...createDefaultDockingSharedState("layout-1"),
    query: "book",
    filters: { visitStatus: "unvisited" },
  });
});

test("updates every basic control and normalizes frozen directory mode", () => {
  const initial = {
    ...createDefaultDockingSharedState("layout-1"),
    filters: { visitStatus: "all", futureFilter: 1 },
    futureState: { kept: true },
  };
  const store = createDockingBasicControlStore(initial);
  const history = { canGoBack: true, canGoForward: true, pending: false };

  store.update(instance("folder-history"), history);
  store.update(instance("sort"), { axisId: "dateAdded", direction: "asc" });
  store.update(instance("view-type"), "list");
  store.update(instance("movement-mode"), "directory-move");

  assert.deepEqual(store.getState(), {
    ...initial,
    folderHistory: history,
    sort: { axisId: "dateAdded", direction: "asc" },
    viewType: "list",
    movementMode: "custom-order",
  });
});

test("rejects an invalid control update atomically and isolates disconnected copies", () => {
  const initial = createDefaultDockingSharedState("layout-1");
  const store = createDockingBasicControlStore(initial);
  const rendered = [];
  const connection = store.connect(instance("view-type"), (value) => rendered.push(value));

  assert.throws(() => store.update(instance("view-type"), "unknown"), /invalid Docking shared state/);
  assert.deepEqual(store.getState(), initial);
  assert.deepEqual(rendered, ["panel"]);

  connection.disconnect();
  store.update(instance("view-type"), "icon");
  assert.deepEqual(rendered, ["panel"]);
});

test("defensively separates state and rendered values from consumers", () => {
  const state = {
    ...createDefaultDockingSharedState("layout-1"),
    folderHistory: { canGoBack: false, canGoForward: false, pending: false },
  };
  const store = createDockingBasicControlStore(state);
  const rendered = [];
  store.connect(instance("folder-history"), (value) => rendered.push(value));

  state.folderHistory.canGoBack = true;
  rendered[0].canGoForward = true;
  const snapshot = store.getState();
  snapshot.folderHistory.pending = true;

  assert.deepEqual(store.read(instance("folder-history")), {
    canGoBack: false,
    canGoForward: false,
    pending: false,
  });
});

test("returns movement mode to normal for active search, filter, and standard sort", () => {
  const custom = {
    ...createDefaultDockingSharedState("layout-1"),
    movementMode: "custom-order",
  };
  const store = createDockingBasicControlStore(custom);

  store.update(instance("search"), "book");
  assert.equal(store.getState().movementMode, "normal");
  store.update(instance("movement-mode"), "directory-move");
  assert.equal(store.getState().movementMode, "custom-order");
  store.update(instance("visit-status"), "visited");
  assert.equal(store.getState().movementMode, "normal");
  store.update(instance("movement-mode"), "custom-order");
  store.update(instance("sort"), { axisId: "title", direction: "asc" });
  assert.equal(store.getState().movementMode, "normal");
});

test("normalizes a legacy directory-mode initial state at the runtime boundary", () => {
  const initial = {
    ...createDefaultDockingSharedState("layout-1"),
    movementMode: "directory-move",
  };
  const before = structuredClone(initial);
  const store = createDockingBasicControlStore(initial);

  assert.equal(store.getState().movementMode, "custom-order");
  assert.deepEqual(initial, before);
});

function instance(chipType, instanceId = `${chipType}-1`) {
  return { instanceId, chipType, order: 1, settings: {} };
}
