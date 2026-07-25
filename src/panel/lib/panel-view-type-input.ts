import { isViewType } from "./view-type.js";
import type { ViewType } from "./view-type.js";

interface ViewTypeConnection {
  setValue(value: ViewType): void;
  disconnect(): void;
}

/** 表示形式の排他的な4択を通知し、共有状態から同期できる接続を返す。 */
export function bindViewTypeInput(
  root: Pick<HTMLElement, "querySelectorAll" | "addEventListener" | "removeEventListener">,
  deliver: (value: ViewType) => void,
): ViewTypeConnection {
  const inputs = (): readonly HTMLInputElement[] => Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name="view-type"]'),
  );
  const onChange = (event: Event): void => {
    const input = event.target as Partial<HTMLInputElement> | null;
    if (input?.checked === true && isViewType(input.value)) deliver(input.value);
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
