type SaveCustomOrder = (order: string[]) => Promise<unknown>;

/** 現在のGUID順を全量保存し、保存失敗を外へrejectせず報告する。 */
export async function persistCustomOrder(
  items: readonly { readonly guid: string }[],
  saveOrder: SaveCustomOrder,
  reportError: (error: unknown) => void,
): Promise<void> {
  try {
    await saveOrder(items.map(({ guid }) => guid));
  } catch (error) {
    reportError(error);
  }
}
