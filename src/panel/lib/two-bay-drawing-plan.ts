import type {
  TwoBayChipInstance,
  TwoBayConfiguration,
  TwoBayId,
  TwoBayJsonObject,
} from "./two-bay-persistence-model.js";

export interface TwoBayChipDrawingPlan {
  readonly instanceId: string;
  readonly chipType: string;
  readonly order: number;
  readonly settings: TwoBayJsonObject;
}

export interface TwoBayRowDrawingPlan {
  readonly row: number;
  readonly chips: TwoBayChipDrawingPlan[];
}

export interface TwoBayDrawingPlanEntry {
  readonly bay: TwoBayId;
  readonly rows: TwoBayRowDrawingPlan[];
}

export interface TwoBayDrawingPlan {
  readonly top: TwoBayDrawingPlanEntry;
  readonly bottom: TwoBayDrawingPlanEntry;
}

/** 保存構成を変更せず、上下それぞれの表示行だけを描画順へ変換する。 */
export function buildTwoBayDrawingPlan(
  configuration: TwoBayConfiguration,
): TwoBayDrawingPlan {
  return {
    top: buildBayPlan("top", configuration),
    bottom: buildBayPlan("bottom", configuration),
  };
}

/** 1ベイの外側から内側へ表示行を並べ、行内チップをorder順へ複製する。 */
function buildBayPlan(
  bay: TwoBayId,
  configuration: TwoBayConfiguration,
): TwoBayDrawingPlanEntry {
  const state = configuration.bays[bay];
  const rows = Array.from({ length: state.visibleRows }, (_, index) => {
    const row = index + 1;
    return {
      row,
      chips: state.chips
        .filter((chip) => chip.row === row)
        .sort(compareChipOrder)
        .map(({ instanceId, chipType, order, settings }) => ({
          instanceId,
          chipType,
          order,
          settings: structuredClone(settings),
        })),
    };
  });
  return { bay, rows };
}

/** チップを行内orderの昇順へ安定して並べる。 */
function compareChipOrder(
  left: TwoBayChipInstance,
  right: TwoBayChipInstance,
): number {
  return left.order - right.order;
}
