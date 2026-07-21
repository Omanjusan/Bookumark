interface SearchInputConnection {
  disconnect(): void;
}

/** 検索欄の入力値を遅延なく通知し、解除可能な接続を返す。 */
export function bindPanelSearchInput(
  input: Pick<HTMLInputElement, "value" | "addEventListener" | "removeEventListener">,
  deliver: (query: string) => void,
): SearchInputConnection {
  const onInput = (): void => deliver(input.value);
  input.addEventListener("input", onInput);
  return {
    disconnect(): void {
      input.removeEventListener("input", onInput);
    },
  };
}
