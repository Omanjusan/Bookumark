/* オーバーレイ層(storage.local)。現状は並び順(GUID配列)のみを保持する */

const KEY = "order";

export async function loadOrder() {
  const { order } = await browser.storage.local.get(KEY);
  return Array.isArray(order) ? order : [];
}

export async function saveOrder(order) {
  await browser.storage.local.set({ [KEY]: order });
}

/**
 * 保存済みの並び順を現在のブックマークGUID集合と突き合わせる。
 * 存在しないGUID(外部で削除された孤児)は即座に落とす。
 * 並び順に無い新規GUIDは末尾に追加する。
 */
export function reconcile(order, currentGuids) {
  const currentSet = new Set(currentGuids);
  const kept = order.filter((guid) => currentSet.has(guid));
  const keptSet = new Set(kept);
  const appended = currentGuids.filter((guid) => !keptSet.has(guid));
  const next = kept.concat(appended);
  const changed = next.length !== order.length || next.some((g, i) => g !== order[i]);
  return { order: next, changed };
}
