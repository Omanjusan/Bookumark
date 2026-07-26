import test from "node:test";
import assert from "node:assert/strict";

import { createNewBayDraft } from "../dist/panel/lib/bay-management.js";
import { saveNewBay } from "../dist/panel/lib/new-bay-save.js";

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
