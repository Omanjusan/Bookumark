interface TabCreateDetails {
  readonly url: string;
  readonly active: true;
}

interface PanelTileOpenOptions {
  readonly createTab: (details: TabCreateDetails) => Promise<unknown>;
  readonly reportError: (error: unknown) => void;
}

interface PanelTileOpenConnection {
  disconnect(): void;
}

/** タイルの左クリックを新しいアクティブタブでの遷移へ接続する。 */
export function bindPanelTileOpen(
  root: Pick<HTMLElement, "addEventListener" | "removeEventListener">,
  options: PanelTileOpenOptions,
): PanelTileOpenConnection {
  const onClick = (event: Event): void => {
    const target = event.target as { closest?: (selector: string) => Element | null } | null;
    const tile = target?.closest?.(".panel-tile") as HTMLElement | null | undefined;
    const url = tile?.dataset.url;
    if (!url) return;

    try {
      void options.createTab({ url, active: true }).catch(options.reportError);
    } catch (error) {
      options.reportError(error);
    }
  };
  root.addEventListener("click", onClick);
  return {
    disconnect(): void {
      root.removeEventListener("click", onClick);
    },
  };
}
