import {
  createDb15BayEditingFixture,
  createDb15DockingFixture,
  createDb15LongNotificationFixture,
  DB15_FIXTURE_COUNTS,
} from "../panel/lib/db15-load-fixture.js";
import { DOCKING_STORAGE_KEYS } from "../panel/lib/docking-storage.js";
import {
  clearDb16FailureSwitches,
  prepareDb16FailureSwitch,
} from "./db16-failure-switch.js";

const BACKUP_KEY = "db15FixtureBackup.v1";
const OFFICIAL_DND_FOLDER_TITLE = "DB15 公式整理 移動先";
const STORAGE_KEYS = [...Object.values(DOCKING_STORAGE_KEYS), "currentFolder"];
const install = requireButton("install");
const editFixture = requireButton("edit-fixture");
const loadFixture = requireButton("load-fixture");
const officialDndFixture = requireButton("official-dnd-fixture");
const longNotificationFixture = requireButton("long-notification-fixture");
const failInitialLoadOnce = requireButton("fail-initial-load-once");
const failCustomOrderSaveOnce = requireButton("fail-custom-order-save-once");
const clearDb16Failures = requireButton("clear-db16-failures");
const open = requireButton("open");
const restore = requireButton("restore");
const status = requireStatus();

install.addEventListener("click", () => runLocked(async () => {
  const existing = await browser.storage.local.get(BACKUP_KEY);
  if (existing[BACKUP_KEY] !== undefined) {
    throw new Error("投入済みです。先に投入前の状態へ復元してください。");
  }

  const stored = await browser.storage.local.get(STORAGE_KEYS);
  await browser.storage.local.set({ [BACKUP_KEY]: { stored } });
  const root = await browser.bookmarks.create({ title: "Bookumark DB-15 fixture" });
  await browser.storage.local.set({ [BACKUP_KEY]: { stored, fixtureRootId: root.id } });

  for (let index = 0; index < DB15_FIXTURE_COUNTS.bookmarks; index += 1) {
    await browser.bookmarks.create({
      parentId: root.id,
      title: `DB15 Bookmark ${String(index + 1).padStart(4, "0")}`,
      url: `https://example-${index % 200}.test/db15/${index + 1}`,
    });
    if ((index + 1) % 100 === 0) setStatus(`ブックマークを作成中: ${index + 1}/2000`);
  }

  const documents = createDb15DockingFixture();
  await browser.storage.local.set({
    [DOCKING_STORAGE_KEYS.bayConfigurations]: documents.bayConfigurations,
    [DOCKING_STORAGE_KEYS.mainLayouts]: documents.mainLayouts,
    [DOCKING_STORAGE_KEYS.dockingMetadata]: documents.dockingMetadata,
    currentFolder: { guid: root.id, ancestorGuids: [] },
  });
  setStatus("投入完了。Bookumarkを再読み込みしてください。");
}));

restore.addEventListener("click", () => runLocked(async () => {
  const result = await browser.storage.local.get(BACKUP_KEY);
  const backup = parseBackup(result[BACKUP_KEY]);
  if (backup === null) throw new Error("復元できるDB-15退避データがありません。");

  if (backup.fixtureRootId !== undefined) {
    try {
      await browser.bookmarks.removeTree(backup.fixtureRootId);
    } catch (error) {
      console.warn("DB-15 fixture bookmark folder could not be removed", error);
    }
  }
  await browser.storage.local.remove(STORAGE_KEYS);
  if (Object.keys(backup.stored).length > 0) await browser.storage.local.set(backup.stored);
  await browser.storage.local.remove(BACKUP_KEY);
  setStatus("復元完了。Bookumarkを再読み込みしてください。");
}));

open.addEventListener("click", () => runLocked(async () => {
  const result = await browser.storage.local.get(BACKUP_KEY);
  const backup = parseBackup(result[BACKUP_KEY]);
  if (backup?.fixtureRootId === undefined) {
    throw new Error("開けるDB-15 fixtureフォルダがありません。");
  }
  const children = await browser.bookmarks.getChildren(backup.fixtureRootId);
  await browser.storage.local.set({
    currentFolder: { guid: backup.fixtureRootId, ancestorGuids: [] },
  });
  await browser.tabs.create({ url: browser.runtime.getURL("panel/panel.html") });
  setStatus(`fixtureを新しいBookumarkタブで開きました: ${children.length}件`);
}));

editFixture.addEventListener("click", () => runLocked(async () => {
  await requireInstalledFixture();
  await saveFixtureDocuments(createDb15BayEditingFixture());
  setStatus("ベイ編集調査fixtureへ切り替えました。Bookumarkを再読み込みしてください。");
}));

loadFixture.addEventListener("click", () => runLocked(async () => {
  await requireInstalledFixture();
  await saveFixtureDocuments(createDb15DockingFixture());
  setStatus("高負荷fixtureへ戻しました。Bookumarkを再読み込みしてください。");
}));

