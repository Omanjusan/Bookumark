import type {
  BasicDockingChipRenderers,
} from "./docking-chip-renderer-registry.js";
import type { DockingChipDrawingPlan } from "./docking-rail-drawing-plan.js";
import type {
  MovementMode,
  SortDirection,
  StandardSortAxisId,
} from "./display-state.js";
import type { ViewType } from "./view-type.js";
import type { VisitStatusFilterValue } from "./visit-status-filter.js";

interface FolderHistorySnapshot {
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly pending: boolean;
}

export interface DockingBasicChipSnapshot {
  readonly query: string;
  readonly visitStatus: VisitStatusFilterValue;
  readonly folderHistory: FolderHistorySnapshot;
  readonly sortAxis: StandardSortAxisId;
  readonly sortDirection: SortDirection;
  readonly sortDisabled: boolean;
  readonly viewType: ViewType;
  readonly movementMode: MovementMode;
}

interface DockingBasicChipRuntimeOptions {
  readonly document?: Pick<Document, "createElement">;
  snapshot(): DockingBasicChipSnapshot;
  onSearch(value: string): void;
  onVisitStatus(value: VisitStatusFilterValue): void;
  onFolderHistory(direction: "back" | "forward"): void;
  onSortAxis(value: StandardSortAxisId): void;
  onSortDirection(): void;
  onViewType(value: ViewType): void;
  onMovementMode(value: MovementMode): void;
}

export interface DockingBasicChipRuntime {
  readonly renderers: BasicDockingChipRenderers;
  sync(): void;
  disconnect(): void;
}

const VISIT_VALUES: readonly VisitStatusFilterValue[] = ["all", "visited", "unvisited"];
const VIEW_TYPES: readonly ViewType[] = ["panel", "icon", "card", "list"];
const MOVEMENT_MODES: readonly MovementMode[] = ["custom-order", "normal"];
const SORT_AXES: readonly StandardSortAxisId[] = [
  "title", "dateAdded", "visitCount", "lastVisitTime",
];
const VIEW_TYPE_LABELS: Readonly<Record<ViewType, string>> = {
  panel: "パネル",
  icon: "アイコン",
  card: "カード",
  list: "一覧",
};

