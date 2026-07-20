import { getFlatBookmarks } from "./lib/bookmarks.js";
import { renderList, renderError } from "./lib/view.js";

const root = document.getElementById("app");
const countEl = document.getElementById("count");

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
