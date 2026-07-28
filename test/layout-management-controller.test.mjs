import test from "node:test";
import assert from "node:assert/strict";

import { bindLayoutManagement } from "../dist/panel/lib/layout-management-controller.js";

test("exposes an external pending save through the existing management retry action", async () => {
  const fake = harness();
  const connection = bindLayoutManagement(fake.elements, fake.coordinator, {
    document: fake.document,
    onStateChange: (documents) => fake.states.push(documents),
  });

  connection.showPendingRetry("削除の保存を再試行してください");
  assert.equal(fake.elements.retry.hidden, false);
  assert.equal(fake.elements.status.textContent, "削除の保存を再試行してください");

  fake.elements.retry.emit("click");
  await flush();
  assert.equal(fake.retryCalls(), 1);
  assert.equal(fake.elements.retry.hidden, true);
  assert.equal(fake.elements.status.textContent, "保存を再試行しました");
  assert.equal(fake.states.length, 1);
});

function harness() {
  const documents = fixture();
  let pending = true;
  let retries = 0;
  const element = (values = {}) => ({
    value: "",
    textContent: "",
    hidden: false,
    disabled: false,
    checked: false,
    open: false,
    children: [],
    listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    emit(type) { this.listeners.get(type)?.({}); },
    appendChild(child) { this.children.push(child); },
    showModal() { this.open = true; },
    close() { this.open = false; },
    ...values,
  });
  const elements = {
    select: element(), restoreDefault: element(), manage: element(), dialog: element(),
    close: element(), name: element(), source: element(), duplicationModes: element(),
    shared: element({ checked: true }), independent: element(), create: element(),
    rename: element(), preferred: element(), delete: element(), retry: element(), status: element(),
  };
  return {
    elements,
    states: [],
    document: { createElement: () => element() },
    coordinator: {
      get pending() { return pending; },
      saving: false,
      state: () => structuredClone(documents),
      retry: async () => {
        retries += 1;
        pending = false;
        return structuredClone(documents);
      },
      create: async () => documents,
      rename: async () => documents,
      setPreferred: async () => documents,
      switchTo: async () => documents,
      restoreDefault: async () => documents,
      delete: async () => documents,
      replaceState() {},
    },
    retryCalls: () => retries,
  };
}

function fixture() {
  return {
    bayConfigurations: { schemaVersion: 1, nextBaySequence: 1, nextChipSequence: 1, bays: [] },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部", systemDefault: true, placements: [] },
        { id: "layout-2", name: "作業", systemDefault: false, placements: [] },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}
