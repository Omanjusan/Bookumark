import { PANEL_FLAVOR_IDS } from "./panel-flavor.js";
import type { PanelFlavorId } from "./panel-flavor.js";

interface PanelFlavorPickerElements {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly choices: HTMLElement;
  readonly close: HTMLButtonElement;
}

interface PanelFlavorPickerDependencies {
  readonly document?: Document;
  readonly onSelect: (guid: string, flavor: PanelFlavorId | null) => Promise<void>;
}

export interface PanelFlavorPicker {
  open(
    guid: string,
    title: string,
    anchor: Pick<HTMLElement, "getBoundingClientRect">,
    selected: PanelFlavorId | null,
  ): void;
  close(): void;
}

/** 単一の配色ピッカーを、対象GUIDと現在の個別指定へ接続する。 */
export function bindPanelFlavorPicker(
  elements: PanelFlavorPickerElements,
  dependencies: PanelFlavorPickerDependencies,
): PanelFlavorPicker {
  const documentRef = dependencies.document ?? document;
  let activeGuid: string | null = null;
  let pending = false;

  elements.close.addEventListener("click", close);
  elements.choices.addEventListener("click", async (event) => {
    if (pending || activeGuid === null) return;
    const target = (event.target as { closest?: (selector: string) => Element | null } | null)
      ?.closest?.("[data-flavor-choice]") as HTMLElement | null | undefined;
    const choice = target?.dataset.flavorChoice;
    if (choice === undefined) return;
    const flavor = choice === "auto" ? null : flavorIdOf(choice);
    if (choice !== "auto" && flavor === null) return;

    pending = true;
    setChoicesDisabled(true);
    try {
      await dependencies.onSelect(activeGuid, flavor);
      dismiss();
    } catch {
      // PF-4で保存失敗通知と明示再試行を接続する。現在は選択面を維持する。
    } finally {
      pending = false;
      setChoicesDisabled(false);
    }
  });

  return { open, close };

  function open(
    guid: string,
    title: string,
    anchor: Pick<HTMLElement, "getBoundingClientRect">,
    selected: PanelFlavorId | null,
  ): void {
    activeGuid = guid;
    elements.title.textContent = `${title}の配色`;
    renderChoices(selected);
    const rect = anchor.getBoundingClientRect();
    elements.root.style.left = `${Math.max(8, rect.left)}px`;
    elements.root.style.top = `${Math.max(8, rect.bottom + 6)}px`;
    elements.root.hidden = false;
    (elements.choices.children[0] as HTMLElement | undefined)?.focus();
  }

  function close(): void {
    if (pending) return;
    dismiss();
  }

  function dismiss(): void {
    activeGuid = null;
    elements.root.hidden = true;
  }

  function renderChoices(selected: PanelFlavorId | null): void {
    elements.choices.textContent = "";
    appendChoice("auto", "自動", selected === null);
    for (const flavor of PANEL_FLAVOR_IDS) {
      appendChoice(flavor, flavor, selected === flavor);
    }
  }

  function appendChoice(value: "auto" | PanelFlavorId, label: string, checked: boolean): void {
    const button = documentRef.createElement("button");
    button.type = "button";
    button.className = "panel-flavor-choice";
    button.dataset.flavorChoice = value;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(checked));
    button.setAttribute("aria-label", value === "auto" ? "自動配色" : `${label}に設定`);
    button.title = value === "auto" ? "自動配色" : label;
    button.textContent = value === "auto" ? "自動" : "";
    elements.choices.appendChild(button);
  }

  function setChoicesDisabled(disabled: boolean): void {
    for (const child of elements.choices.children) {
      (child as HTMLButtonElement).disabled = disabled;
    }
    elements.close.disabled = disabled;
  }
}

function flavorIdOf(value: string): PanelFlavorId | null {
  return (PANEL_FLAVOR_IDS as readonly string[]).includes(value)
    ? value as PanelFlavorId
    : null;
}
