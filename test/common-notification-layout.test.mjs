import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides one labelled and described native common notification dialog", () => {
  assert.equal((html.match(/id="common-notification-dialog"/g) ?? []).length, 1);
  assert.match(
    html,
    /<dialog[^>]+id="common-notification-dialog"[^>]+aria-labelledby="common-notification-title"[^>]+aria-describedby="common-notification-message"[^>]*>/,
  );
  assert.match(html, /id="common-notification-title"/);
  assert.match(html, /id="common-notification-message"/);
  assert.match(html, /id="common-notification-busy"[^>]+role="status"[^>]+hidden/);
  assert.match(html, /id="common-notification-primary"[^>]+type="button"/);
});

test("provides one polite live region for common toasts", () => {
  assert.equal((html.match(/id="common-toast-region"/g) ?? []).length, 1);
  assert.match(
    html,
    /id="common-toast-region"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="false"/,
  );
});

test("keeps long notifications operable inside narrow panel viewports", () => {
  assert.match(
    css,
    /\.common-notification-dialog\s*\{[^}]*width:\s*min\(520px,\s*calc\(100vw - 24px\)\)[^}]*max-height:\s*calc\(100vh - 24px\)[^}]*overflow:\s*auto/s,
  );
  assert.match(css, /\.common-notification-message\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(
    css,
    /\.common-toast-region\s*\{[^}]*position:\s*fixed[^}]*max-width:\s*calc\(100vw - 24px\)/s,
  );
  assert.match(css, /\.common-toast-message\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});