/** 基本6チップの実DOM生成、イベント解除、共有状態同期を1つのruntimeとして作る。 */
export function createDockingBasicChipRuntime(
  options: DockingBasicChipRuntimeOptions,
): DockingBasicChipRuntime {
  const documentRef = options.document ?? document;
  const cleanups: Array<() => void> = [];
  const syncers: Array<(snapshot: DockingBasicChipSnapshot) => void> = [];
  const viewTypeInputs: HTMLInputElement[] = [];
  let favoriteSelected = false;

  /** listenerを登録し、runtime切断時の解除処理を記録する。 */
  const listen = (
    element: HTMLElement,
    type: string,
    listener: EventListener,
  ): void => {
    element.addEventListener(type, listener);
    cleanups.push(() => element.removeEventListener(type, listener));
  };

  /** チップ種別とインスタンスIDを持つ機能ルートを生成する。 */
  const chipRoot = (plan: DockingChipDrawingPlan, className: string): HTMLElement => {
    const root = documentRef.createElement("div");
    root.className = className;
    root.dataset.chipInstanceId = plan.instanceId;
    root.dataset.chipType = plan.chipType;
    return root;
  };

  const renderSearch = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--search");
    const input = documentRef.createElement("input");
    input.type = "search";
    input.className = "dock-search";
    input.setAttribute("aria-label", "ブックマークを検索");
    input.setAttribute("placeholder", "ブックマークを検索");
    input.setAttribute("autocomplete", "off");
    listen(input, "input", () => options.onSearch(input.value));
    syncers.push((snapshot) => { input.value = snapshot.query; });
    root.appendChild(input);
    return root;
  };

  const renderVisitStatus = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--visit-status");
    const fieldset = documentRef.createElement("fieldset");
    fieldset.className = "visit-status-filter";
    appendLegend(fieldset, "訪問状態", documentRef);
    const choices = documentRef.createElement("div");
    choices.className = "visit-status-options";
    const inputs = VISIT_VALUES.map((value, index) => {
      const input = appendRadioChoice(choices, {
        name: `visit-status-${plan.instanceId}`,
        value,
        label: ["すべて", "訪問あり", "未訪問"][index],
        className: "visit-status-option",
      }, documentRef);
      listen(input, "change", () => { if (input.checked) options.onVisitStatus(value); });
      return input;
    });
    syncers.push((snapshot) => {
      for (const input of inputs) input.checked = input.value === snapshot.visitStatus;
    });
    fieldset.appendChild(choices);
    root.appendChild(fieldset);
    return root;
  };

  const renderFolderHistory = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--folder-history folder-navigation");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "フォルダ履歴");
    const backward = appendButton(root, "<", "前のフォルダへ戻る", documentRef);
    const forward = appendButton(root, ">", "次のフォルダへ進む", documentRef);
    listen(backward, "click", () => options.onFolderHistory("back"));
    listen(forward, "click", () => options.onFolderHistory("forward"));
    syncers.push((snapshot) => {
      backward.disabled = snapshot.folderHistory.pending || !snapshot.folderHistory.canGoBack;
      forward.disabled = snapshot.folderHistory.pending || !snapshot.folderHistory.canGoForward;
    });
    return root;
  };

  const renderSort = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--sort");
    const label = documentRef.createElement("label");
    label.textContent = "並び順 ";
    const select = documentRef.createElement("select");
    select.setAttribute("aria-label", "並び順");
    for (const [value, text] of [
      ["title", "タイトル"], ["dateAdded", "追加日時"],
      ["visitCount", "訪問回数"], ["lastVisitTime", "最終訪問日時"],
    ] as const) appendOption(select, value, text, documentRef);
    listen(select, "change", () => {
      if (SORT_AXES.some((value) => value === select.value)) {
        options.onSortAxis(select.value as StandardSortAxisId);
      }
    });
    label.appendChild(select);
    root.appendChild(label);
    const direction = appendButton(root, "降順", "並び方向を切り替え", documentRef);
    listen(direction, "click", () => options.onSortDirection());
    syncers.push((snapshot) => {
      select.value = snapshot.sortAxis;
      select.disabled = snapshot.sortDisabled;
      direction.disabled = snapshot.sortDisabled;
      direction.textContent = snapshot.sortDirection === "asc" ? "昇順" : "降順";
      direction.dataset.direction = snapshot.sortDirection;
    });
    return root;
  };

  const renderViewType = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--view-type");
    const fieldset = documentRef.createElement("fieldset");
    fieldset.className = "view-type";
    appendLegend(fieldset, "表示形式", documentRef);
    const choices = documentRef.createElement("div");
    choices.className = "view-type-options";
    const favorite = appendRadioChoice(choices, {
      name: `view-type-${plan.instanceId}`,
      value: "favorite",
      label: "お気に入り",
      className: "view-type-option view-type-option--favorite",
      glyph: "favorite",
    }, documentRef);
    listen(favorite, "change", () => {
      if (!favorite.checked) return;
      favoriteSelected = true;
      syncViewTypeInputs(options.snapshot());
    });
    const inputs = VIEW_TYPES.map((value) => {
      const input = appendRadioChoice(choices, {
        name: `view-type-${plan.instanceId}`,
        value,
        label: VIEW_TYPE_LABELS[value],
        className: `view-type-option view-type-option--${value}`,
        glyph: value,
      }, documentRef);
      listen(input, "change", () => {
        if (!input.checked) return;
        favoriteSelected = false;
        options.onViewType(value);
      });
      return input;
    });
    viewTypeInputs.push(favorite, ...inputs);
    syncers.push(syncViewTypeInputs);
    fieldset.appendChild(choices);
    root.appendChild(fieldset);
    return root;
  };

  /** 正式モードまたは一時的なお気に入りモックを全表示形式チップへ排他反映する。 */
  const syncViewTypeInputs = (snapshot: DockingBasicChipSnapshot): void => {
    for (const input of viewTypeInputs) {
      input.checked = favoriteSelected
        ? input.value === "favorite"
        : input.value === snapshot.viewType;
    }
  };

  const renderMovementMode = (plan: DockingChipDrawingPlan): Node => {
    const root = chipRoot(plan, "dock-control dock-control--movement-mode");
    const fieldset = documentRef.createElement("fieldset");
    fieldset.className = "movement-mode";
    appendLegend(fieldset, "移動モード", documentRef);
    const choices = documentRef.createElement("div");
    choices.className = "movement-mode-options";
    const inputs = MOVEMENT_MODES.map((value, index) => {
      const input = appendRadioChoice(choices, {
        name: `movement-mode-${plan.instanceId}`,
        value,
        label: ["カスタム配置", "通常"][index],
        className: `movement-option movement-option--${["custom", "normal"][index]}`,
      }, documentRef);
      listen(input, "change", () => { if (input.checked) options.onMovementMode(value); });
      return input;
    });
    syncers.push((snapshot) => {
      for (const input of inputs) input.checked = input.value === snapshot.movementMode;
    });
    fieldset.appendChild(choices);
    root.appendChild(fieldset);
    return root;
  };

  return {
    renderers: {
      search: renderSearch,
      "visit-status": renderVisitStatus,
      "folder-history": renderFolderHistory,
      sort: renderSort,
      "view-type": renderViewType,
      "movement-mode": renderMovementMode,
    },
    sync(): void {
      const snapshot = options.snapshot();
      for (const sync of syncers) sync(snapshot);
    },
    disconnect(): void {
      for (const cleanup of cleanups.splice(0)) cleanup();
      syncers.length = 0;
    },
  };
}

