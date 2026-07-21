export interface PanelFolderNavigationConnection {
  disconnect(): void;
}

interface PanelFolderNavigationOptions {
  readonly consumeSuppressedClick?: () => boolean;
}

/** フォルダ領域のクリックを現在フォルダ変更へ変換する。 */
export function bindPanelFolderNavigation(
  root: Pick<HTMLElement, "addEventListener" | "removeEventListener">,
  navigate: (folderGuid: string) => void,
  options: PanelFolderNavigationOptions = {},
): PanelFolderNavigationConnection {
  const onClick = (event: Event): void => {
    if (options.consumeSuppressedClick?.() === true) return;
    const target = event.target as { closest?: (selector: string) => Element | null } | null;
    const button = target?.closest?.(".folder-button") as HTMLElement | null | undefined;
    const folderGuid = button?.dataset.folderGuid;
    if (!folderGuid) return;
    navigate(folderGuid);
  };

  root.addEventListener("click", onClick);
  return {
    disconnect: () => root.removeEventListener("click", onClick),
  };
}
