import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import { cloneTwoBayConfiguration } from "./two-bay-persistence-model.js";

export const TWO_BAY_STORAGE_KEY = "twoBayConfiguration.v1";

/** 上下2ベイ専用キーだけを読み込み、値を解釈せずに返す。 */
export async function loadTwoBayConfiguration(): Promise<unknown> {
  const stored = await browser.storage.local.get([TWO_BAY_STORAGE_KEY]);
  return stored[TWO_BAY_STORAGE_KEY];
}

/** 上下2ベイ単一構成の防御的コピーを専用キーだけへ保存する。 */
export async function saveTwoBayConfiguration(
  configuration: TwoBayConfiguration,
): Promise<void> {
  await browser.storage.local.set({
    [TWO_BAY_STORAGE_KEY]: cloneTwoBayConfiguration(configuration),
  });
}
