import type { DockingDocuments } from "./docking-persistence-model.js";

export interface LayoutEditModeElements {
  readonly root: HTMLElement;
  readonly entry: HTMLButtonElement;
  readonly unavailableReason: HTMLElement;
  readonly editBar: HTMLElement;
  readonly layoutName: HTMLElement;
  readonly exit: HTMLButtonElement;
  readonly guardedControls: readonly (HTMLButtonElement | HTMLInputElement | HTMLSelectElement)[];
  readonly guardedRegions: readonly HTMLElement[];
}

export interface LayoutEditModeController {
  readonly editing: boolean;
  setReady(): void;
  replaceDocuments(documents: DockingDocuments): void;
  commitDocuments(documents: DockingDocuments): void;
}

interface LayoutEditModeOptions {
  readonly initiallyReady?: boolean;
  readonly onEnter?: (documents: DockingDocuments) => void;
  readonly onExit?: (documents: DockingDocuments) => void;
}

/** activeレイアウトの編集可否と、編集中に停止する通常操作のライフサイクルを管理する。 */
export function bindLayoutEditMode(
  elements: LayoutEditModeElements,
  initialDocuments: DockingDocuments,
  options: LayoutEditModeOptions = {},
): LayoutEditModeController {
  let documents = structuredClone(initialDocuments);
  let editing = false;
  let ready = options.initiallyReady ?? true;
  let controlStates: boolean[] = [];
  let regionStates: boolean[] = [];

  /** 保存済みactiveレイアウトに合わせて入口の可否と説明を更新する。 */
  const renderAvailability = (): void => {
    const active = resolveActiveLayout(documents);
    elements.entry.disabled = !ready || active.systemDefault;
    elements.unavailableReason.hidden = !active.systemDefault;
    elements.unavailableReason.textContent = active.systemDefault
      ? "内部デフォルトは編集できません。名前付きレイアウトへ切り替えてください。"
      : "";
  };

  /** 通常操作の元の状態を保存し、編集専用表示へ切り替える。 */
  const enter = (): void => {
    if (editing) return;
    const active = resolveActiveLayout(documents);
    if (!ready || active.systemDefault) return;
    editing = true;
    controlStates = elements.guardedControls.map((control) => control.disabled);
    regionStates = elements.guardedRegions.map((region) => region.inert);
    for (const control of elements.guardedControls) control.disabled = true;
    for (const region of elements.guardedRegions) region.inert = true;
    elements.root.dataset.layoutEditing = "true";
    elements.layoutName.textContent = active.name;
    elements.entry.hidden = true;
    elements.unavailableReason.hidden = true;
    elements.editBar.hidden = false;
    options.onEnter?.(structuredClone(documents));
  };

  /** 通常操作の元の状態を復元し、保存済みレイアウトの再描画を要求する。 */
  const exit = (): void => {
    if (!editing) return;
    elements.guardedControls.forEach((control, index) => {
      control.disabled = controlStates[index] ?? false;
    });
    elements.guardedRegions.forEach((region, index) => {
      region.inert = regionStates[index] ?? false;
    });
    editing = false;
    controlStates = [];
    regionStates = [];
    delete elements.root.dataset.layoutEditing;
    elements.entry.hidden = false;
    elements.editBar.hidden = true;
    renderAvailability();
    options.onExit?.(structuredClone(documents));
  };

  elements.entry.addEventListener("click", enter);
  elements.exit.addEventListener("click", exit);
  renderAvailability();

  return {
    get editing(): boolean {
      return editing;
    },
    setReady(): void {
      ready = true;
      renderAvailability();
    },
    replaceDocuments(nextDocuments): void {
      if (editing) throw new Error("layout documents cannot change while editing");
      documents = structuredClone(nextDocuments);
      renderAvailability();
    },
    commitDocuments(nextDocuments): void {
      if (!editing) throw new Error("layout documents can only be committed while editing");
      const currentActiveId = documents.dockingMetadata.activeLayoutId;
      if (nextDocuments.dockingMetadata.activeLayoutId !== currentActiveId) {
        throw new Error("active layout cannot change while editing");
      }
      documents = structuredClone(nextDocuments);
    },
  };
}

/** 文書からactiveレイアウトを解決し、不整合な入力を入口表示前に拒否する。 */
function resolveActiveLayout(documents: DockingDocuments) {
  const activeId = documents.dockingMetadata.activeLayoutId;
  const active = documents.mainLayouts.layouts.find(({ id }) => id === activeId);
  if (active === undefined) throw new Error(`active layout was not found: ${activeId}`);
  return active;
}
