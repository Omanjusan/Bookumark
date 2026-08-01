import test from "node:test";
import assert from "node:assert/strict";

import {
  PANEL_FLAVOR_IDS,
  createPanelFlavorSeed,
  panelFlavorForGuid,
} from "../dist/panel/lib/panel-flavor.js";

test("selects only registered flavors and keeps a GUID stable within one session", () => {
  const first = panelFlavorForGuid("bookmark-alpha", 123456);

  assert.ok(PANEL_FLAVOR_IDS.includes(first));
  assert.equal(panelFlavorForGuid("bookmark-alpha", 123456), first);
});

test("assigns flavors by GUID rather than display position", () => {
  const guids = ["third", "first", "second"];
  const before = new Map(guids.map((guid) => [guid, panelFlavorForGuid(guid, 9876)]));

  for (const guid of guids.toReversed()) {
    assert.equal(panelFlavorForGuid(guid, 9876), before.get(guid));
  }
});

test("allows a new page session to produce a different distribution", () => {
  const guids = Array.from({ length: 24 }, (_, index) => `bookmark-${index}`);
  const first = guids.map((guid) => panelFlavorForGuid(guid, 1));
  const second = guids.map((guid) => panelFlavorForGuid(guid, 2));

  assert.notDeepEqual(second, first);
});

test("creates an unsigned session seed from an injected random source", () => {
  assert.equal(createPanelFlavorSeed(() => 0), 0);
  assert.equal(createPanelFlavorSeed(() => 0.5), 0x80000000);
});
