export const DEFAULT_GRID_UNIT = 24;
export const DEFAULT_GRID_GAP = 4;

interface GridMeasurementInput {
  readonly width: number;
  readonly height: number;
  readonly unit?: number;
  readonly gap?: number;
}

/** content boxへgap込みで完全に収まる列数と行数を返す。 */
export function calculateGridCells(input: GridMeasurementInput): {
  columns: number;
  rows: number;
} {
  const unit = input.unit ?? DEFAULT_GRID_UNIT;
  const gap = input.gap ?? DEFAULT_GRID_GAP;
  validateNonNegativeFinite(input.width, "width");
  validateNonNegativeFinite(input.height, "height");
  if (!Number.isFinite(unit) || unit <= 0) {
    throw new RangeError("grid unit must be a positive finite number");
  }
  validateNonNegativeFinite(gap, "gap");

  return {
    columns: cellsIn(input.width, unit, gap),
    rows: cellsIn(input.height, unit, gap),
  };
}

function cellsIn(length: number, unit: number, gap: number): number {
  if (length < unit) return 0;
  return Math.floor((length + gap) / (unit + gap));
}

function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}
