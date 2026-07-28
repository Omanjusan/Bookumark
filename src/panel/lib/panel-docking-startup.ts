import type { DockingChipCatalog } from "./docking-chip-catalog.js";
import type { DockingDocumentsNormalizationResult } from "./docking-documents-normalization.js";
import {
  createDeprecatedChipRemovalSession,
} from "./docking-deprecated-chip-removal-session.js";
import type { DeprecatedChipSummary } from "./docking-deprecated-chip-removal-session.js";
import {
  createDockingRecoverySaveSession,
} from "./docking-recovery-save-session.js";
import type { DockingRecoverySnapshot } from "./docking-recovery-save-session.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

interface PanelDockingStartupOptions {
  readonly saveDocuments: (documents: Partial<DockingDocuments>) => Promise<void>;
  readonly presentRecovery: (
    snapshot: DockingRecoverySnapshot,
    save: () => Promise<void>,
  ) => Promise<void>;
  readonly presentDeprecated: (
    summary: DeprecatedChipSummary[],
    confirmAndSave: () => Promise<void>,
  ) => Promise<void>;
  readonly startRuntime: (documents: DockingDocuments) => void;
}

/** 復旧、廃止確認、通常runtimeを保存ゲート付きの固定順序で起動する。 */
export async function runPanelDockingStartup(
  normalization: DockingDocumentsNormalizationResult,
  catalog: DockingChipCatalog,
  options: PanelDockingStartupOptions,
): Promise<DockingDocuments> {
  const recovery = createDockingRecoverySaveSession(normalization, catalog, {
    saveDocuments: options.saveDocuments,
  });
  let documents = recovery.candidateDocuments();
  if (recovery.pending) {
    await options.presentRecovery(recovery.recoverySnapshot(), async () => {
      documents = await recovery.save();
    });
    if (!recovery.ready) throw new Error("recovery dialog completed before persistence");
  }

  const deprecated = createDeprecatedChipRemovalSession(documents, catalog, {
    saveBayConfigurations: async (bayConfigurations) => {
      await options.saveDocuments({ bayConfigurations });
    },
  });
  if (deprecated.pending) {
    await options.presentDeprecated(deprecated.summary(), async () => {
      documents = await deprecated.confirmAndSave();
    });
    if (!deprecated.ready) throw new Error("deprecated dialog completed before persistence");
  }

  options.startRuntime(structuredClone(documents));
  return structuredClone(documents);
}
