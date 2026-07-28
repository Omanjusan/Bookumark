import {
  readControlChipState,
  updateControlChipState,
} from "./chip-contract.js";
import type {
  ChipDefinitionRegistry,
  ChipInstanceConfiguration,
  ChipSharedState,
  ControlChipDefinition,
} from "./chip-contract.js";
import {
  isValidDockingSharedState,
} from "./docking-shared-state.js";
import type { DockingSharedState } from "./docking-shared-state.js";

interface DockingControlConnection {
  disconnect(): void;
}

export interface DockingBasicControlStore {
  getState(): DockingSharedState;
  read(instance: ChipInstanceConfiguration): unknown;
  update(instance: ChipInstanceConfiguration, value: unknown): void;
  connect(
    instance: ChipInstanceConfiguration,
    render: (value: unknown) => void,
  ): DockingControlConnection;
  disconnect(): void;
}

interface ActiveControlConnection {
  readonly instance: ChipInstanceConfiguration;
  readonly render: (value: unknown) => void;
  active: boolean;
}

const DEFAULT_FOLDER_HISTORY = {
  canGoBack: false,
  canGoForward: false,
  pending: false,
};

export const BASIC_DOCKING_CONTROL_DEFINITIONS: ChipDefinitionRegistry = new Map([
  ["search", controlDefinition(
    "search",
    (state) => state.query,
    (state, value) => ({ ...state, query: value }),
  )],
  ["visit-status", controlDefinition(
    "visit-status",
    (state) => asRecord(state.filters).visitStatus,
    (state, value) => ({
      ...state,
      filters: { ...asRecord(state.filters), visitStatus: value },
    }),
  )],
  ["folder-history", controlDefinition(
    "folder-history",
    (state) => state.folderHistory ?? DEFAULT_FOLDER_HISTORY,
    (state, value) => ({ ...state, folderHistory: value }),
  )],
  ["sort", controlDefinition(
    "sort",
    (state) => state.sort,
    (state, value) => ({ ...state, sort: value }),
  )],
  ["view-type", controlDefinition(
    "view-type",
    (state) => state.viewType,
    (state, value) => ({ ...state, viewType: value }),
  )],
  ["movement-mode", controlDefinition(
    "movement-mode",
    (state) => state.movementMode,
    (state, value) => ({ ...state, movementMode: value }),
  )],
]);

/** 基本6 controlを1つの検証済み共有状態へ接続するストアを生成する。 */
export function createDockingBasicControlStore(
  initialState: DockingSharedState,
): DockingBasicControlStore {
  const activeLayoutId = initialState.activeLayoutId;
  if (!isValidDockingSharedState(initialState, activeLayoutId)) {
    throw new TypeError("invalid Docking shared state");
  }
  let state = structuredClone(initialState);
  const connections = new Set<ActiveControlConnection>();

  const read = (instance: ChipInstanceConfiguration): unknown => {
    const value = readControlChipState(
      BASIC_DOCKING_CONTROL_DEFINITIONS.get(instance.chipType),
      instance,
      state,
    );
    return structuredClone(value);
  };

  const sync = (connection: ActiveControlConnection): void => {
    if (connection.active) connection.render(read(connection.instance));
  };

  const syncAll = (): void => {
    for (const connection of [...connections]) sync(connection);
  };

  return {
    getState(): DockingSharedState {
      return structuredClone(state);
    },
    read,
    update(instance, value): void {
      const candidate = updateControlChipState(
        BASIC_DOCKING_CONTROL_DEFINITIONS.get(instance.chipType),
        instance,
        structuredClone(state),
        structuredClone(value),
      );
      if (!isValidDockingSharedState(candidate, activeLayoutId)) {
        throw new TypeError("invalid Docking shared state");
      }
      state = structuredClone(candidate);
      syncAll();
    },
    connect(instance, render): DockingControlConnection {
      const connection: ActiveControlConnection = {
        instance: structuredClone(instance),
        render,
        active: true,
      };
      connections.add(connection);
      sync(connection);
      return {
        disconnect(): void {
          if (!connection.active) return;
          connection.active = false;
          connections.delete(connection);
        },
      };
    },
    disconnect(): void {
      for (const connection of connections) connection.active = false;
      connections.clear();
    },
  };
}

/** control種別と共有状態の読取・更新関数を定義へまとめる。 */
function controlDefinition(
  chipType: string,
  read: ControlChipDefinition["read"],
  update: ControlChipDefinition["update"],
): ControlChipDefinition {
  return { chipType, kind: "control", read, update };
}

/** 共有状態内の既知オブジェクト値をcontrol更新用レコードとして扱う。 */
function asRecord(value: unknown): ChipSharedState {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as ChipSharedState
    : {};
}
