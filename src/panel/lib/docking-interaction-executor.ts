import type {
  ChipActionContext,
  ChipDefinition,
  ChipDefinitionRegistry,
  ChipInstanceConfiguration,
  ChipSharedState,
} from "./chip-contract.js";
import {
  isValidDockingSharedState,
} from "./docking-shared-state.js";
import type { DockingSharedState } from "./docking-shared-state.js";

export type DockingInteractionFailureReason =
  | "unknown-definition"
  | "definition-mismatch"
  | "kind-mismatch"
  | "clone-failed"
  | "execution-threw"
  | "invalid-standard-state";

export interface DockingInteractionFailure {
  readonly instanceId: string;
  readonly chipType: string;
  readonly reason: DockingInteractionFailureReason;
}

export type DockingControlReadResult =
  | { readonly ok: true; readonly value: unknown }
  | DockingInteractionFailedResult;

export type DockingControlUpdateResult =
  | { readonly ok: true; readonly state: DockingSharedState }
  | DockingInteractionFailedResult;

export type DockingActionResult =
  | { readonly ok: true }
  | DockingInteractionFailedResult;

interface DockingInteractionFailedResult {
  readonly ok: false;
  readonly failure: DockingInteractionFailure;
}

export interface DockingInteractionExecutor {
  getState(): DockingSharedState;
  readControl(instance: ChipInstanceConfiguration): DockingControlReadResult;
  updateControl(instance: ChipInstanceConfiguration, value: unknown): DockingControlUpdateResult;
  executeAction(
    instance: ChipInstanceConfiguration,
    context?: ChipActionContext,
  ): Promise<DockingActionResult>;
}

/** 任意のcontrol/action定義を検証済み共有状態に対して安全に実行する。 */
export function createDockingInteractionExecutor(
  initialState: DockingSharedState,
  definitions: ChipDefinitionRegistry,
): DockingInteractionExecutor {
  const activeLayoutId = initialState.activeLayoutId;
  if (!isValidDockingSharedState(initialState, activeLayoutId)) {
    throw new TypeError("invalid Docking shared state");
  }
  let state = structuredClone(initialState);

  return {
    getState(): DockingSharedState {
      return structuredClone(state);
    },
    readControl(instance): DockingControlReadResult {
      const resolved = resolveDefinition(instance, definitions, "control");
      if ("failure" in resolved) return resolved;

      let stateClone: ChipSharedState;
      let settingsClone: typeof instance.settings;
      try {
        stateClone = structuredClone(state);
        settingsClone = structuredClone(instance.settings);
      } catch {
        return failed(instance, "clone-failed");
      }
      try {
        return { ok: true, value: structuredClone(resolved.definition.read(stateClone, settingsClone)) };
      } catch (error) {
        return failed(instance, isCloneError(error) ? "clone-failed" : "execution-threw");
      }
    },
    updateControl(instance, value): DockingControlUpdateResult {
      const resolved = resolveDefinition(instance, definitions, "control");
      if ("failure" in resolved) return resolved;

      let stateClone: ChipSharedState;
      let settingsClone: typeof instance.settings;
      let valueClone: unknown;
      try {
        stateClone = structuredClone(state);
        settingsClone = structuredClone(instance.settings);
        valueClone = structuredClone(value);
      } catch {
        return failed(instance, "clone-failed");
      }

      let candidate: ChipSharedState;
      try {
        candidate = resolved.definition.update(stateClone, valueClone, settingsClone);
      } catch {
        return failed(instance, "execution-threw");
      }
      if (!isRecord(candidate) || !isValidDockingSharedState(candidate, activeLayoutId)) {
        return failed(instance, "invalid-standard-state");
      }
      try {
        state = structuredClone(candidate) as DockingSharedState;
        return { ok: true, state: structuredClone(state) };
      } catch {
        return failed(instance, "clone-failed");
      }
    },
    async executeAction(instance, context = {}): Promise<DockingActionResult> {
      const resolved = resolveDefinition(instance, definitions, "action");
      if ("failure" in resolved) return resolved;

      let actionContext: ChipActionContext;
      let settingsClone: typeof instance.settings;
      try {
        actionContext = { ...structuredClone(context), state: structuredClone(state) };
        settingsClone = structuredClone(instance.settings);
      } catch {
        return failed(instance, "clone-failed");
      }
      try {
        await resolved.definition.execute(actionContext, settingsClone);
        return { ok: true };
      } catch {
        return failed(instance, "execution-threw");
      }
    },
  };
}

/** 登録定義の存在、識別子、要求kindを順に検証する。 */
function resolveDefinition<K extends "control" | "action">(
  instance: ChipInstanceConfiguration,
  definitions: ChipDefinitionRegistry,
  kind: K,
): { readonly definition: DefinitionForKind<K> }
  | DockingInteractionFailedResult {
  const definition = definitions.get(instance.chipType);
  if (definition === undefined) return failed(instance, "unknown-definition");
  if (definition.chipType !== instance.chipType) return failed(instance, "definition-mismatch");
  if (definition.kind !== kind) return failed(instance, "kind-mismatch");
  return { definition: definition as DefinitionForKind<K> };
}

type DefinitionForKind<K extends "control" | "action"> = Extract<
  ChipDefinition,
  { readonly kind: K }
>;

/** interaction失敗を対象チップの識別情報とともに返す。 */
function failed(
  instance: Pick<ChipInstanceConfiguration, "instanceId" | "chipType">,
  reason: DockingInteractionFailureReason,
): DockingInteractionFailedResult {
  return {
    ok: false,
    failure: { instanceId: instance.instanceId, chipType: instance.chipType, reason },
  };
}

/** 標準状態検証へ渡せる非配列オブジェクトか判定する。 */
function isRecord(value: unknown): value is ChipSharedState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** structuredCloneが返したDOMExceptionだけをclone失敗として識別する。 */
function isCloneError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "DataCloneError";
}
