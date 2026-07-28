import type { ChipDefinitionRegistry } from "./chip-contract.js";
import {
  buildDockingChipApplicationOrder,
} from "./docking-chip-application-order.js";
import type { DockingConditionFailure } from "./docking-condition-evaluator.js";
import {
  loadNormalizedDockingDocuments,
} from "./docking-documents-normalization.js";
import {
  createInternalDefaultDockingDocuments,
} from "./docking-internal-defaults.js";
import type { DockingDocuments } from "./docking-persistence-model.js";
import {
  createDefaultDockingSharedState,
  evaluateDockingSharedStateConditions,
} from "./docking-shared-state.js";
import type { DockingSharedState } from "./docking-shared-state.js";

export interface DockingSaveReevaluationWarning {
  readonly reason: "storage-reload-failed";
}

export interface DockingSaveReevaluationResult {
  readonly documents: DockingDocuments;
  readonly state: DockingSharedState;
  readonly warnings: DockingSaveReevaluationWarning[];
  readonly conditionFailures: DockingConditionFailure[];
}

interface DockingSaveReevaluationSessionOptions {
  readonly reloadDocuments?: () => Promise<DockingDocuments>;
}

export interface DockingSaveReevaluationSession {
  readonly running: boolean;
  getState(): DockingSharedState;
  getDocuments(): DockingDocuments;
  run(saveRequest: () => Promise<DockingDocuments>): Promise<DockingSaveReevaluationResult>;
}

/** 保存成功後だけ一時状態をリセットし、保存済み文書を再読込・再評価する。 */
export function createDockingSaveReevaluationSession(
  initialState: DockingSharedState,
  definitions: ChipDefinitionRegistry,
  options: DockingSaveReevaluationSessionOptions = {},
): DockingSaveReevaluationSession {
  let state = structuredClone(initialState);
  let documents: DockingDocuments | null = null;
  let running = false;

  return {
    get running(): boolean { return running; },
    getState(): DockingSharedState {
      return structuredClone(state);
    },
    getDocuments(): DockingDocuments {
      if (documents === null) throw new Error("save reevaluation has not completed");
      return structuredClone(documents);
    },
    async run(saveRequest): Promise<DockingSaveReevaluationResult> {
      if (running) throw new Error("save reevaluation is already running");
      running = true;
      try {
        // await直後にcloneし、保存アダプターや呼出元から確定候補を分離する。
        const savedCandidate = structuredClone(await saveRequest());
        const warnings: DockingSaveReevaluationWarning[] = [];
        let evaluationDocuments: DockingDocuments;
        try {
          evaluationDocuments = structuredClone(await (options.reloadDocuments ?? reloadDocuments)());
        } catch {
          evaluationDocuments = structuredClone(savedCandidate);
          warnings.push({ reason: "storage-reload-failed" });
        }

        const initial = createDefaultDockingSharedState(
          evaluationDocuments.dockingMetadata.activeLayoutId,
        );
        const sequence = buildDockingChipApplicationOrder(evaluationDocuments);
        const evaluation = evaluateDockingSharedStateConditions(initial, sequence, definitions);
        state = structuredClone(evaluation.state) as DockingSharedState;
        documents = structuredClone(evaluationDocuments);

        return {
          documents: structuredClone(documents),
          state: structuredClone(state),
          warnings: structuredClone(warnings),
          conditionFailures: structuredClone(evaluation.failures),
        };
      } finally {
        running = false;
      }
    },
  };
}

/** 通常起動と同じ正常化境界を使ってstorageのDocking文書を再読込する。 */
async function reloadDocuments(): Promise<DockingDocuments> {
  const result = await loadNormalizedDockingDocuments(createInternalDefaultDockingDocuments());
  return result.documents;
}
