import test from "node:test";
import assert from "node:assert/strict";

test("renders loading and empty as mutually exclusive status messages", async () => {
  const { renderPanelStatus } = await import(
    "../dist/panel/lib/panel-status-view.js"
  );
  const fake = harness();

  renderPanelStatus(fake.root, { status: "loading" }, fake.document);
  assert.deepEqual(fake.messages(), [
    { className: "status", textContent: "読み込み中…" },
  ]);

  renderPanelStatus(fake.root, { status: "empty" }, fake.document);
  assert.deepEqual(fake.messages(), [
    { className: "status", textContent: "ブックマークがありません" },
  ]);
});

test("shows a fixed error message and reports details outside the UI", async () => {
  const { renderPanelStatus } = await import(
    "../dist/panel/lib/panel-status-view.js"
  );
  const fake = harness();
  const failure = new Error("private API detail");
  const reported = [];

  renderPanelStatus(fake.root, {
    status: "error",
    error: failure,
    reportError: (error) => reported.push(error),
  }, fake.document);

  assert.deepEqual(fake.messages(), [
    { className: "status error", textContent: "読み込みに失敗しました" },
  ]);
  assert.deepEqual(reported, [failure]);
  assert.doesNotMatch(fake.root.children[0].textContent, /private API detail/);
});

test("re-rendering the same state leaves exactly one status element", async () => {
  const { renderPanelStatus } = await import(
    "../dist/panel/lib/panel-status-view.js"
  );
  const fake = harness();

  renderPanelStatus(fake.root, { status: "loading" }, fake.document);
  renderPanelStatus(fake.root, { status: "loading" }, fake.document);

  assert.equal(fake.root.children.length, 1);
});

function harness() {
  const root = {
    children: [],
    set textContent(value) {
      if (value === "") this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
  return {
    root,
    document: {
      createElement() {
        return { className: "", textContent: "" };
      },
    },
    messages() {
      return root.children.map(({ className, textContent }) => ({
        className,
        textContent,
      }));
    },
  };
}
