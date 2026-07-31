export const DB16_FAILURE_SWITCH_KEY = "db16FailureSwitch.v1";

export type Db16FailureSwitchName = "initialLoad" | "customOrderSave";

export interface Db16FailureSwitches {
  readonly initialLoad: boolean;
  readonly customOrderSave: boolean;
}

export interface Db16FailureStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

const EMPTY_SWITCHES: Db16FailureSwitches = {
  initialLoad: false,
  customOrderSave: false,
};

/** 指定失敗を回数加算せず、次回1回分の真偽スイッチとして準備する。 */
export async function prepareDb16FailureSwitch(
  name: Db16FailureSwitchName,
  storage: Db16FailureStorage = browser.storage.local,
): Promise<void> {
  const current = await loadSwitches(storage);
  await storage.set({
    [DB16_FAILURE_SWITCH_KEY]: { ...current, [name]: true },
  });
}

/** 対象スイッチを発火前に解除し、今回だけ失敗させる必要があるか返す。 */
export async function consumeDb16FailureSwitch(
  name: Db16FailureSwitchName,
  storage: Db16FailureStorage = browser.storage.local,
): Promise<boolean> {
  const current = await loadSwitches(storage);
  if (!current[name]) return false;
  const next = { ...current, [name]: false };
  if (!next.initialLoad && !next.customOrderSave) {
    await storage.remove(DB16_FAILURE_SWITCH_KEY);
  } else {
    await storage.set({ [DB16_FAILURE_SWITCH_KEY]: next });
  }
  return true;
}

/** DB-15退避復元へ触れず、DB-16の失敗スイッチだけを全解除する。 */
export async function clearDb16FailureSwitches(
  storage: Db16FailureStorage = browser.storage.local,
): Promise<void> {
  await storage.remove(DB16_FAILURE_SWITCH_KEY);
}

/** storage値を独立した2つの真偽スイッチへ安全に復元する。 */
async function loadSwitches(storage: Db16FailureStorage): Promise<Db16FailureSwitches> {
  const stored = await storage.get(DB16_FAILURE_SWITCH_KEY);
  const value = stored[DB16_FAILURE_SWITCH_KEY];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return EMPTY_SWITCHES;
  }
  const record = value as Record<string, unknown>;
  return {
    initialLoad: record.initialLoad === true,
    customOrderSave: record.customOrderSave === true,
  };
}
