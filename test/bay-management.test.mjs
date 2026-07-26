import test from "node:test";
import assert from "node:assert/strict";

import {
  createNewBayDraft,
  planBayDeletion,
  planBayDuplication,
  renameUserBay,
} from "../dist/panel/lib/bay-management.js";

test("creates an empty unsaved bay under a temporary identity", () => {
  assert.deepEqual(createNewBayDraft("new-bay-session-1", "  作業用  "), {
    temporaryId: "new-bay-session-1",
    name: "作業用",
    chips: [],
  });
});

test("rejects empty temporary identities and names after trimming", () => {
  assert.throws(() => createNewBayDraft("", "作業用"), /temporaryId must not be empty/);
  for (const name of ["", "   ", "\n\t"]) {
    assert.throws(() => createNewBayDraft("new-1", name), /bay name must not be empty/);
  }
});

test("renames a user bay without changing or sharing its source", () => {
  const source = userBay();
  const renamed = renameUserBay(source, "  表示ツール  ");

  assert.equal(renamed.name, "表示ツール");
  assert.equal(source.name, "表示設定");
  renamed.chips[0].settings.query = "changed";
  assert.equal(source.chips[0].settings.query, "book");
});

test("allows duplicate user bay names but rejects permanent bay renaming", () => {
  assert.equal(renameUserBay(userBay(), "表示設定").name, "表示設定");
  assert.throws(() => renameUserBay(permanentBay(), "変更"), /permanent bay cannot be renamed/);
});

test("plans an independent duplicate name and chip values without issuing ids", () => {
  const source = userBay();
  const plan = planBayDuplication(source, ["表示設定", "表示設定 2", "別ベイ"]);

  assert.deepEqual(plan, {
    sourceBayId: "bay-2",
    name: "表示設定 3",
    chips: [{ chipType: "search", order: 1, settings: { query: "book" } }],
  });
  plan.chips[0].settings.query = "changed";
  assert.equal(source.chips[0].settings.query, "book");
});

test("starts duplicate suffixing at 2 and rejects permanent sources", () => {
  assert.equal(planBayDuplication(userBay(), []).name, "表示設定 2");
  assert.throws(
    () => planBayDuplication(permanentBay(), []),
    /permanent bay cannot be duplicated/,
  );
});

test("plans complete deletion and counts each referencing layout once", () => {
  const plan = planBayDeletion(userBay(), [
    layout("layout-1", ["bay-2", "bay-3"]),
    layout("layout-2", ["bay-3"]),
    layout("layout-3", ["bay-2"]),
  ]);

  assert.deepEqual(plan, {
    bayId: "bay-2",
    referencedLayoutIds: ["layout-1", "layout-3"],
    referencedLayoutCount: 2,
  });
});

test("allows deleting an unplaced user bay and rejects a permanent bay", () => {
  assert.deepEqual(planBayDeletion(userBay(), []), {
    bayId: "bay-2",
    referencedLayoutIds: [],
    referencedLayoutCount: 0,
  });
  assert.throws(
    () => planBayDeletion(permanentBay(), []),
    /permanent bay cannot be deleted/,
  );
});

function userBay() {
  return {
    id: "bay-2",
    name: "表示設定",
    permanent: false,
    chips: [{
      instanceId: "chip-2",
      chipType: "search",
      order: 1,
      settings: { query: "book" },
    }],
  };
}

function permanentBay() {
  return { id: "bay-1", name: "固定ベイ", permanent: true, chips: [] };
}

function layout(id, bayIds) {
  return {
    id,
    name: id,
    systemDefault: false,
    placements: bayIds.map((bayId, index) => ({ bayId, rail: "top", order: index + 1 })),
  };
}
