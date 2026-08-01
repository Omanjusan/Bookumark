import { cloneTwoBayConfiguration } from "./two-bay-persistence-model.js";
import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import {
  loadNormalizedTwoBayConfiguration,
} from "./two-bay-normalization.js";
import type {
  TwoBayNormalizationResult,
} from "./two-bay-normalization.js";

interface PanelTwoBayBootstrapDependencies {
  readonly loadNormalized?: () => Promise<TwoBayNormalizationResult>;
}

export interface PanelTwoBayState {
  readonly configuration: TwoBayConfiguration;
  readonly recovery: TwoBayNormalizationResult["recovery"];
}

/** 復旧保存まで完了した上下2ベイ構成だけをパネル起動候補として公開する。 */
export async function loadPanelTwoBayState(
  dependencies: PanelTwoBayBootstrapDependencies = {},
): Promise<PanelTwoBayState> {
  const loadNormalized = dependencies.loadNormalized ?? loadNormalizedTwoBayConfiguration;
  const result = await loadNormalized();
  return {
    configuration: cloneTwoBayConfiguration(result.configuration),
    recovery: result.recovery,
  };
}
