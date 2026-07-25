import type { VisitStatusFilterValue } from "./visit-status-filter.js";

interface VisitStatusFilterConnection {
  setValue(value: VisitStatusFilterValue): void;
  disconnect(): void;
}

const VISIT_STATUS_VALUES: readonly VisitStatusFilterValue[] = [
  "all",
  "visited",
  "unvisited",
];

/** 訪問状態の排他的な3択を通知し、共有状態から再描画できる接続を返す。 */
export function bindVisitStatusFilterInput(
  root: Pick<HTMLElement, "querySelectorAll" | "addEventListener" | "removeEventListener">,
  deliver: (value: VisitStatusFilterValue) => void,
): VisitStatusFilterConnection {
  const inputs = (): readonly HTMLInputElement[] => Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name="visit-status"]'),
  );
  const onChange = (event: Event): void => {
    const input = event.target as Partial<HTMLInputElement> | null;
    if (input?.checked === true && isVisitStatusValue(input.value)) {
      deliver(input.value);
    }
  };
  root.addEventListener("change", onChange);
  return {
    setValue(value): void {
      for (const input of inputs()) input.checked = input.value === value;
    },
    disconnect(): void {
      root.removeEventListener("change", onChange);
    },
  };
}

function isVisitStatusValue(value: unknown): value is VisitStatusFilterValue {
  return VISIT_STATUS_VALUES.some((candidate) => candidate === value);
}
