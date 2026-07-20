/* 開発用: インストール(web-ext run の一時読み込み含む)時にパネルをタブで開く */
browser.runtime.onInstalled.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL("panel/panel.html") });
});
