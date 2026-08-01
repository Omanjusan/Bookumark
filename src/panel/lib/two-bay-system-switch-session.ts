import {
  cloneTwoBayConfiguration,
} from "./two-bay-persistence-model.js";
import type {
  TwoBayConfiguration,
  TwoBayId,
} from "./two-bay-persistence-model.js";
import { saveTwoBayConfiguration } from "./two-bay-storage.js";

interface TwoBaySystemSwitchSessionOptions {
  readonly save?: (configuration: TwoBayConfiguration) => Promise<void>;
}

export interface TwoBaySystemSwitchSession {
  readonly pending: boolean;
  readonly saving: boolean;
  switchTo(systemBay: TwoBayId): Promise<TwoBayConfiguration>;
  retry(): Promise<TwoBayConfiguration>;
  cancel(): TwoBayConfiguration;
  committed(): TwoBayConfiguration;
  candidate(): TwoBayConfiguration | null;
}

/** systemベイ切り替え候補を保存成功後だけ正本へ昇格するセッションを生成する。 */
export function createTwoBaySystemSwitchSession(
  initial: TwoBayConfiguration,
  options: TwoBaySystemSwitchSessionOptions = {},
): TwoBaySystemSwitchSession {
  let committed = cloneTwoBayConfiguration(initial);
  let candidate: TwoBayConfiguration | null = null;
  let saving = false;
  const persist = options.save ?? saveTwoBayConfiguration;

  /** 指定ベイをsystem化し、0行なら1行へ戻した候補を直ちに保存する。 */
  const switchTo = (systemBay: TwoBayId): Promise<TwoBayConfiguration> => {
    if (candidate !== null) throw new Error("system switch retry is pending");
    if (saving) throw new Error("system switch save is in progress");
    if (systemBay === committed.systemBay) {
      return Promise.resolve(cloneTwoBayConfiguration(committed));
    }
    candidate = cloneTwoBayConfiguration(committed);
    candidate.systemBay = systemBay;
    if (candidate.bays[systemBay].visibleRows === 0) {
      candidate.bays[systemBay].visibleRows = 1;
    }
    return saveCandidate();
  };

  /** 保存失敗後に固定された同一候補を再保存する。 */
  const retry = (): Promise<TwoBayConfiguration> => {
    if (candidate === null) throw new Error("system switch retry is not pending");
    if (saving) throw new Error("system switch save is in progress");
    return saveCandidate();
  };

  /** 現在候補を保存し、成功時だけ正本へ昇格する。 */
  async function saveCandidate(): Promise<TwoBayConfiguration> {
    if (candidate === null) throw new Error("system switch candidate is required");
    const savingCandidate = cloneTwoBayConfiguration(candidate);
    saving = true;
    try {
      await persist(cloneTwoBayConfiguration(savingCandidate));
      committed = savingCandidate;
      candidate = null;
      return cloneTwoBayConfiguration(committed);
    } finally {
      saving = false;
    }
  }

  return {
    get pending(): boolean { return candidate !== null; },
    get saving(): boolean { return saving; },
    switchTo,
    retry,
    cancel(): TwoBayConfiguration {
      if (saving) throw new Error("system switch save is in progress");
      candidate = null;
      return cloneTwoBayConfiguration(committed);
    },
    committed: (): TwoBayConfiguration => cloneTwoBayConfiguration(committed),
    candidate: (): TwoBayConfiguration | null => candidate === null
      ? null
      : cloneTwoBayConfiguration(candidate),
  };
}
