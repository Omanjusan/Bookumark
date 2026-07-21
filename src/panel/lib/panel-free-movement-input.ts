interface FreeMovementConnection {
  disconnect(): void;
}

/** 自由移動チェックボックスの状態を通知し、解除可能な接続を返す。 */
export function bindFreeMovementInput(
  input: Pick<HTMLInputElement, "checked" | "addEventListener" | "removeEventListener">,
  deliver: (enabled: boolean) => void,
): FreeMovementConnection {
  const onChange = (): void => deliver(input.checked);
  input.addEventListener("change", onChange);
  return {
    disconnect(): void {
      input.removeEventListener("change", onChange);
    },
  };
}
