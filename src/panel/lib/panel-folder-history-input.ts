export type FolderHistoryDirection = "back" | "forward";

interface ButtonLike {
  disabled: boolean;
  addEventListener(type: "click", listener: () => void): void;
  removeEventListener(type: "click", listener: () => void): void;
}

interface FolderHistoryButtons {
  readonly backward: ButtonLike;
  readonly forward: ButtonLike;
}

interface FolderHistoryButtonState {
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly pending: boolean;
}

export interface PanelFolderHistoryInputConnection {
  render(state: FolderHistoryButtonState): void;
  disconnect(): void;
}

export function bindPanelFolderHistoryInput(
  buttons: FolderHistoryButtons,
  activate: (direction: FolderHistoryDirection) => void,
): PanelFolderHistoryInputConnection {
  const goBack = () => activate("back");
  const goForward = () => activate("forward");
  buttons.backward.addEventListener("click", goBack);
  buttons.forward.addEventListener("click", goForward);

  return {
    render(state) {
      buttons.backward.disabled = state.pending || !state.canGoBack;
      buttons.forward.disabled = state.pending || !state.canGoForward;
    },
    disconnect() {
      buttons.backward.removeEventListener("click", goBack);
      buttons.forward.removeEventListener("click", goForward);
    },
  };
}
