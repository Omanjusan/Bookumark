export const DOCKING_SCHEMA_VERSION = 1;

export type RailId = "top" | "left" | "right" | "bottom";
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export interface ChipInstanceConfiguration {
  instanceId: string;
  chipType: string;
  order: number;
  settings: JsonObject;
}

export interface BayConfiguration {
  id: string;
  name: string;
  permanent: boolean;
  chips: ChipInstanceConfiguration[];
}

export interface BayPlacement {
  bayId: string;
  rail: RailId;
  order: number;
}

export interface LayoutConfiguration {
  id: string;
  name: string;
  systemDefault: boolean;
  placements: BayPlacement[];
}

export interface BayConfigurationsDocument {
  schemaVersion: number;
  nextBaySequence: number;
  nextChipSequence: number;
  bays: BayConfiguration[];
}

export interface MainLayoutsDocument {
  schemaVersion: number;
  nextLayoutSequence: number;
  layouts: LayoutConfiguration[];
}

export interface DockingMetadataDocument {
  schemaVersion: number;
  activeLayoutId: string;
  preferredLayoutId?: string;
  lastUsedLayoutId?: string;
}

export interface DockingDocuments {
  bayConfigurations: BayConfigurationsDocument;
  mainLayouts: MainLayoutsDocument;
  dockingMetadata: DockingMetadataDocument;
}

interface IssuedId {
  readonly id: string;
  readonly nextSequence: number;
}

/** 具体的な内部デフォルト内容を持たない空の永続文書群を生成する。 */
export function createDockingDocuments(activeLayoutId: string): DockingDocuments {
  return {
    bayConfigurations: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextBaySequence: 1,
      nextChipSequence: 1,
      bays: [],
    },
    mainLayouts: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextLayoutSequence: 1,
      layouts: [],
    },
    dockingMetadata: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      activeLayoutId,
    },
  };
}

export function issueBayId(sequence: number): IssuedId {
  return issueId("bay", sequence);
}

export function issueChipId(sequence: number): IssuedId {
  return issueId("chip", sequence);
}

export function issueLayoutId(sequence: number): IssuedId {
  return issueId("layout", sequence);
}

function issueId(prefix: "bay" | "chip" | "layout", sequence: number): IssuedId {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError("sequence must be a positive safe integer");
  }
  if (sequence === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("sequence cannot be incremented safely");
  }
  return { id: `${prefix}-${sequence}`, nextSequence: sequence + 1 };
}
