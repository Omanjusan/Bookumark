/* タイトル式リストのDOM生成。データには触らず描画のみ */

import type { BookmarkItem } from "./bookmarks.js";

/**
 * URLから表示用のホスト名を取得する。
 *
 * @param url 解析するURL
 * @returns URLのホスト名。解析できない場合は空文字列
 */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * 文字列からグリフバッジ用の色相を決定する。
 * 同じ文字列には常に同じ0〜359の値を返す。
 *
 * @param text 色相の算出元となる文字列
 * @returns HSLで使用する色相
 */
function hueOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * ブックマーク1件を表すリスト行を生成する。
 *
 * @param item 描画するブックマーク
 * @returns 操作用のデータ属性を持つリスト行
 */
function rowOf(item: BookmarkItem): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "row";
  row.dataset.guid = item.guid;
  row.dataset.url = item.url;
  row.tabIndex = 0;
  row.setAttribute("role", "link");
  row.title = item.url;
  row.draggable = true;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.style.setProperty("--h", String(hueOf(hostnameOf(item.url))));
  badge.textContent = (item.title || "?").trim().charAt(0).toUpperCase() || "?";
  row.appendChild(badge);

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = item.title;
  row.appendChild(title);

  const domain = document.createElement("span");
  domain.className = "domain";
  domain.textContent = hostnameOf(item.url);
  row.appendChild(domain);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete-btn";
  del.setAttribute("aria-label", "削除: " + item.title);
  del.textContent = "×";
  row.appendChild(del);

  return row;
}

/**
 * ブックマーク一覧を指定要素へ描画する。
 * 既存の子要素は破棄し、項目が空の場合は空状態を表示する。
 *
 * @param root 描画先のルート要素
 * @param items 表示順に並べたブックマーク
 */
export function renderList(root: HTMLElement, items: BookmarkItem[]): void {
  root.textContent = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "ブックマークがありません";
    root.appendChild(empty);
    return;
  }
  const list = document.createElement("ul");
  list.className = "list";
  for (const item of items) list.appendChild(rowOf(item));
  root.appendChild(list);
}

/**
 * 読み込みエラーを指定要素へ表示する。
 *
 * @param root 描画先のルート要素
 * @param err 表示対象のエラー値
 */
export function renderError(root: HTMLElement, err: unknown): void {
  root.textContent = "";
  const msg = document.createElement("p");
  msg.className = "status error";
  const message = err instanceof Error ? err.message : String(err);
  msg.textContent = "読み込みに失敗しました: " + message;
  root.appendChild(msg);
}
