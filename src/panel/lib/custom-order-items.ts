import { moveGuidInCustomOrder } from "./custom-order-move.js";
import type { CustomOrderPlacement } from "./custom-order-move.js";

interface TileDrop {
  readonly fromGuid: string;
  readonly toGuid: string;
  readonly placement: CustomOrderPlacement;
}

/** drop後のGUID順へ項目を並べ替え、元の項目オブジェクトを保持する。 */
export function reorderItemsForTileDrop<T extends { readonly guid: string }>(
  items: readonly T[],
  drop: TileDrop,
): T[] {
  const order = moveGuidInCustomOrder(
    items.map(({ guid }) => guid),
    drop.fromGuid,
    drop.toGuid,
    drop.placement,
  );
  const byGuid = new Map(items.map((item) => [item.guid, item]));
  return order.map((guid) => {
    const item = byGuid.get(guid);
    if (item === undefined) throw new Error(`missing custom-order item for ${guid}`);
    return item;
  });
}
