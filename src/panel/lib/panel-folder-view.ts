import type { BookmarkTreeFolderItem } from "./bookmarks.js";

/** 現在フォルダ直下のフォルダを固定サイズのボタンとして描画する。 */
export function renderPanelFolders(
  root: HTMLElement,
  folders: readonly BookmarkTreeFolderItem[],
): void {
  root.textContent = "";
  root.hidden = folders.length === 0;

  for (const folder of folders) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-button";
    button.dataset.folderGuid = folder.guid;
    button.title = folder.title;

    const icon = document.createElement("span");
    icon.className = "folder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "📁";
    button.appendChild(icon);

    const title = document.createElement("span");
    title.className = "folder-title";
    title.textContent = folder.title;
    button.appendChild(title);

    root.appendChild(button);
  }
}
