import { getFlatBookmarks, removeBookmark } from "./lib/bookmarks.js";
import type { BookmarkItem } from "./lib/bookmarks.js";
import { renderList, renderError } from "./lib/view.js";
import { loadOrder, saveOrder, reconcile } from "./lib/overlay.js";

const root = document.getElementById("app") as HTMLElement;
const countEl = document.getElementById("count") as HTMLElement;

/** 現在表示中の並び順(GUID順)。D&D並べ替えの操作対象。 */
let currentItems: BookmarkItem[] = [];

/**
 * 行に設定されたURLを新しいタブで開く。
 *
 * @param row 操作対象の行。URLを持たない場合は何もしない
 */
function openRow(row: HTMLElement | null): void {
  const url = row?.dataset.url;
  if (url) browser.tabs.create({ url });
}

/**
 * Firefoxの公式DBからブックマークを削除し、成功時だけ表示順へ反映する。
 * 並び順の保存失敗はコンソールへ記録し、公式DBの削除結果を優先する。
 *
 * @param guid 削除するブックマークのGUID
 */
async function deleteRow(guid: string): Promise<void> {
  try {
    await removeBookmark(guid);
  } catch (err) {
    console.warn("bookmarks.remove failed:", err);
    return;
  }
  currentItems = currentItems.filter((it) => it.guid !== guid);
  renderList(root, currentItems);
  countEl.textContent = currentItems.length + "件";
  try {
    await saveOrder(currentItems.map((it) => it.guid));
  } catch (err) {
    console.warn("order save failed after bookmark removal:", err);
  }
}

root.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const delBtn = target.closest(".delete-btn");
  if (delBtn) {
    const row = delBtn.closest(".row") as HTMLElement | null;
    if (row?.dataset.guid) deleteRow(row.dataset.guid);
    return;
  }
  openRow(target.closest(".row"));
});

root.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const target = e.target as HTMLElement;
  if (target.closest(".delete-btn")) return; // ボタン自身のEnter/Space活性化に任せる
  const row = target.closest(".row") as HTMLElement | null;
  if (!row) return;
  e.preventDefault();
  openRow(row);
});

/* ---- D&D 並べ替え ---- */
let draggedGuid: string | null = null;

/**
 * 全行からドラッグ挿入位置を示す装飾を取り除く。
 */
function clearDragOverMarks(): void {
  for (const r of root.querySelectorAll(".row")) {
    r.classList.remove("drag-over-top", "drag-over-bottom");
  }
}

root.addEventListener("dragstart", (e) => {
  const row = (e.target as HTMLElement).closest(".row") as HTMLElement | null;
  if (!row) return;
  draggedGuid = row.dataset.guid ?? null;
  row.classList.add("dragging");
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", draggedGuid ?? "");
    } catch {
      /* noop */
    }
  }
});

root.addEventListener("dragend", (e) => {
  const row = (e.target as HTMLElement).closest(".row") as HTMLElement | null;
  if (row) row.classList.remove("dragging");
  clearDragOverMarks();
  draggedGuid = null;
});

root.addEventListener("dragover", (e) => {
  if (!draggedGuid) return;
  const row = (e.target as HTMLElement).closest(".row") as HTMLElement | null;
  if (!row || row.dataset.guid === draggedGuid) return;
  e.preventDefault();
  const rect = row.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  row.classList.toggle("drag-over-top", before);
  row.classList.toggle("drag-over-bottom", !before);
});

root.addEventListener("drop", (e) => {
  if (!draggedGuid) return;
  const row = (e.target as HTMLElement).closest(".row") as HTMLElement | null;
  clearDragOverMarks();
  if (!row || row.dataset.guid === draggedGuid || !row.dataset.guid) return;
  e.preventDefault();
  const rect = row.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  reorderAndPersist(draggedGuid, row.dataset.guid, before);
});

/**
 * 指定項目を移動して一覧を再描画し、新しい表示順を保存する。
 *
 * @param fromGuid 移動するブックマークのGUID
 * @param toGuid 挿入位置の基準となるブックマークのGUID
 * @param before 基準項目の前へ挿入する場合はtrue、後ろの場合はfalse
 */
function reorderAndPersist(fromGuid: string, toGuid: string, before: boolean): void {
  const fromIdx = currentItems.findIndex((it) => it.guid === fromGuid);
  if (fromIdx === -1) return;
  const [moved] = currentItems.splice(fromIdx, 1);
  let toIdx = currentItems.findIndex((it) => it.guid === toGuid);
  if (toIdx === -1) toIdx = currentItems.length;
  if (!before) toIdx += 1;
  currentItems.splice(toIdx, 0, moved);
  renderList(root, currentItems);
  saveOrder(currentItems.map((it) => it.guid));
}

/**
 * ブックマークと保存済み表示順を読み込み、初期画面を描画する。
 * 読み込みまたは整合処理に失敗した場合はエラー状態を表示する。
 */
async function main(): Promise<void> {
  try {
    const items = await getFlatBookmarks();
    const savedOrder = await loadOrder();
    const { order, changed } = reconcile(savedOrder, items.map((it) => it.guid));
    if (changed) await saveOrder(order);

    const byGuid = new Map(items.map((it) => [it.guid, it]));
    currentItems = order
      .map((guid) => byGuid.get(guid))
      .filter((it): it is BookmarkItem => Boolean(it));

    countEl.textContent = currentItems.length + "件";
    renderList(root, currentItems);
  } catch (err) {
    renderError(root, err);
  }
}

main();
