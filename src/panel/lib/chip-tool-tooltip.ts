interface ChipToolTooltipTimers {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(handle: number): void;
}

interface ChipToolTooltipConnection {
  disconnect(): void;
}

type ChipToolTooltipRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

const TOOL_SELECTOR = ".chip-tool-button";
const TOOLTIP_DELAY_MS = 150;

/** 文字チップツールのhover・focusへ150ms遅延ツールチップを接続する。 */
export function bindChipToolTooltip(
  root: ChipToolTooltipRoot,
  tooltip: HTMLElement,
  title: HTMLElement,
  description: HTMLElement,
  timers: ChipToolTooltipTimers = globalThis,
): ChipToolTooltipConnection {
  let pendingHandle: number | null = null;
  let pendingTool: HTMLElement | null = null;
  let activeTool: HTMLElement | null = null;

  const hide = (): void => {
    if (pendingHandle !== null) timers.clearTimeout(pendingHandle);
    pendingHandle = null;
    pendingTool = null;
    activeTool?.removeAttribute("aria-describedby");
    activeTool = null;
    tooltip.hidden = true;
  };

  const schedule = (tool: HTMLElement): void => {
    if (tool === activeTool || tool === pendingTool) return;
    hide();
    pendingTool = tool;
    pendingHandle = timers.setTimeout(() => {
      pendingHandle = null;
      pendingTool = null;
      activeTool = tool;
      title.textContent = tool.textContent?.trim() ?? "";
      description.textContent = tool.dataset.description ?? "";
      tooltip.style.top = `${tool.offsetTop}px`;
      tool.setAttribute("aria-describedby", tooltip.id);
      tooltip.hidden = false;
    }, TOOLTIP_DELAY_MS);
  };

  const onActivate = (event: Event): void => {
    const tool = toolOf(event.target);
    if (tool !== null) schedule(tool);
  };
  const onDeactivate = (event: Event): void => {
    const tool = toolOf(event.target);
    if (tool === null) return;
    const relatedTarget = (event as MouseEvent | FocusEvent).relatedTarget;
    if (relatedTarget !== null && tool.contains(relatedTarget as Node)) return;
    if (tool === activeTool || tool === pendingTool) hide();
  };
  const onDragStart = (): void => hide();

  root.addEventListener("mouseover", onActivate);
  root.addEventListener("focusin", onActivate);
  root.addEventListener("mouseout", onDeactivate);
  root.addEventListener("focusout", onDeactivate);
  root.addEventListener("dragstart", onDragStart);

  return {
    disconnect(): void {
      root.removeEventListener("mouseover", onActivate);
      root.removeEventListener("focusin", onActivate);
      root.removeEventListener("mouseout", onDeactivate);
      root.removeEventListener("focusout", onDeactivate);
      root.removeEventListener("dragstart", onDragStart);
      hide();
    },
  };
}

/** イベント発生要素が属する文字チップツールを返す。 */
function toolOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, TOOL_SELECTOR) as HTMLElement | null | undefined ?? null;
}
