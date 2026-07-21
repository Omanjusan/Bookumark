import test from "node:test";
import assert from "node:assert/strict";

test("opens the closest panel tile in one new active tab", async () => {
  const { bindPanelTileOpen } = await import(
    "../dist/panel/lib/panel-tile-open.js"
  );
  const fake = harness();
  const opened = [];
  bindPanelTileOpen(fake.root, {
    createTab: async (details) => opened.push(details),
    reportError: assert.fail,
  });
  const tile = { dataset: { url: "https://example.com/path" } };

  fake.click({ closest: (selector) => selector === ".panel-tile" ? tile : null });
  await settlePromises();

  assert.deepEqual(opened, [{ url: "https://example.com/path", active: true }]);
});

test("ignores clicks outside a panel tile or on a tile without a URL", async () => {
  const { bindPanelTileOpen } = await import(
    "../dist/panel/lib/panel-tile-open.js"
  );
  const fake = harness();
  const opened = [];
  bindPanelTileOpen(fake.root, {
    createTab: async (details) => opened.push(details),
    reportError: assert.fail,
  });

  fake.click({ closest: () => null });
  fake.click({ closest: () => ({ dataset: {} }) });
  await settlePromises();

  assert.deepEqual(opened, []);
});

test("reports tab creation failure without rejecting the click handler", async () => {
  const { bindPanelTileOpen } = await import(
    "../dist/panel/lib/panel-tile-open.js"
  );
  const fake = harness();
  const failure = new Error("tabs.create failed");
  const reported = [];
  bindPanelTileOpen(fake.root, {
    createTab: async () => { throw failure; },
    reportError: (error) => reported.push(error),
  });

  assert.doesNotThrow(() => {
    fake.click({ closest: () => ({ dataset: { url: "https://example.com" } }) });
  });
  await settlePromises();

  assert.deepEqual(reported, [failure]);
});

test("stops opening tiles after disconnect", async () => {
  const { bindPanelTileOpen } = await import(
    "../dist/panel/lib/panel-tile-open.js"
  );
  const fake = harness();
  const opened = [];
  const connection = bindPanelTileOpen(fake.root, {
    createTab: async (details) => opened.push(details),
    reportError: assert.fail,
  });

  connection.disconnect();
  fake.click({ closest: () => ({ dataset: { url: "https://example.com" } }) });
  await settlePromises();

  assert.deepEqual(opened, []);
});

function harness() {
  const listeners = new Set();
  return {
    root: {
      addEventListener(type, listener) {
        assert.equal(type, "click");
        listeners.add(listener);
      },
      removeEventListener(type, listener) {
        assert.equal(type, "click");
        listeners.delete(listener);
      },
    },
    click(target) {
      for (const listener of listeners) listener({ target });
    },
  };
}

async function settlePromises() {
  await Promise.resolve();
  await Promise.resolve();
}
