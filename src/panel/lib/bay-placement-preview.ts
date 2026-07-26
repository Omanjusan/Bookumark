import { createDockingChipRendererRegistry } from "./docking-chip-renderer-registry.js";
import { renderHorizontalDockingRail } from "./docking-horizontal-rail-view.js";
import { renderVerticalDockingRail } from "./docking-vertical-rail-view.js";
import { buildDockingRailDrawingPlan, dockingOrientationForRail } from "./docking-rail-drawing-plan.js";
import type { DockingBayDrawingPlan, DockingRailPlan } from "./docking-rail-drawing-plan.js";
import type { BayAutoPlacementMeasurements } from "./bay-placement-draft.js";
import type { DockingDocuments, RailId } from "./docking-persistence-model.js";

export type BayPlacementPreviewRoots = Readonly<Record<RailId, HTMLElement>>;

interface BayPlacementPreviewOptions {
  readonly document?: Pick<Document, "createElement">;
}

const RAILS: readonly RailId[] = ["top", "left", "right", "bottom"];

/** 配置ドラフトの4レールを共有状態へ接続しない不活性な実体DOMとして再描画する。 */
export function renderBayPlacementPreviews(
  roots: BayPlacementPreviewRoots,
  documents: DockingDocuments,
  options: BayPlacementPreviewOptions = {},
): void {
  const plan = buildDockingRailDrawingPlan(documents);
  for (const railPlan of plan.rails) {
    const root = roots[railPlan.rail];
    root.replaceChildren();
    renderPreviewRail(root, railPlan, options.document ?? document);
  }
}

/** 候補ベイを各レールへ一時描画し、2px収容判定に必要な実寸を返す。 */
export function measureBayAutoPlacementCandidate(
  roots: BayPlacementPreviewRoots,
  documents: DockingDocuments,
  bayId: string,
  options: BayPlacementPreviewOptions = {},
): BayAutoPlacementMeasurements {
  const bay = documents.bayConfigurations.bays.find(({ id }) => id === bayId);
  if (bay === undefined) throw new Error(`bay was not found: ${bayId}`);
  const documentRef = options.document ?? document;
  const result = {} as Record<RailId, {
    available: number;
    existingExtents: number[];
    candidateExtent: number;
  }>;

  for (const rail of RAILS) {
    const root = roots[rail];
    const orientation = dockingOrientationForRail(rail);
    const existingExtents = Array.from(root.children).map((child) => extentOf(child, orientation));
    const plan: DockingRailPlan = {
      rail,
      orientation,
      bays: [bayPlan(bay, orientation)],
    };
    const before = root.children.length;
    renderPreviewRail(root, plan, documentRef);
    const candidate = Array.from(root.children)[before] ?? null;
    if (candidate === null) throw new Error(`candidate preview was not rendered: ${bayId}`);
    const candidateExtent = extentOf(candidate, orientation);
    candidate.remove();
    result[rail] = {
      available: orientation === "horizontal" ? root.clientWidth : root.clientHeight,
      existingExtents,
      candidateExtent,
    };
  }
  return result;
}

/** 1レール計画を既存の横・縦ベイDOMへ描画し、生成物を不活性化する。 */
function renderPreviewRail(
  root: HTMLElement,
  plan: DockingRailPlan,
  documentRef: Pick<Document, "createElement">,
): void {
  const registry = previewRegistry(documentRef);
  if (plan.orientation === "horizontal") {
    renderHorizontalDockingRail(root, plan, registry, { document: documentRef });
  } else {
    renderVerticalDockingRail(root, plan, registry, { document: documentRef });
  }
  for (const child of Array.from(root.children)) {
    const preview = child as HTMLElement;
    preview.classList.add("dock-bay--preview");
    preview.setAttribute("aria-hidden", "true");
    preview.inert = true;
  }
}

/** 基本チップを機能名だけの静的部品へ変換するプレビュー専用レジストリを生成する。 */
function previewRegistry(documentRef: Pick<Document, "createElement">) {
  const render = (label: string) => () => {
    const control = documentRef.createElement("span");
    control.className = "dock-chip-preview-control";
    control.textContent = label;
    return control;
  };
  return createDockingChipRendererRegistry({
    search: render("検索"),
    "visit-status": render("訪問状態"),
    "folder-history": render("フォルダ履歴"),
    sort: render("ソート"),
    "view-type": render("表示形式"),
    "movement-mode": render("移動モード"),
  });
}

/** ベイ設定を候補レールの向きへ合わせた単一ベイ計画へ変換する。 */
function bayPlan(
  bay: DockingDocuments["bayConfigurations"]["bays"][number],
  orientation: DockingBayDrawingPlan["orientation"],
): DockingBayDrawingPlan {
  return {
    bayId: bay.id,
    name: bay.name,
    permanent: bay.permanent,
    orientation,
    chips: [...bay.chips].sort((left, right) => left.order - right.order).map((chip) => structuredClone(chip)),
  };
}

/** DOM矩形からレール方向の占有長を取得する。 */
function extentOf(element: Element, orientation: "horizontal" | "vertical"): number {
  const rect = element.getBoundingClientRect();
  return orientation === "horizontal" ? rect.width : rect.height;
}
