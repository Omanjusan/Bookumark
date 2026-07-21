import test from "node:test";
import assert from "node:assert/strict";

import {
  PANEL_INFORMATION_BY_SIZE,
  buildPanelTileModels,
} from "../dist/panel/lib/panel-tile-model.js";

const expectedInformation = {
  "1/16": { fields: ["favicon"] },
  "1/8": { fields: ["favicon"] },
  "1/4": { fields: ["favicon", "title"], titleLineLimit: 1 },
  "1/2": { fields: ["favicon", "title"], titleLineLimit: 2 },
  "1": { fields: ["favicon", "title", "domain"] },
  "2": { fields: ["favicon", "title", "domain", "scaleValue"] },
  "4": { fields: ["favicon", "title", "domain", "scaleValue", "auxiliary"] },
};

function input(guid, size) {
  return {
    item: {
      guid,
      title: `Title ${guid}`,
      url: `https://${guid}.example/path`,
    },
    size,
    scaleValue: `Scale ${guid}`,
    auxiliary: `Auxiliary ${guid}`,
  };
}

test("defines the visible information for all seven panel sizes", () => {
  assert.deepEqual(PANEL_INFORMATION_BY_SIZE, expectedInformation);
});

test("creates tile models with their size identifiers and display data", () => {
  const result = buildPanelTileModels([input("a", "2")]);

  assert.deepEqual(result, [
    {
      guid: "a",
      url: "https://a.example/path",
      title: "Title a",
      domain: "a.example",
      size: "2",
      fields: ["favicon", "title", "domain", "scaleValue"],
      scaleValue: "Scale a",
      auxiliary: "Auxiliary a",
    },
  ]);
});

test("preserves the supplied display order across different sizes", () => {
  const inputs = [input("third", "1/16"), input("first", "4"), input("second", "1")];

  assert.deepEqual(
    buildPanelTileModels(inputs).map(({ guid, size }) => ({ guid, size })),
    [
      { guid: "third", size: "1/16" },
      { guid: "first", size: "4" },
      { guid: "second", size: "1" },
    ],
  );
});

test("does not mutate tile inputs or their bookmark items", () => {
  const inputs = [input("a", "1/4"), input("b", "1/2")];
  const snapshot = structuredClone(inputs);

  buildPanelTileModels(inputs);

  assert.deepEqual(inputs, snapshot);
});

test("uses an empty domain when a URL is invalid", () => {
  const tile = input("invalid", "1");
  tile.item.url = "not a url";

  assert.equal(buildPanelTileModels([tile])[0].domain, "");
});

test("passes an optional favicon URL to the tile model", () => {
  const tile = {
    ...input("favicon", "1"),
    faviconUrl: "moz-extension://bookumark/icons/favicon.png",
  };

  assert.equal(buildPanelTileModels([tile])[0].faviconUrl, tile.faviconUrl);
});

test("omits favicon URLs that are missing or empty", () => {
  const missing = input("missing", "1");
  const empty = { ...input("empty", "1"), faviconUrl: "" };

  assert.equal(buildPanelTileModels([missing])[0].faviconUrl, undefined);
  assert.equal(buildPanelTileModels([empty])[0].faviconUrl, undefined);
});
