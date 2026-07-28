import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipCatalog } from "../dist/panel/lib/docking-chip-catalog.js";
import {
  createDockingConditionFailureNotification,
} from "../dist/panel/lib/docking-condition-failure-notification.js";

test("does not create a notification when condition evaluation has no failures", () => {
  const result = createDockingConditionFailureNotification(
    "rebuild-1", [], sequenceFixture(), documentsFixture(), catalog(),
  );

  assert.equal(result, null);
});

test("creates one warning toast for all failures in a rebuild", () => {
  const result = createDockingConditionFailureNotification(
    "rebuild-2",
    [
      failure("chip-1", "title-condition", "apply-threw"),
      failure("chip-2", "title-condition", "invalid-result"),
      failure("chip-3", "view-condition", "invalid-standard-state"),
    ],
    sequenceFixture(),
    documentsFixture(),
    catalog(),
  );

  assert.deepEqual(result.toast, {
    id: "rebuild-2",
    aggregateKey: "docking-condition-failures",
    severity: "warning",
    message: "条件チップの適用に3件失敗しました\n対象: 条件ベイ／タイトル条件（2件）、表示ベイ／表示条件",
  });
});

test("distinguishes the same chip type by bay while aggregating within each bay", () => {
  const sequence = sequenceFixture();
  sequence.push({
    instanceId: "chip-4",
    chipType: "title-condition",
    settings: {},
    rail: "bottom",
    bayId: "bay-2",
    bayOrder: 1,
    chipOrder: 2,
  });
  const result = createDockingConditionFailureNotification(
    "rebuild-3",
    [
      failure("chip-1", "title-condition", "apply-threw"),
      failure("chip-4", "title-condition", "apply-threw"),
    ],
    sequence,
    documentsFixture(),
    catalog(),
  );

  assert.equal(
    result.toast.message,
    "条件チップの適用に2件失敗しました\n対象: 条件ベイ／タイトル条件、表示ベイ／タイトル条件",
  );
});

test("falls back safely when application or catalog details cannot be resolved", () => {
  const result = createDockingConditionFailureNotification(
    "rebuild-4",
    [failure("missing", "future-condition", "unknown-definition")],
    sequenceFixture(),
    documentsFixture(),
    catalog(),
  );

  assert.equal(
    result.toast.message,
    "条件チップの適用に1件失敗しました\n対象: 不明なベイ／future-condition",
  );
});

test("keeps internal reasons and instance ids only in defensive diagnostics", () => {
  const failures = [failure("chip-1", "title-condition", "apply-threw")];
  const result = createDockingConditionFailureNotification(
    "rebuild-5", failures, sequenceFixture(), documentsFixture(), catalog(),
  );

  assert.doesNotMatch(result.toast.message, /chip-1|apply-threw/);
  assert.deepEqual(result.diagnostics, [{
    instanceId: "chip-1",
    chipType: "title-condition",
    reason: "apply-threw",
    bayId: "bay-1",
    bayName: "条件ベイ",
  }]);

  result.diagnostics[0].bayName = "mutated";
  assert.equal(createDockingConditionFailureNotification(
    "rebuild-5", failures, sequenceFixture(), documentsFixture(), catalog(),
  ).diagnostics[0].bayName, "条件ベイ");
});

test("does not mutate failures, application order, or documents", () => {
  const failures = [failure("chip-1", "title-condition", "apply-threw")];
  const sequence = sequenceFixture();
  const documents = documentsFixture();
  const before = structuredClone({ failures, sequence, documents });

  createDockingConditionFailureNotification(
    "rebuild-6", failures, sequence, documents, catalog(),
  );

  assert.deepEqual({ failures, sequence, documents }, before);
});

function failure(instanceId, chipType, reason) {
  return { instanceId, chipType, reason };
}

function catalog() {
  return createDockingChipCatalog([
    { chipType: "title-condition", displayName: "タイトル条件", kind: "condition" },
    { chipType: "view-condition", displayName: "表示条件", kind: "condition" },
  ], []);
}

function sequenceFixture() {
  return [
    {
      instanceId: "chip-1",
      chipType: "title-condition",
      settings: {},
      rail: "top",
      bayId: "bay-1",
      bayOrder: 1,
      chipOrder: 1,
    },
    {
      instanceId: "chip-2",
      chipType: "title-condition",
      settings: {},
      rail: "top",
      bayId: "bay-1",
      bayOrder: 1,
      chipOrder: 2,
    },
    {
      instanceId: "chip-3",
      chipType: "view-condition",
      settings: {},
      rail: "bottom",
      bayId: "bay-2",
      bayOrder: 1,
      chipOrder: 1,
    },
  ];
}

function documentsFixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 5,
      bays: [
        { id: "bay-1", name: "条件ベイ", permanent: false, chips: [] },
        { id: "bay-2", name: "表示ベイ", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{ id: "layout-1", name: "一", systemDefault: false, placements: [] }],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
