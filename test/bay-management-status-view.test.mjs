import test from "node:test";
import assert from "node:assert/strict";

import { renderBayManagementStatus } from "../dist/panel/lib/bay-management-status-view.js";

test("shows the referenced layout count for a pending deletion", () => {
  const elements = harness();

  renderBayManagementStatus(elements, { status: "deletion-pending", referencedLayoutCount: 3 });

  assert.equal(elements.status.hidden, false);
  assert.equal(elements.status.dataset.status, "deletion-pending");
  assert.equal(elements.message.textContent, "このベイは3個のレイアウトから削除されます");
  assert.equal(elements.menu.hidden, false);
  assert.equal(elements.workspace.hidden, false);
});

test("switches to a deletion completion view until the user closes the factory", () => {
  const elements = harness();

  renderBayManagementStatus(elements, { status: "deleted" });

  assert.equal(elements.status.hidden, false);
  assert.equal(elements.status.dataset.status, "deleted");
  assert.equal(elements.message.textContent, "ベイを削除しました");
  assert.equal(elements.menu.hidden, true);
  assert.equal(elements.workspace.hidden, true);
});

test("restores normal editing after opening another bay", () => {
  const elements = harness();
  renderBayManagementStatus(elements, { status: "deleted" });

  renderBayManagementStatus(elements, { status: "editing" });

  assert.equal(elements.status.hidden, true);
  assert.equal(elements.status.dataset.status, "editing");
  assert.equal(elements.message.textContent, "");
  assert.equal(elements.menu.hidden, false);
  assert.equal(elements.workspace.hidden, false);
});

function harness() {
  return {
    menu: { hidden: false },
    workspace: { hidden: false },
    status: { hidden: true, dataset: {} },
    message: { textContent: "" },
  };
}
