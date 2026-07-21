interface SortDirectionConnection {
  disconnect(): void;
}

/** 並び方向ボタンの押下を通知し、解除可能な接続を返す。 */
export function bindPanelSortDirectionInput(
  button: Pick<HTMLButtonElement, "addEventListener" | "removeEventListener">,
  deliver: () => void,
): SortDirectionConnection {
  const onClick = (): void => deliver();
  button.addEventListener("click", onClick);
  return {
    disconnect(): void {
      button.removeEventListener("click", onClick);
    },
  };
}
