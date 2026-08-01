import {
  cloneTwoBayConfiguration,
  createInitialTwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import type { TwoBayConfiguration } from "./two-bay-persistence-model.js";
import { saveTwoBayConfiguration } from "./two-bay-storage.js";

interface TwoBayResetSessionOptions {
  readonly save?: (configuration: TwoBayConfiguration) => Promise<void>;
}

export interface TwoBayResetSession {
  readonly active: boolean;
  readonly pending: boolean;
  readonly saving: boolean;
  prepare(configuration: TwoBayConfiguration): TwoBayConfiguration;
  confirm(): Promise<TwoBayConfiguration>;
  retry(): Promise<TwoBayConfiguration>;
  cancel(): TwoBayConfiguration;
  candidate(): TwoBayConfiguration | null;
}

/** 初期化前の正本と、保存失敗時にも固定する初期値候補を管理する。 */
export function createTwoBayResetSession(
  options: TwoBayResetSessionOptions = {},
): TwoBayResetSession {
  let baseline: TwoBayConfiguration | null = null;
  let resetCandidate: TwoBayConfiguration | null = null;
  let failed = false;
  let saving = false;
  const persist = options.save ?? saveTwoBayConfiguration;

  /** 固定した初期値候補を保存し、成功時だけ初期化状態を終了する。 */
  const saveCandidate = async (): Promise<TwoBayConfiguration> => {
    if (resetCandidate === null) throw new Error("two-bay reset candidate is required");
    const savingCandidate = cloneTwoBayConfiguration(resetCandidate);
    saving = true;
    try {
      await persist(cloneTwoBayConfiguration(savingCandidate));
      baseline = null;
      resetCandidate = null;
      failed = false;
      return cloneTwoBayConfiguration(savingCandidate);
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      saving = false;
    }
  };

  return {
    get active(): boolean { return resetCandidate !== null; },
    get pending(): boolean { return failed; },
    get saving(): boolean { return saving; },
    prepare(configuration): TwoBayConfiguration {
      if (resetCandidate !== null) throw new Error("two-bay reset is already active");
      baseline = cloneTwoBayConfiguration(configuration);
      resetCandidate = createInitialTwoBayConfiguration();
      failed = false;
      return cloneTwoBayConfiguration(resetCandidate);
    },
    confirm(): Promise<TwoBayConfiguration> {
      if (resetCandidate === null) throw new Error("two-bay reset is not active");
      if (failed) throw new Error("two-bay reset retry is pending");
      if (saving) throw new Error("two-bay reset save is in progress");
      return saveCandidate();
    },
    retry(): Promise<TwoBayConfiguration> {
      if (!failed || resetCandidate === null) {
        throw new Error("two-bay reset retry is not pending");
      }
      if (saving) throw new Error("two-bay reset save is in progress");
      return saveCandidate();
    },
    cancel(): TwoBayConfiguration {
      if (baseline === null || resetCandidate === null) {
        throw new Error("two-bay reset is not active");
      }
      if (saving) throw new Error("two-bay reset save is in progress");
      const restored = cloneTwoBayConfiguration(baseline);
      baseline = null;
      resetCandidate = null;
      failed = false;
      return restored;
    },
    candidate: (): TwoBayConfiguration | null => resetCandidate === null
      ? null
      : cloneTwoBayConfiguration(resetCandidate),
  };
}
