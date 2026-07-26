export interface BayFactoryChipViewModel {
  readonly instanceId: string;
  readonly label: string;
}

export interface BayFactoryViewModel {
  readonly bayId: string;
  readonly name: string;
  readonly chips: readonly BayFactoryChipViewModel[];
}

export interface BayFactoryDrawingPlan {
  readonly bayId: string;
  readonly name: string;
  readonly content:
    | { readonly status: "empty" }
    | { readonly status: "chips"; readonly chips: readonly BayFactoryChipViewModel[] };
}

interface BayFactoryRenderOptions {
  readonly document?: Pick<Document, "createElement">;
}

/** 1ベイの表示モデルを横ベイ編集用の静的描画計画へ変換する。 */
export function buildBayFactoryDrawingPlan(
  model: BayFactoryViewModel,
): BayFactoryDrawingPlan {
  return {
    bayId: model.bayId,
    name: model.name,
    content: model.chips.length === 0
      ? { status: "empty" }
      : {
        status: "chips",
        chips: model.chips.map((chip) => ({ ...chip })),
      },
  };
}

/** 1ベイ分の文字チップまたは空状態を横向き編集領域へ描画する。 */
export function renderBayFactoryEditor(
  root: HTMLElement,
  model: BayFactoryViewModel,
  options: BayFactoryRenderOptions = {},
): void {
  const documentRef = options.document ?? document;
  const plan = buildBayFactoryDrawingPlan(model);
  root.textContent = "";
  root.dataset.bayId = plan.bayId;
  root.setAttribute("aria-label", `${plan.name}の横ベイ編集`);

  if (plan.content.status === "empty") {
    const empty = documentRef.createElement("div");
    empty.className = "bay-factory-empty";
    const prompt = documentRef.createElement("p");
    prompt.textContent = "チップを配置してください";
    empty.appendChild(prompt);
    const orientation = documentRef.createElement("p");
    orientation.textContent = "左側が上部、右側が下部に回転表示されます";
    empty.appendChild(orientation);
    root.appendChild(empty);
    return;
  }

  const preview = documentRef.createElement("div");
  preview.className = "bay-factory-bay-preview";
  for (const model of plan.content.chips) {
    const chip = documentRef.createElement("span");
    chip.className = "bay-factory-chip";
    chip.dataset.instanceId = model.instanceId;
    chip.textContent = model.label;
    preview.appendChild(chip);
  }
  root.appendChild(preview);
}