/** fieldsetへ視覚的に隠せるlegendを追加する。 */
function appendLegend(
  fieldset: HTMLFieldSetElement,
  text: string,
  documentRef: Pick<Document, "createElement">,
): void {
  const legend = documentRef.createElement("legend");
  legend.textContent = text;
  fieldset.appendChild(legend);
}

/** ラベル付きradioを選択肢コンテナーへ追加する。 */
function appendRadioChoice(
  root: HTMLElement,
  model: {
    readonly name: string;
    readonly value: string;
    readonly label: string;
    readonly className: string;
    readonly glyph?: "favorite" | ViewType;
  },
  documentRef: Pick<Document, "createElement">,
): HTMLInputElement {
  const label = documentRef.createElement("label");
  label.className = model.className;
  const input = documentRef.createElement("input");
  input.type = "radio";
  input.name = model.name;
  input.value = model.value;
  input.setAttribute("aria-label", model.label);
  const span = documentRef.createElement("span");
  span.className = model.className.startsWith("movement-option") ? "movement-segment" : "";
  if (model.glyph) {
    const glyph = documentRef.createElement("span");
    glyph.className = `view-type-glyph view-type-glyph--${model.glyph}`;
    glyph.setAttribute("aria-hidden", "true");
    if (model.glyph === "favorite") glyph.textContent = "★";
    span.appendChild(glyph);
  } else {
    span.textContent = model.label;
  }
  label.appendChild(input);
  label.appendChild(span);
  root.appendChild(label);
  return input;
}

/** 操作ボタンを生成して親へ追加する。 */
function appendButton(
  root: HTMLElement,
  text: string,
  ariaLabel: string,
  documentRef: Pick<Document, "createElement">,
): HTMLButtonElement {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", ariaLabel);
  root.appendChild(button);
  return button;
}

/** selectへoptionを追加する。 */
function appendOption(
  select: HTMLSelectElement,
  value: string,
  text: string,
  documentRef: Pick<Document, "createElement">,
): void {
  const option = documentRef.createElement("option");
  option.value = value;
  option.textContent = text;
  select.appendChild(option);
}
