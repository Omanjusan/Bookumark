import {
  DOCKING_SCHEMA_VERSION,
  type ChipInstanceConfiguration,
  type DockingDocuments,
  type RailId,
} from "./docking-persistence-model.js";

export const DB15_FIXTURE_COUNTS = Object.freeze({
  bookmarks: 2_000,
  bays: 20,
  chipsPerBay: 10,
  chips: 200,
});

const CHIP_TYPES = [
  "search",
  "visit-status",
  "folder-history",
  "sort",
  "view-type",
  "movement-mode",
] as const;
const RAILS: readonly RailId[] = ["top", "left", "right", "bottom"];

/** DB-15の高負荷実機試験で使う決定的なドッキング文書を生成する。 */
export function createDb15DockingFixture(): DockingDocuments {
  let nextChipSequence = 1;
  const bays = Array.from({ length: DB15_FIXTURE_COUNTS.bays }, (_, bayIndex) => ({
    id: `bay-${bayIndex + 1}`,
    name: `DB15負荷ベイ ${String(bayIndex + 1).padStart(2, "0")}`,
    permanent: bayIndex === 0,
    chips: Array.from({ length: DB15_FIXTURE_COUNTS.chipsPerBay }, (_, chipIndex) => {
      const chip = createChip(nextChipSequence, chipIndex);
      nextChipSequence += 1;
      return chip;
    }),
  }));
  // 正常化とruntimeの適用順に合わせ、レール単位で配置をまとめる。
  const placements = RAILS.flatMap((rail, railIndex) => Array.from(
    { length: DB15_FIXTURE_COUNTS.bays / RAILS.length },
    (_, index) => ({ bayId: bays[railIndex + index * RAILS.length].id, rail, order: index + 1 }),
  ));

  return {
    bayConfigurations: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextBaySequence: DB15_FIXTURE_COUNTS.bays + 1,
      nextChipSequence,
      bays,
    },
    mainLayouts: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部デフォルト",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "DB15高負荷レイアウト",
          systemDefault: false,
          placements,
        },
      ],
    },
    dockingMetadata: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      activeLayoutId: "layout-2",
      preferredLayoutId: "layout-2",
      lastUsedLayoutId: "layout-2",
    },
  };
}

/** ベイ選択・編集を4レール1ベイずつで目視確認する調査用文書を生成する。 */
export function createDb15BayEditingFixture(): DockingDocuments {
  const definitions = [
    { name: "上レール・基本操作", types: [...CHIP_TYPES] },
    { name: "左レール・表示操作", types: ["view-type", "sort"] },
    { name: "右レール・絞り込み", types: ["search", "visit-status"] },
    { name: "下レール・移動操作", types: ["movement-mode", "folder-history"] },
  ] as const;
  let nextChipSequence = 1;
  const bays = definitions.map(({ name, types }, bayIndex) => ({
    id: `bay-${bayIndex + 1}`,
    name,
    permanent: bayIndex === 0,
    chips: types.map((chipType, chipIndex) => ({
      instanceId: `chip-${nextChipSequence++}`,
      chipType,
      order: chipIndex + 1,
      settings: {},
    })),
  }));
  const placements = RAILS.map((rail, index) => ({
    bayId: bays[index].id,
    rail,
    order: 1,
  }));

  return {
    bayConfigurations: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextBaySequence: bays.length + 1,
      nextChipSequence,
      bays,
    },
    mainLayouts: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部デフォルト",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "DB15ベイ編集調査",
          systemDefault: false,
          placements,
        },
      ],
    },
    dockingMetadata: {
      schemaVersion: DOCKING_SCHEMA_VERSION,
      activeLayoutId: "layout-2",
      preferredLayoutId: "layout-2",
      lastUsedLayoutId: "layout-2",
    },
  };
}

/** 通し番号とベイ内位置から基本チップのfixture項目を作る。 */
function createChip(sequence: number, chipIndex: number): ChipInstanceConfiguration {
  return {
    instanceId: `chip-${sequence}`,
    chipType: CHIP_TYPES[chipIndex % CHIP_TYPES.length],
    order: chipIndex + 1,
    settings: {},
  };
}
