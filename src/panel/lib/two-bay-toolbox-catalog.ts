export interface TwoBayToolDefinition {
  readonly chipType: string;
  readonly label: string;
  readonly enabled: boolean;
}

export interface TwoBayToolCategory {
  readonly id: string;
  readonly label: string;
  readonly tools: readonly TwoBayToolDefinition[];
}

/** 表示カテゴリとチップ型を分離した初期ツールボックス定義。 */
export const TWO_BAY_TOOLBOX_CATEGORIES: readonly TwoBayToolCategory[] = [
  category("filter", "絞り込み", [tool("search", "検索"), tool("visit-status", "訪問状態")]),
  category("navigation", "ナビゲーション", [
    tool("folder-history", "フォルダ履歴"), tool("movement-mode", "移動モード"),
  ]),
  category("display", "表示", [tool("sort", "ソート"), tool("view-type", "表示形式")]),
  category("information", "情報", [tool("date", "日付"), tool("clock", "時計")]),
];

/** category定義を簡潔に生成する。 */
function category(id: string, label: string, tools: readonly TwoBayToolDefinition[]): TwoBayToolCategory {
  return { id, label, tools };
}

/** chip tool定義を簡潔に生成する。 */
function tool(chipType: string, label: string, enabled = true): TwoBayToolDefinition {
  return { chipType, label, enabled };
}
