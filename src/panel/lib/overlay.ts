/* オーバーレイ層(storage.local)。現状は並び順(GUID配列)のみを保持する */

const KEY = "order";

/**
 * ローカルストレージから保存済みの表示順を読み込む。
 *
 * @returns 保存済みのGUID配列。未保存または不正な値の場合は空配列
 */
export async function loadOrder(): Promise<string[]> {
  const { order } = await browser.storage.local.get(KEY);
  return Array.isArray(order) ? (order as string[]) : [];
}

/**
 * 表示順をローカルストレージへ全量保存する。
 *
 * @param order 表示順に並べたブックマークGUID
 * @throws FirefoxのストレージAPIが保存に失敗した場合
 */
export async function saveOrder(order: string[]): Promise<void> {
  await browser.storage.local.set({ [KEY]: order });
}

export interface ReconcileResult {
  order: string[];
  changed: boolean;
}

/**
 * 保存済みの並び順を現在のブックマークGUID集合と突き合わせる。
 * 存在しないGUID(外部で削除された孤児)は即座に落とす。
 * 並び順に無い新規GUIDは末尾に追加する。
 *
 * @param order 保存済みのGUID順
 * @param currentGuids 現在Firefoxに存在するブックマークGUID
 * @returns 整合済みの順序と、保存内容から変化したかを示す結果
 */
export function reconcile(order: string[], currentGuids: string[]): ReconcileResult {
  const currentSet = new Set(currentGuids);
  const kept = order.filter((guid) => currentSet.has(guid));
  const keptSet = new Set(kept);
  const appended = currentGuids.filter((guid) => !keptSet.has(guid));
  const next = kept.concat(appended);
  const changed = next.length !== order.length || next.some((g, i) => g !== order[i]);
  return { order: next, changed };
}
