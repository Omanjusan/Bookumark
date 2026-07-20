import { getFlatBookmarks } from "./lib/bookmarks.js";
import { renderList, renderError } from "./lib/view.js";

const root = document.getElementById("app");
const countEl = document.getElementById("count");

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

async function main() {
  try {
    const items = await getFlatBookmarks();
    countEl.textContent = items.length + "件";
    renderList(root, items);
  } catch (err) {
    renderError(root, err);
  }
}

main();
