import { DOCKING_SCHEMA_VERSION } from "./docking-persistence-model.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

export const PERMANENT_DEFAULT_BAY_ID = "bay-1";
export const INTERNAL_DEFAULT_LAYOUT_ID = "layout-1";

const INTERNAL_DEFAULT_DOCUMENTS: DockingDocuments = {
  bayConfigurations: {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    nextBaySequence: 2,
    nextChipSequence: 7,
    bays: [{
      id: PERMANENT_DEFAULT_BAY_ID,
      name: "デフォルトベイ",
      permanent: true,
      chips: [
        { instanceId: "chip-1", chipType: "search", order: 1, settings: {} },
        { instanceId: "chip-2", chipType: "visit-status", order: 2, settings: {} },
        { instanceId: "chip-3", chipType: "folder-history", order: 3, settings: {} },
        { instanceId: "chip-4", chipType: "sort", order: 4, settings: {} },
        { instanceId: "chip-5", chipType: "view-type", order: 5, settings: {} },
        { instanceId: "chip-6", chipType: "movement-mode", order: 6, settings: {} },
      ],
    }],
  },
  mainLayouts: {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    nextLayoutSequence: 2,
    layouts: [{
      id: INTERNAL_DEFAULT_LAYOUT_ID,
      name: "内部デフォルト",
      systemDefault: true,
      placements: [{ bayId: PERMANENT_DEFAULT_BAY_ID, rail: "top", order: 1 }],
    }],
  },
  dockingMetadata: {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    activeLayoutId: INTERNAL_DEFAULT_LAYOUT_ID,
  },
};

/** 初期状態と全体復旧で使う内部デフォルト3文書を独立した値として返す。 */
export function createInternalDefaultDockingDocuments(): DockingDocuments {
  return structuredClone(INTERNAL_DEFAULT_DOCUMENTS);
}
