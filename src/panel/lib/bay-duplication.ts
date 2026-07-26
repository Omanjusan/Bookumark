import { planBayDuplication } from "./bay-management.js";
import type { BayDuplicationPlan } from "./bay-management.js";
import { issueBayId, issueChipId } from "./docking-persistence-model.js";
import type { BayConfiguration } from "./docking-persistence-model.js";
import { saveDockingDocuments } from "./docking-storage.js";
import type { NewBaySaveDocuments, NewBaySaveResult } from "./new-bay-save.js";

interface BayDuplicationOptions {
  readonly saveDocuments?: (documents: NewBaySaveDocuments) => Promise<void>;
}

export interface BayDuplicationSession {
  readonly pending: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  plan(): BayDuplicationPlan;
  undo(): boolean;
  redo(): boolean;
  save(): Promise<NewBaySaveResult>;
}

/** 1ユーザーベイの複製予定、履歴、複数文書保存を管理する。 */
export function createBayDuplicationSession(
  documents: NewBaySaveDocuments,
  sourceBayId: string,
  activeLayoutId: string,
  options: BayDuplicationOptions = {},
): BayDuplicationSession {
  const baseDocuments = structuredClone(documents);
  const source = baseDocuments.bayConfigurations.bays.find((bay) => bay.id === sourceBayId);
  if (source === undefined) throw new Error(`source bay was not found: ${sourceBayId}`);
  const duplicationPlan = planBayDuplication(
    source,
    baseDocuments.bayConfigurations.bays.map((bay) => bay.name),
  );
  let pending = false;
  let redoAvailable = false;

  /** 複製を保存前の予定状態にし、既存予定では同じ値を返す。 */
  const plan = (): BayDuplicationPlan => {
    if (!pending) {
      pending = true;
      redoAvailable = false;
    }
    return structuredClone(duplicationPlan);
  };

  /** 未保存の複製予定を取り消す。 */
  const undo = (): boolean => {
    if (!pending) return false;
    pending = false;
    redoAvailable = true;
    return true;
  };

  /** 取り消した複製予定を復元する。 */
  const redo = (): boolean => {
    if (!redoAvailable) return false;
    pending = true;
    redoAvailable = false;
    return true;
  };

  /** 予定中の複製へ正式IDを発行し、ベイ・レイアウト文書を保存する。 */
  const save = async (): Promise<NewBaySaveResult> => {
    if (!pending) throw new Error("duplicate is not pending");
    const activeLayout = baseDocuments.mainLayouts.layouts.find(
      (layout) => layout.id === activeLayoutId,
    );
    if (activeLayout === undefined) {
      throw new Error(`active layout was not found: ${activeLayoutId}`);
    }

    const issuedBay = issueBayId(baseDocuments.bayConfigurations.nextBaySequence);
    let nextChipSequence = baseDocuments.bayConfigurations.nextChipSequence;
    const chips = duplicationPlan.chips.map((chip) => {
      const issuedChip = issueChipId(nextChipSequence);
      nextChipSequence = issuedChip.nextSequence;
      return {
        instanceId: issuedChip.id,
        chipType: chip.chipType,
        order: chip.order,
        settings: structuredClone(chip.settings),
      };
    });
    const bay: BayConfiguration = {
      id: issuedBay.id,
      name: duplicationPlan.name,
      permanent: false,
      chips,
    };
    const candidate = structuredClone(baseDocuments);
    candidate.bayConfigurations.bays.push(structuredClone(bay));
    candidate.bayConfigurations.nextBaySequence = issuedBay.nextSequence;
    candidate.bayConfigurations.nextChipSequence = nextChipSequence;

    if (!activeLayout.systemDefault) {
      const target = candidate.mainLayouts.layouts.find((layout) => layout.id === activeLayoutId);
      if (target === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);
      const lastTopOrder = target.placements
        .filter((placement) => placement.rail === "top")
        .reduce((maximum, placement) => Math.max(maximum, placement.order), 0);
      target.placements.push({ bayId: bay.id, rail: "top", order: lastTopOrder + 1 });
    }

    const persist = options.saveDocuments
      ?? ((patch: NewBaySaveDocuments) => saveDockingDocuments(patch));
    await persist(structuredClone(candidate));
    pending = false;
    redoAvailable = false;
    return { bay: structuredClone(bay), documents: structuredClone(candidate) };
  };

  return {
    get pending(): boolean { return pending; },
    get canUndo(): boolean { return pending; },
    get canRedo(): boolean { return redoAvailable; },
    plan,
    undo,
    redo,
    save,
  };
}
