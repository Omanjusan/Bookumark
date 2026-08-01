export const TWO_BAY_SCHEMA_VERSION = 1;
export const MAX_BAY_ROWS = 3;

export type TwoBayId = "top" | "bottom";
export type TwoBayJsonValue =
  | string
  | number
  | boolean
  | null
  | TwoBayJsonValue[]
  | TwoBayJsonObject;
export type TwoBayJsonObject = { [key: string]: TwoBayJsonValue };

export interface TwoBayChipInstance {
  instanceId: string;
  chipType: string;
  row: number;
  order: number;
  settings: TwoBayJsonObject;
}

export interface TwoBayState {
  visibleRows: number;
  chips: TwoBayChipInstance[];
}

export interface TwoBayConfiguration {
  schemaVersion: number;
  systemBay: TwoBayId;
  nextChipSequence: number;
  bays: Record<TwoBayId, TwoBayState>;
}

const INITIAL_TWO_BAY_CONFIGURATION: TwoBayConfiguration = {
  schemaVersion: TWO_BAY_SCHEMA_VERSION,
  systemBay: "top",
  nextChipSequence: 7,
  bays: {
    top: {
      visibleRows: 1,
      chips: [
        chip("chip-1", "search", 1),
        chip("chip-2", "visit-status", 2),
        chip("chip-3", "folder-history", 3),
        chip("chip-4", "sort", 4),
        chip("chip-5", "view-type", 5),
        chip("chip-6", "movement-mode", 6),
      ],
    },
    bottom: { visibleRows: 0, chips: [] },
  },
};

/** 承認済みの上1行・下0行構成を独立した可変値として返す。 */
export function createInitialTwoBayConfiguration(): TwoBayConfiguration {
  return cloneTwoBayConfiguration(INITIAL_TWO_BAY_CONFIGURATION);
}

/** 上下2ベイ構成を保存候補や編集draft間で共有しない防御的コピーにする。 */
export function cloneTwoBayConfiguration(
  configuration: TwoBayConfiguration,
): TwoBayConfiguration {
  return structuredClone(configuration);
}

/** 正規化済み構成が上下2ベイの実行時不変条件を満たすことを表明する。 */
export function assertTwoBayConfigurationInvariants(
  configuration: TwoBayConfiguration,
): void {
  if (configuration.schemaVersion !== TWO_BAY_SCHEMA_VERSION) {
    throw new TypeError("schemaVersion must match TWO_BAY_SCHEMA_VERSION");
  }
  if (configuration.systemBay !== "top" && configuration.systemBay !== "bottom") {
    throw new TypeError("systemBay must be top or bottom");
  }
  if (!Number.isSafeInteger(configuration.nextChipSequence)
    || configuration.nextChipSequence < 1) {
    throw new RangeError("nextChipSequence must be a positive safe integer");
  }

  const instanceIds = new Set<string>();
  let greatestIssuedChipSequence = 0;
  for (const bayId of ["top", "bottom"] as const) {
    const bay = configuration.bays[bayId];
    assertVisibleRows(bay.visibleRows);
    if (bayId === configuration.systemBay && bay.visibleRows === 0) {
      throw new RangeError("system bay must have at least one visible row");
    }

    const ordersByRow = new Map<number, Set<number>>();
    for (const configuredChip of bay.chips) {
      if (instanceIds.has(configuredChip.instanceId)) {
        throw new TypeError("chip instanceId must be unique");
      }
      instanceIds.add(configuredChip.instanceId);
      assertChipRow(configuredChip.row);
      if (!Number.isSafeInteger(configuredChip.order) || configuredChip.order < 1) {
        throw new RangeError("chip order must be a positive safe integer");
      }
      const rowOrders = ordersByRow.get(configuredChip.row) ?? new Set<number>();
      if (rowOrders.has(configuredChip.order)) {
        throw new TypeError("chip order must be unique within a bay row");
      }
      rowOrders.add(configuredChip.order);
      ordersByRow.set(configuredChip.row, rowOrders);

      const issuedSequence = parseIssuedChipSequence(configuredChip.instanceId);
      greatestIssuedChipSequence = Math.max(greatestIssuedChipSequence, issuedSequence);
    }
  }
  if (configuration.nextChipSequence <= greatestIssuedChipSequence) {
    throw new RangeError("nextChipSequence must be greater than issued chip IDs");
  }
}

/** 初期構成用の1行目チップを生成する。 */
function chip(instanceId: string, chipType: string, order: number): TwoBayChipInstance {
  return { instanceId, chipType, row: 1, order, settings: {} };
}

/** ベイの表示行数が共通上限内の整数であることを確認する。 */
function assertVisibleRows(visibleRows: number): void {
  if (!Number.isInteger(visibleRows) || visibleRows < 0 || visibleRows > MAX_BAY_ROWS) {
    throw new RangeError("visibleRows must be an integer between 0 and MAX_BAY_ROWS");
  }
}

/** 非表示行も含むチップ所属行が共通上限内であることを確認する。 */
function assertChipRow(row: number): void {
  if (!Number.isInteger(row) || row < 1 || row > MAX_BAY_ROWS) {
    throw new RangeError("chip row must be an integer between 1 and MAX_BAY_ROWS");
  }
}

/** `chip-N`形式の発行済み番号を返し、別形式のIDは採番境界から除外する。 */
function parseIssuedChipSequence(instanceId: string): number {
  const match = /^chip-([1-9]\d*)$/.exec(instanceId);
  if (match === null) return 0;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : 0;
}
