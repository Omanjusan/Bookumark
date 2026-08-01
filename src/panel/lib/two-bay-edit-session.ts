import {
  cloneTwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import type {
  TwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import { saveTwoBayConfiguration } from "./two-bay-storage.js";

interface TwoBayEditSessionOptions {
  readonly save?: (configuration: TwoBayConfiguration) => Promise<void>;
}

export interface TwoBayEditSession {
  readonly active: boolean;
  readonly dirty: boolean;
  readonly pending: boolean;
  readonly saving: boolean;
  begin(configuration: TwoBayConfiguration): TwoBayConfiguration;
  update(mutator: (draft: TwoBayConfiguration) => void): TwoBayConfiguration;
  confirm(): Promise<TwoBayConfiguration>;
  retry(): Promise<TwoBayConfiguration>;
  cancel(): TwoBayConfiguration;
  baseline(): TwoBayConfiguration | null;
  draft(): TwoBayConfiguration | null;
}

/** 保存済みbaselineと編集draftを共有参照なしで管理するセッションを生成する。 */
export function createTwoBayEditSession(
  options: TwoBayEditSessionOptions = {},
): TwoBayEditSession {
  let baseline: TwoBayConfiguration | null = null;
  let draft: TwoBayConfiguration | null = null;
  let failedCandidate: TwoBayConfiguration | null = null;
  let saving = false;
  const persist = options.save ?? saveTwoBayConfiguration;

  /** 固定候補を一括保存し、成功時だけ編集状態を終了する。 */
  const saveCandidate = async (candidate: TwoBayConfiguration): Promise<TwoBayConfiguration> => {
    const savingCandidate = cloneTwoBayConfiguration(candidate);
    saving = true;
    try {
      await persist(cloneTwoBayConfiguration(savingCandidate));
      baseline = null;
      draft = null;
      failedCandidate = null;
      return cloneTwoBayConfiguration(savingCandidate);
    } catch (error) {
      failedCandidate = savingCandidate;
      throw error;
    } finally {
      saving = false;
    }
  };

  return {
    get active(): boolean { return draft !== null; },
    get dirty(): boolean {
      return baseline !== null && draft !== null
        && JSON.stringify(baseline) !== JSON.stringify(draft);
    },
    get pending(): boolean { return failedCandidate !== null; },
    get saving(): boolean { return saving; },
    begin(configuration): TwoBayConfiguration {
      if (draft !== null) throw new Error("two-bay edit session is already active");
      baseline = cloneTwoBayConfiguration(configuration);
      draft = cloneTwoBayConfiguration(configuration);
      failedCandidate = null;
      return cloneTwoBayConfiguration(draft);
    },
    update(mutator): TwoBayConfiguration {
      if (draft === null) throw new Error("two-bay edit session is not active");
      if (failedCandidate !== null) throw new Error("two-bay edit save retry is pending");
      if (saving) throw new Error("two-bay edit save is in progress");
      const candidate = cloneTwoBayConfiguration(draft);
      mutator(candidate);
      draft = candidate;
      return cloneTwoBayConfiguration(draft);
    },
    confirm(): Promise<TwoBayConfiguration> {
      if (draft === null) throw new Error("two-bay edit session is not active");
      if (failedCandidate !== null) throw new Error("two-bay edit save retry is pending");
      if (saving) throw new Error("two-bay edit save is in progress");
      failedCandidate = cloneTwoBayConfiguration(draft);
      return saveCandidate(failedCandidate);
    },
    retry(): Promise<TwoBayConfiguration> {
      if (failedCandidate === null) throw new Error("two-bay edit save retry is not pending");
      if (saving) throw new Error("two-bay edit save is in progress");
      return saveCandidate(failedCandidate);
    },
    cancel(): TwoBayConfiguration {
      if (baseline === null || draft === null) {
        throw new Error("two-bay edit session is not active");
      }
      const restored = cloneTwoBayConfiguration(baseline);
      baseline = null;
      draft = null;
      failedCandidate = null;
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
