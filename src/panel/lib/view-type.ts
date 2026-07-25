export type ViewType = "panel" | "icon" | "card" | "list";

export const VIEW_TYPES: readonly ViewType[] = ["panel", "icon", "card", "list"];

export function isViewType(value: unknown): value is ViewType {
  return VIEW_TYPES.some((candidate) => candidate === value);
}
