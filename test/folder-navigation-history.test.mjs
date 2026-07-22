import test from "node:test";
import assert from "node:assert/strict";
import { createFolderNavigationHistory } from "../dist/panel/lib/folder-navigation-history.js";

test("starts at the initial folder with no backward or forward destination", () => {
  const history = createFolderNavigationHistory("root");

  assert.equal(history.current(), "root");
  assert.equal(history.backDestination(), null);
  assert.equal(history.forwardDestination(), null);
});

test("starts at the end of an initial ancestor route", () => {
  const history = createFolderNavigationHistory(["root", "parent", "current"]);

  assert.equal(history.current(), "current");
  assert.equal(history.backDestination(), "parent");
  assert.equal(history.forwardDestination(), null);
  assert.equal(history.moveBack(), "parent");
  assert.equal(history.moveBack(), "root");
  assert.equal(history.moveBack(), null);
  assert.equal(history.moveForward(), "parent");
  assert.equal(history.moveForward(), "current");
});

test("rejects an empty initial route", () => {
  assert.throws(
    () => createFolderNavigationHistory([]),
    /requires an initial folder/,
  );
});

test("moves backward and forward through visited folders", () => {
  const history = createFolderNavigationHistory("a");
  history.visit("b");
  history.visit("c");

  assert.equal(history.backDestination(), "b");
  assert.equal(history.moveBack(), "b");
  assert.equal(history.backDestination(), "a");
  assert.equal(history.forwardDestination(), "c");
  assert.equal(history.moveBack(), "a");
  assert.equal(history.moveBack(), null);
  assert.equal(history.moveForward(), "b");
  assert.equal(history.moveForward(), "c");
  assert.equal(history.moveForward(), null);
});

test("a new visit after moving backward discards the forward branch", () => {
  const history = createFolderNavigationHistory("a");
  history.visit("b");
  history.visit("c");
  history.moveBack();

  history.visit("d");

  assert.equal(history.current(), "d");
  assert.equal(history.backDestination(), "b");
  assert.equal(history.forwardDestination(), null);
});

test("does not add a consecutive duplicate folder", () => {
  const history = createFolderNavigationHistory("root");

  assert.equal(history.visit("root"), false);
  assert.equal(history.backDestination(), null);
  assert.equal(history.current(), "root");
});
