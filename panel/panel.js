import { getFlatBookmarks } from "./lib/bookmarks.js";
import { renderList, renderError } from "./lib/view.js";
import { loadOrder, saveOrder, reconcile } from "./lib/overlay.js";

const root = document.getElementById("app");
const countEl = document.getElementById("count");

/** 現在表示中の並び順(GUID順)。D&D並べ替えの操作対象。 */
let currentItems = [];

function openRow(row) {
  const url = row && row.dataset.url;
  if (url) browser.tabs.create({ url });
}

root.addEventListener("click", (e) => {
  openRow(e.target.closest(".row"));
});
root.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const row = e.target.closest(".row");
  if (!row) return;
  e.preventDefault();
  openRow(row);
});

/* ---- D&D 並べ替え ---- */
let draggedGuid = null;

function clearDragOverMarks() {
  for (const r of root.querySelectorAll(".row")) {
    r.classList.remove("drag-over-top", "drag-over-bottom");
  }
}

root.addEventListener("dragstart", (e) => {
  const row = e.target.closest(".row");
  if (!row) return;
  draggedGuid = row.dataset.guid;
  row.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  try { e.dataTransfer.setData("text/plain", draggedGuid); } catch { /* noop */ }
});

root.addEventListener("dragend", (e) => {
  const row = e.target.closest(".row");
  if (row) row.classList.remove("dragging");
  clearDragOverMarks();
  draggedGuid = null;
});

root.addEventListener("dragover", (e) => {
  if (!draggedGuid) return;
  const row = e.target.closest(".row");
  if (!row || row.dataset.guid === draggedGuid) return;
  e.preventDefault();
  const rect = row.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  row.classList.toggle("drag-over-top", before);
  row.classList.toggle("drag-over-bottom", !before);
});

root.addEventListener("drop", (e) => {
  if (!draggedGuid) return;
  const row = e.target.closest(".row");
  clearDragOverMarks();
  if (!row || row.dataset.guid === draggedGuid) return;
  e.preventDefault();
  const rect = row.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  reorderAndPersist(draggedGuid, row.dataset.guid, before);
});

function reorderAndPersist(fromGuid, toGuid, before) {
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

async function main() {
  try {
    const items = await getFlatBookmarks();
    const savedOrder = await loadOrder();
    const { order, changed } = reconcile(savedOrder, items.map((it) => it.guid));
    if (changed) await saveOrder(order);

    const byGuid = new Map(items.map((it) => [it.guid, it]));
    currentItems = order.map((guid) => byGuid.get(guid)).filter(Boolean);

    countEl.textContent = currentItems.length + "件";
    renderList(root, currentItems);
  } catch (err) {
    renderError(root, err);
  }
}

main();
