import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCardViewModels,
  formatLocalDateTime,
} from "../dist/panel/lib/card-view-model.js";

test("builds card text for visited, unvisited, and unknown history items", () => {
  const input = [
    {
      guid: "visited",
      title: "Visited",
      url: "https://docs.example.com/page",
      visitCount: 12,
      lastVisitTime: 100,
    },
    { guid: "unvisited", title: "Unvisited", url: "https://example.com", visitCount: 0 },
    { guid: "unknown", title: "Unknown", url: "not a URL" },
  ];
  const snapshot = structuredClone(input);
  const models = buildCardViewModels(input, { formatDateTime: () => "2026/07/25 14:30" });

  assert.deepEqual(models, [
    {
      guid: "visited",
      title: "Visited",
      url: "https://docs.example.com/page",
      domain: "docs.example.com",
      visitText: "訪問回数: 12回",
      lastVisitText: "最終訪問: 2026/07/25 14:30",
    },
    {
      guid: "unvisited",
      title: "Unvisited",
      url: "https://example.com",
      domain: "example.com",
      visitText: "訪問回数: 未訪問",
      lastVisitText: "最終訪問: 記録なし",
    },
    {
      guid: "unknown",
      title: "Unknown",
      url: "not a URL",
      domain: "",
      visitText: "訪問回数: 履歴不明",
      lastVisitText: "最終訪問: 記録なし",
    },
  ]);
  assert.deepEqual(input, snapshot);
});

test("treats invalid counts and timestamps as unknown records", () => {
  const [model] = buildCardViewModels([{
    guid: "invalid",
    title: "Invalid",
    url: "https://example.com",
    visitCount: Number.NaN,
    lastVisitTime: Number.POSITIVE_INFINITY,
  }]);
  assert.equal(model.visitText, "訪問回数: 履歴不明");
  assert.equal(model.lastVisitText, "最終訪問: 記録なし");
});

test("formats a valid timestamp in local time with minutes", () => {
  const local = new Date(2026, 6, 25, 14, 30).getTime();
  assert.equal(formatLocalDateTime(local), "2026/07/25 14:30");
  assert.equal(formatLocalDateTime(Number.NaN), null);
});
