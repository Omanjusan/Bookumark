import test from "node:test";
import assert from "node:assert/strict";

import {
  issueNamedLayoutIdentity,
  resolveUniqueLayoutName,
} from "../dist/panel/lib/layout-management.js";

test("trims a new layout name and keeps it when it is unused", () => {
  assert.equal(resolveUniqueLayoutName("  読書用  ", ["作業用"]), "読書用");
});

test("uses the smallest available parenthesized suffix for a duplicate name", () => {
  assert.equal(
    resolveUniqueLayoutName("作業用", ["作業用", "作業用 (2)", "作業用 (4)"]),
    "作業用 (3)",
  );
});

test("continues an existing suffix from its base name", () => {
  assert.equal(
    resolveUniqueLayoutName("作業用 (2)", ["作業用", "作業用 (2)", "作業用 (3)"]),
    "作業用 (4)",
  );
});

test("rejects a layout name that is empty after trimming", () => {
  for (const name of ["", "   ", "\n\t"]) {
    assert.throws(() => resolveUniqueLayoutName(name, []), /layout name must not be empty/);
  }
});

test("issues a layout id and unique name as one identity", () => {
  assert.deepEqual(issueNamedLayoutIdentity(7, " 作業用 ", ["作業用"]), {
    id: "layout-7",
    name: "作業用 (2)",
    nextLayoutSequence: 8,
  });
});

test("rejects invalid or exhausted layout sequences before issuing an identity", () => {
  for (const sequence of [0, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => issueNamedLayoutIdentity(sequence, "作業用", []),
      /sequence|incremented safely/,
    );
  }
});