officialDndFixture.addEventListener("click", () => runLocked(async () => {
  const result = await browser.storage.local.get(BACKUP_KEY);
  const backup = parseBackup(result[BACKUP_KEY]);
  if (backup?.fixtureRootId === undefined) {
    throw new Error("先に高負荷fixtureを投入してください。");
  }
  const children = await browser.bookmarks.getChildren(backup.fixtureRootId);
  const exists = children.some(
    (child) => child.type === "folder" && child.title === OFFICIAL_DND_FOLDER_TITLE,
  );
  if (!exists) {
    await browser.bookmarks.create({
      parentId: backup.fixtureRootId,
      title: OFFICIAL_DND_FOLDER_TITLE,
    });
  }
  setStatus(exists
    ? "公式整理D&D用フォルダは準備済みです。"
    : "公式整理D&D用フォルダを追加しました。Bookumarkを再読み込みしてください。");
}));

longNotificationFixture.addEventListener("click", () => runLocked(async () => {
  await requireInstalledFixture();
  await saveFixtureDocuments(createDb15LongNotificationFixture());
  setStatus("長文通知fixtureへ切り替えました。Bookumarkを再読み込みしてください。");
}));

failInitialLoadOnce.addEventListener("click", () => runLocked(async () => {
  await prepareDb16FailureSwitch("initialLoad");
  setStatus("次回のBookumark初期読み込みを1回だけ失敗させます。");
}));

failCustomOrderSaveOnce.addEventListener("click", () => runLocked(async () => {
  await prepareDb16FailureSwitch("customOrderSave");
  setStatus("次回の仮想表示順保存を1回だけ失敗させます。");
}));

clearDb16Failures.addEventListener("click", () => runLocked(async () => {
  await clearDb16FailureSwitches();
  setStatus("DB-16失敗スイッチを解除しました。");
}));

/** 多重操作を防いでfixture操作を実行し、失敗を画面へ報告する。 */
async function runLocked(operation: () => Promise<void>): Promise<void> {
  install.disabled = true;
  editFixture.disabled = true;
  loadFixture.disabled = true;
  officialDndFixture.disabled = true;
  longNotificationFixture.disabled = true;
  failInitialLoadOnce.disabled = true;
  failCustomOrderSaveOnce.disabled = true;
  clearDb16Failures.disabled = true;
  open.disabled = true;
  restore.disabled = true;
  setStatus("処理中…");
  try {
    await operation();
  } catch (error) {
    console.error("DB-15 fixture operation failed", error);
    setStatus(error instanceof Error ? `失敗: ${error.message}` : "失敗: 不明なエラー");
  } finally {
    install.disabled = false;
    editFixture.disabled = false;
    loadFixture.disabled = false;
    officialDndFixture.disabled = false;
    longNotificationFixture.disabled = false;
    failInitialLoadOnce.disabled = false;
    failCustomOrderSaveOnce.disabled = false;
    clearDb16Failures.disabled = false;
    open.disabled = false;
    restore.disabled = false;
  }
}

/** 初回退避を保持したfixtureセッションだけで文書切替を許可する。 */
async function requireInstalledFixture(): Promise<void> {
  const result = await browser.storage.local.get(BACKUP_KEY);
  if (parseBackup(result[BACKUP_KEY]) === null) {
    throw new Error("先に高負荷fixtureを投入してください。");
  }
}

/** 指定したfixtureのドッキング3文書を1回のstorage要求で反映する。 */
async function saveFixtureDocuments(documents: ReturnType<typeof createDb15DockingFixture>): Promise<void> {
  await browser.storage.local.set({
    [DOCKING_STORAGE_KEYS.bayConfigurations]: documents.bayConfigurations,
    [DOCKING_STORAGE_KEYS.mainLayouts]: documents.mainLayouts,
    [DOCKING_STORAGE_KEYS.dockingMetadata]: documents.dockingMetadata,
  });
}

interface FixtureBackup {
  stored: Record<string, unknown>;
  fixtureRootId?: string;
}

/** storageから読み出した退避値を最小契約で検証する。 */
function parseBackup(value: unknown): FixtureBackup | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.stored !== "object" || record.stored === null || Array.isArray(record.stored)) {
    return null;
  }
  if (record.fixtureRootId !== undefined && typeof record.fixtureRootId !== "string") return null;
  return {
    stored: structuredClone(record.stored as Record<string, unknown>),
    ...(typeof record.fixtureRootId === "string" ? { fixtureRootId: record.fixtureRootId } : {}),
  };
}

/** 操作ボタンを必須DOMとして取得する。 */
function requireButton(id: string): HTMLButtonElement {
  const element = document.querySelector(`#${id}`);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`missing button: ${id}`);
  return element;
}

/** 状態表示を必須DOMとして取得する。 */
function requireStatus(): HTMLElement {
  const element = document.querySelector("#status");
  if (!(element instanceof HTMLElement)) throw new Error("missing status");
  return element;
}

/** 利用者向けの進捗文面だけを更新する。 */
function setStatus(message: string): void {
  status.textContent = message;
}
