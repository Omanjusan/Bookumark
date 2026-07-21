export type CustomOrderPlacement = "before" | "after";

/** GUIDを対象項目の直前または直後へ移し、入力を変更せず新しい順序を返す。 */
export function moveGuidInCustomOrder(
  order: readonly string[],
  fromGuid: string,
  toGuid: string,
  placement: CustomOrderPlacement,
): string[] {
  const next = [...order];
  if (fromGuid === toGuid) return next;

  const fromIndex = next.indexOf(fromGuid);
  const originalTargetIndex = next.indexOf(toGuid);
  if (fromIndex === -1 || originalTargetIndex === -1) return next;

  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.indexOf(toGuid);
  const insertionIndex = placement === "before" ? targetIndex : targetIndex + 1;
  next.splice(insertionIndex, 0, moved);
  return next;
}
