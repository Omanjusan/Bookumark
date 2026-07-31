import test from "node:test";
import assert from "node:assert/strict";

import { createNewBayDraft } from "../dist/panel/lib/bay-management.js";
import { saveNewBay, saveNewBayConfiguration } from "../dist/panel/lib/new-bay-save.js";

test("formalizes an edited temporary bay with all chip instances in one request", async () => {
  const documents = fixture();
  const temporary = structuredClone(documents.bayConfigurations);
  temporary.nextChipSequence = 5;
  temporary.bays.push({
    id: "new-bay-session-1",
    name: "チップ付き",
    permanent: false,
    chips: [
      { instanceId: "chip-3", chipType: "search", order: 1, settings: {} },
      { instanceId: "chip-4", chipType: "sort", order: 2, settings: {} },
    ],
  });
  const requests = [];

  const result = await saveNewBayConfiguration(
    documents,
    temporary,
    "new-bay-session-1",
    "layout-2",
    "right",
    { saveDocuments: async (patch) => requests.push(patch) },
  );

  assert.equal(requests.length, 1);
  assert.equal(result.bay.id, "bay-3");
  assert.deepEqual(result.bay.chips, temporary.bays.at(-1).chips);
  assert.equal(result.documents.bayConfigurations.nextBaySequence, 4);
  assert.equal(result.documents.bayConfigurations.nextChipSequence, 5);
  assert.equal(result.documents.bayConfigurations.bays.some(({ id }) => id.startsWith("new-bay-session-")), false);
  assert.deepEqual(result.documents.mainLayouts.layouts[1].placements.at(-1), {
    bayId: "bay-3", rail: "right", order: 1,
  });
});

test("places new bays at the inward end of every selected rail", async () => {
  for (const rail of ["top", "right", "bottom", "left"]) {
    const documents = fixture();
    const temporary = structuredClone(documents.bayConfigurations);
    temporary.bays.push({ id: `new-${rail}`, name: `新規-${rail}`, permanent: false, chips: [] });
    const result = await saveNewBayConfiguration(
      documents, temporary, `new-${rail}`, "layout-2", rail,
      { saveDocuments: async () => {} },
    );
    const placement = result.documents.mainLayouts.layouts[1].placements.at(-1);
    const previousOrders = documents.mainLayouts.layouts[1].placements
      .filter((item) => item.rail === rail).map(({ order }) => order);
    assert.deepEqual(placement, {
      bayId: "bay-3",
      rail,
      order: Math.max(0, ...previousOrders) + 1,
    });
  }
});

test("rejects a duplicate bay name without issuing a storage request", async () => {
  const documents = fixture();
  const temporary = structuredClone(documents.bayConfigurations);
  temporary.bays.push({ id: "new-duplicate", name: "表示", permanent: false, chips: [] });
  let saves = 0;

  await assert.rejects(
    saveNewBayConfiguration(documents, temporary, "new-duplicate", "layout-2", "left", {
      saveDocuments: async () => { saves += 1; },
    }),
    /bay name already exists: 表示/,
  );
  assert.equal(saves, 0);
});

test("issues a formal id and saves the bay at the active top rail end in one request", async () => {
  const documents = fixture();
  const requests = [];

  const result = await saveNewBay(
    documents,
    createNewBayDraft("new-session-1", "  調査用  "),
    "layout-2",
    { saveDocuments: async (patch) => { requests.push(patch); } },
  );

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["bayConfigurations", "mainLayouts"]);
  assert.equal(result.bay.id, "bay-3");
  assert.equal(result.bay.name, "調査用");
  assert.equal(result.bay.permanent, false);
  assert.deepEqual(result.bay.chips, []);
  assert.equal(result.documents.bayConfigurations.nextBaySequence, 4);
  assert.deepEqual(
    result.documents.mainLayouts.layouts[1].placements.at(-1),
    { bayId: "bay-3", rail: "top", order: 3 },
  );
  assert.deepEqual(requests[0], result.documents);
});

test("does not modify the immutable internal default layout", async () => {
  const documents = fixture();

  const result = await saveNewBay(documents, createNewBayDraft("new-1", "未配置"), "layout-1", {
    saveDocuments: async () => {},
  });

  assert.equal(result.bay.id, "bay-3");
  assert.deepEqual(result.documents.mainLayouts, documents.mainLayouts);
  assert.equal(
    result.documents.mainLayouts.layouts.flatMap((layout) => layout.placements)
      .some(({ bayId }) => bayId === "bay-3"),
    false,
  );
});

test("rejects a missing active layout before issuing a storage request", async () => {
  let saveCalls = 0;
  const documents = fixture();

  await assert.rejects(
    saveNewBay(documents, createNewBayDraft("new-1", "調査用"), "layout-404", {
      saveDocuments: async () => { saveCalls += 1; },
    }),
    /active layout was not found: layout-404/,
  );

  assert.equal(saveCalls, 0);
  assert.deepEqual(documents, fixture());
});

test("keeps all inputs unchanged on save failure and retries the same candidate id", async () => {
  const documents = fixture();
  const draft = createNewBayDraft("new-1", "調査用");
  const attemptedIds = [];
  let fail = true;
  const saveDocuments = async (patch) => {
    attemptedIds.push(patch.bayConfigurations.bays.at(-1).id);
    if (fail) throw new Error("storage failed");
  };

  await assert.rejects(
    saveNewBay(documents, draft, "layout-2", { saveDocuments }),
    /storage failed/,
  );
  fail = false;
  const result = await saveNewBay(documents, draft, "layout-2", { saveDocuments });

  assert.deepEqual(attemptedIds, ["bay-3", "bay-3"]);
  assert.equal(result.bay.id, "bay-3");
  assert.deepEqual(documents, fixture());
  assert.deepEqual(draft, createNewBayDraft("new-1", "調査用"));
});

test("fails atomically when a bay id cannot be issued", async () => {
  const documents = fixture();
  documents.bayConfigurations.nextBaySequence = Number.MAX_SAFE_INTEGER;
  let saveCalls = 0;

  await assert.rejects(
    saveNewBay(documents, createNewBayDraft("new-1", "調査用"), "layout-2", {
      saveDocuments: async () => { saveCalls += 1; },
    }),
    /cannot be incremented safely/,
  );
  assert.equal(saveCalls, 0);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 3,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        { id: "bay-2", name: "表示", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部デフォルト",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "普段用",
          systemDefault: false,
          placements: [
            { bayId: "bay-1", rail: "top", order: 1 },
            { bayId: "bay-2", rail: "top", order: 2 },
          ],
        },
      ],
    },
  };
}
