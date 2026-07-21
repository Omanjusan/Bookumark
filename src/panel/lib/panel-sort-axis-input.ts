import type { StandardSortAxisId } from "./display-state.js";

interface SortAxisConnection {
  disconnect(): void;
}

const STANDARD_AXIS_IDS: readonly StandardSortAxisId[] = [
  "title",
  "dateAdded",
  "visitCount",
  "lastVisitTime",
];

/** 標準ソート軸だけを通知し、契約外の選択値を無視する。 */
export function bindPanelSortAxisInput(
  input: Pick<HTMLSelectElement, "value" | "addEventListener" | "removeEventListener">,
  deliver: (axis: StandardSortAxisId) => void,
): SortAxisConnection {
  const onChange = (): void => {
    if (isStandardAxisId(input.value)) deliver(input.value);
  };
  input.addEventListener("change", onChange);
  return {
    disconnect(): void {
      input.removeEventListener("change", onChange);
    },
  };
}

function isStandardAxisId(value: string): value is StandardSortAxisId {
  return STANDARD_AXIS_IDS.some((axis) => axis === value);
}
