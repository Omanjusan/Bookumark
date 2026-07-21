import type { PanelSize } from "./desired-size.js";

interface PanelSizeSpec {
  readonly columns: number;
  readonly rows: number;
  readonly area: number;
}

export const PANEL_SIZE_SPECS: Readonly<Record<PanelSize, PanelSizeSpec>> = {
  "4": { columns: 8, rows: 8, area: 64 },
  "2": { columns: 8, rows: 4, area: 32 },
  "1": { columns: 4, rows: 4, area: 16 },
  "1/2": { columns: 4, rows: 2, area: 8 },
  "1/4": { columns: 2, rows: 2, area: 4 },
  "1/8": { columns: 2, rows: 1, area: 2 },
  "1/16": { columns: 1, rows: 1, area: 1 },
};

const PANEL_SIZE_ORDER: readonly PanelSize[] = ["4", "2", "1", "1/2", "1/4", "1/8", "1/16"];

type BudgetedPanelSize = Exclude<PanelSize, "1/16">;
type AreaBudgets = Readonly<Record<BudgetedPanelSize, number>>;

export const DEFAULT_AREA_BUDGETS: AreaBudgets = {
  "4": 0.25,
  "2": 0.45,
  "1": 0.7,
  "1/2": 0.85,
  "1/4": 0.92,
  "1/8": 0.97,
};

interface AllocationInput {
  readonly items: readonly { readonly guid: string; readonly desiredSize: PanelSize }[];
  readonly scalable: boolean;
  readonly columns: number;
  readonly rows: number;
  readonly budgets?: AreaBudgets;
}

type AllocationResult =
  | { status: "allocated"; sizes: Array<{ guid: string; size: PanelSize }> }
  | { status: "deferred" };

/** 希望サイズへ幅制約を適用し、表示順を維持した確定サイズを返す。 */
export function allocatePanelSizes(input: AllocationInput): AllocationResult {
  validateDimension(input.columns, "columns");
  validateDimension(input.rows, "rows");
  if (input.columns === 0 || input.rows === 0) return { status: "deferred" };

  if (!input.scalable) {
    const size = largestWidthCompatibleSize("1", input.columns);
    return {
      status: "allocated",
      sizes: input.items.map(({ guid }) => ({ guid, size })),
    };
  }

  const budgets = input.budgets ?? DEFAULT_AREA_BUDGETS;
  validateBudgets(budgets);
  const capacity = input.columns * input.rows;
  const usedArea = PANEL_SIZE_ORDER.map(() => 0);

  return {
    status: "allocated",
    sizes: input.items.map(({ guid, desiredSize }) => {
      const size = allocateScalableSize(
        desiredSize,
        input.columns,
        capacity,
        budgets,
        usedArea,
      );
      return { guid, size };
    }),
  };
}

function allocateScalableSize(
  desiredSize: PanelSize,
  columns: number,
  capacity: number,
  budgets: AreaBudgets,
  usedArea: number[],
): PanelSize {
  const desiredIndex = PANEL_SIZE_ORDER.indexOf(desiredSize);
  for (let index = desiredIndex; index < PANEL_SIZE_ORDER.length; index += 1) {
    const size = PANEL_SIZE_ORDER[index];
    const spec = PANEL_SIZE_SPECS[size];
    if (spec.columns > columns) continue;

    if (size === "1/16") {
      usedArea[index] += spec.area;
      return size;
    }

    const cumulativeArea = usedArea
      .slice(0, index + 1)
      .reduce((total, area) => total + area, spec.area);
    if (cumulativeArea <= capacity * budgets[size]) {
      usedArea[index] += spec.area;
      return size;
    }
  }
  return "1/16";
}

function largestWidthCompatibleSize(desiredSize: PanelSize, columns: number): PanelSize {
  const desiredIndex = PANEL_SIZE_ORDER.indexOf(desiredSize);
  for (let index = desiredIndex; index < PANEL_SIZE_ORDER.length; index += 1) {
    const size = PANEL_SIZE_ORDER[index];
    if (PANEL_SIZE_SPECS[size].columns <= columns) return size;
  }
  return "1/16";
}

function validateDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function validateBudgets(budgets: AreaBudgets): void {
  let previous = 0;
  for (const size of PANEL_SIZE_ORDER.slice(0, -1) as readonly BudgetedPanelSize[]) {
    const budget = budgets[size];
    if (!Number.isFinite(budget) || budget < 0 || budget > 1) {
      throw new RangeError("area budgets must be finite values from 0 through 1");
    }
    if (budget < previous) {
      throw new RangeError("cumulative area budgets must be non-decreasing");
    }
    previous = budget;
  }
}
