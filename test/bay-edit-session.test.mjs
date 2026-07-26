import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";

test("starts a clean edit session from a user bay", () => {
  const document = fixture();
  const session = createBayEditSession(document, "bay-2");

  assert.equal(session.bayId, "bay-2");
  assert.equal(session.dirty, false);
  assert.deepEqual(session.savedBay(), document.bays[1]);
  assert.deepEqual(session.draftBay(), document.bays[1]);
});

test("accepts an empty user bay as an editable boundary case", () => {
  const document = fixture();
  document.bays[1].chips = [];

  const session = createBayEditSession(document, "bay-2");

  assert.deepEqual(session.draftBay().chips, []);
});

test("does not share state with the source document or returned snapshots", () => {
  const document = fixture();
  const session = createBayEditSession(document, "bay-2");

  document.bays[1].name = "原本を後から変更";
  document.bays[1].chips[0].settings.query = "changed";
  const firstDraft = session.draftBay();
  firstDraft.name = "返却値を変更";
  firstDraft.chips[0].settings.query = "also changed";

  assert.equal(session.savedBay().name, "表示設定");
  assert.equal(session.draftBay().name, "表示設定");
  assert.equal(session.draftBay().chips[0].settings.query, "book");
});

test("rejects an unknown bay and a permanent bay", () => {
  const document = fixture();

  assert.throws(
    () => createBayEditSession(document, "bay-404"),
    /editable bay was not found: bay-404/,
  );
  assert.throws(
    () => createBayEditSession(document, "bay-1"),
    /permanent bay cannot be edited: bay-1/,
  );
});

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 3,
    bays: [
      {
        id: "bay-1",
        name: "内部ベイ",
        permanent: true,
        chips: [],
      },
      {
        id: "bay-2",
        name: "表示設定",
        permanent: false,
        chips: [
          {
            instanceId: "chip-2",
            chipType: "search",
            order: 1,
            settings: { query: "book" },
          },
        ],
      },
    ],
  };
}
