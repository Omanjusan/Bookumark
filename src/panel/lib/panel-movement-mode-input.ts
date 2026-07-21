import type { MovementMode } from "./display-state.js";

const MOVEMENT_MODES: readonly MovementMode[] = [
  "custom-order",
  "normal",
  "directory-move",
];

interface MovementModeRadio {
  value: string;
  checked: boolean;
}

export interface MovementModeInputConnection {
  setMode(mode: MovementMode): void;
  disconnect(): void;
}

/** 3択radio groupと排他的な移動モード状態を双方向に同期する。 */
export function bindMovementModeInput(
  root: Pick<HTMLElement, "addEventListener" | "removeEventListener" | "querySelectorAll">,
  deliver: (mode: MovementMode) => void,
): MovementModeInputConnection {
  const inputs = (): MovementModeRadio[] => Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name="movement-mode"]'),
  );
  const onChange = (event: Event): void => {
    const target = event.target as MovementModeRadio | null;
    if (target === null || !target.checked || !isMovementMode(target.value)) return;
    deliver(target.value);
  };

  root.addEventListener("change", onChange);
  return {
    setMode(mode): void {
      for (const input of inputs()) input.checked = input.value === mode;
    },
    disconnect(): void {
      root.removeEventListener("change", onChange);
    },
  };
}

function isMovementMode(value: string): value is MovementMode {
  return MOVEMENT_MODES.some((mode) => mode === value);
}
