interface PanelDragClickGuard {
  markDragStarted(): void;
  consumeClick(): boolean;
}

/** dragstart後に発生する次のclickだけを消費する状態を作る。 */
export function createPanelDragClickGuard(): PanelDragClickGuard {
  let suppressNextClick = false;
  return {
    markDragStarted(): void {
      suppressNextClick = true;
    },
    consumeClick(): boolean {
      const suppressed = suppressNextClick;
      suppressNextClick = false;
      return suppressed;
    },
  };
}
