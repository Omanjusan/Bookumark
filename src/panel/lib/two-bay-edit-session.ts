import {
  cloneTwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import type {
  TwoBayConfiguration,
} from "./two-bay-persistence-model.js";

export interface TwoBayEditSession {
  readonly active: boolean;
  begin(configuration: TwoBayConfiguration): TwoBayConfiguration;
  update(mutator: (draft: TwoBayConfiguration) => void): TwoBayConfiguration;
  cancel(): TwoBayConfiguration;
  baseline(): TwoBayConfiguration | null;
  draft(): TwoBayConfiguration | null;
}

/** 保存済みbaselineと編集draftを共有参照なしで管理するセッションを生成する。 */
export function createTwoBayEditSession(): TwoBayEditSession {
  let baseline: TwoBayConfiguration | null = null;
  let draft: TwoBayConfiguration | null = null;

  return {
    get active(): boolean { return draft !== null; },
    begin(configuration): TwoBayConfiguration {
      if (draft !== null) throw new Error("two-bay edit session is already active");
      baseline = cloneTwoBayConfiguration(configuration);
      draft = cloneTwoBayConfiguration(configuration);
      return cloneTwoBayConfiguration(draft);
    },
    update(mutator): TwoBayConfiguration {
      if (draft === null) throw new Error("two-bay edit session is not active");
      const candidate = cloneTwoBayConfiguration(draft);
      mutator(candidate);
      draft = candidate;
      return cloneTwoBayConfiguration(draft);
    },
    cancel(): TwoBayConfiguration {
      if (baseline === null || draft === null) {
        throw new Error("two-bay edit session is not active");
      }
      const restored = cloneTwoBayConfiguration(baseline);
      baseline = null;
      draft = null;
      return restored;
    },
    baseline: (): TwoBayConfiguration | null => baseline === null
      ? null
      : cloneTwoBayConfiguration(baseline),
    draft: (): TwoBayConfiguration | null => draft === null
      ? null
      : cloneTwoBayConfiguration(draft),
  };
}

