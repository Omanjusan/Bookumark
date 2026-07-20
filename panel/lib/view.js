/* タイトル式リストのDOM生成。データには触らず描画のみ */

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/* ホスト名からグリフバッジ用の色相(0-359)を決める。favicon導入までの代替 */
function hueOf(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 360;
  }
  return h;
}

function rowOf(item) {
  const row = document.createElement("li");
  row.className = "row";
  row.dataset.guid = item.guid;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.style.setProperty("--h", hueOf(hostnameOf(item.url)));
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

  return row;
}

export function renderList(root, items) {
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

export function renderError(root, err) {
  root.textContent = "";
  const msg = document.createElement("p");
  msg.className = "status error";
  msg.textContent = "読み込みに失敗しました: " + (err && err.message ? err.message : String(err));
  root.appendChild(msg);
}
