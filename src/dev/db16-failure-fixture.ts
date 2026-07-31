import {
  consumeDb16FailureSwitch,
} from "./db16-failure-switch.js";
import type { Db16FailureStorage } from "./db16-failure-switch.js";

const local = browser.storage.local;
const originalGet = local.get.bind(local);
const originalSet = local.set.bind(local);
const originalRemove = local.remove.bind(local);
const fixtureStorage: Db16FailureStorage = {
  get: (key) => originalGet(key),
  set: (items) => originalSet(items),
  remove: (key) => originalRemove(key),
};

local.get = (async (...args: Parameters<typeof local.get>) => {
  if (await consumeDb16FailureSwitch("initialLoad", fixtureStorage)) {
    throw new Error("DB16 fixture: initial load failed once");
  }
  return originalGet(...args);
}) as typeof local.get;

local.set = (async (items: Record<string, unknown>) => {
  if (Object.hasOwn(items, "orderByFolder")
    && await consumeDb16FailureSwitch("customOrderSave", fixtureStorage)) {
    throw new Error("DB16 fixture: custom order save failed once");
  }
  await originalSet(items);
}) as typeof local.set;
