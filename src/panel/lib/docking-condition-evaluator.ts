import type {
  ChipDefinitionRegistry,
  ChipSharedState,
} from "./chip-contract.js";
import type { DockingChipApplicationEntry } from "./docking-chip-application-order.js";

export type DockingConditionFailureReason =
  | "unknown-definition"
  | "definition-mismatch"
  | "clone-failed"
  | "apply-threw"
  | "invalid-result"
  | "invalid-standard-state";

export interface DockingConditionFailure {
  readonly instanceId: string;
  readonly chipType: string;
  readonly reason: DockingConditionFailureReason;
}

export interface DockingConditionEvaluation {
  readonly state: ChipSharedState;
  readonly failures: DockingConditionFailure[];
}

interface DockingConditionEvaluationOptions {
  readonly validateCandidate?: (candidate: ChipSharedState) => boolean;
}

/** conditionを1件ずつ原子的に評価し、失敗したチップを除いて後続を継続する。 */
export function evaluateDockingConditions(
  initialState: ChipSharedState,
  sequence: readonly DockingChipApplicationEntry[],
  definitions: ChipDefinitionRegistry,
  options: DockingConditionEvaluationOptions = {},
): DockingConditionEvaluation {
  let state = initialState;
  const failures: DockingConditionFailure[] = [];

  for (const instance of sequence) {
    const definition = definitions.get(instance.chipType);
    if (definition === undefined) {
      failures.push(failure(instance, "unknown-definition"));
      continue;
    }
    if (definition.chipType !== instance.chipType) {
      failures.push(failure(instance, "definition-mismatch"));
      continue;
    }
    if (definition.kind !== "condition") continue;

    let stateClone: ChipSharedState;
    let settingsClone: typeof instance.settings;
    try {
      stateClone = structuredClone(state);
      settingsClone = structuredClone(instance.settings);
    } catch {
      failures.push(failure(instance, "clone-failed"));
      continue;
    }

    let candidate: ChipSharedState;
    try {
      candidate = definition.apply(stateClone, settingsClone);
    } catch {
      failures.push(failure(instance, "apply-threw"));
      continue;
    }
    if (!isSharedState(candidate)) {
      failures.push(failure(instance, "invalid-result"));
      continue;
    }
    if (options.validateCandidate !== undefined && !options.validateCandidate(candidate)) {
      failures.push(failure(instance, "invalid-standard-state"));
      continue;
    }
    state = candidate;
  }

  return { state, failures };
}

/** 評価対象の識別情報を失敗理由と組み合わせる。 */
function failure(
  instance: Pick<DockingChipApplicationEntry, "instanceId" | "chipType">,
  reason: DockingConditionFailureReason,
): DockingConditionFailure {
  return { instanceId: instance.instanceId, chipType: instance.chipType, reason };
}

/** conditionの戻り値が共有状態として扱えるプレーンなオブジェクトか判定する。 */
function isSharedState(value: unknown): value is ChipSharedState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
