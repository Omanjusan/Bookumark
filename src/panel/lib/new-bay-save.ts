import { createNewBayDraft } from "./bay-management.js";
import type { NewBayDraft } from "./bay-management.js";
import { issueBayId } from "./docking-persistence-model.js";
import type {
  BayConfiguration,
  BayConfigurationsDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";
import { saveDockingDocuments } from "./docking-storage.js";

export interface NewBaySaveDocuments {
  readonly bayConfigurations: BayConfigurationsDocument;
  readonly mainLayouts: MainLayoutsDocument;
}

interface NewBaySaveOptions {
  readonly saveDocuments?: (documents: NewBaySaveDocuments) => Promise<void>;
}

export interface NewBaySaveResult {
  readonly bay: BayConfiguration;
  readonly documents: NewBaySaveDocuments;
}

/** 一時ベイへ正式IDを発行し、ベイ・レイアウト文書を1回で保存する。 */
export async function saveNewBay(
  documents: NewBaySaveDocuments,
  draft: NewBayDraft,
  activeLayoutId: string,
  options: NewBaySaveOptions = {},
): Promise<NewBaySaveResult> {
  const validatedDraft = createNewBayDraft(draft.temporaryId, draft.name);
  const activeLayout = documents.mainLayouts.layouts.find(
    (layout) => layout.id === activeLayoutId,
  );
  if (activeLayout === undefined) {
    throw new Error(`active layout was not found: ${activeLayoutId}`);
  }

  const issued = issueBayId(documents.bayConfigurations.nextBaySequence);
  const bay: BayConfiguration = {
    id: issued.id,
    name: validatedDraft.name,
    permanent: false,
    chips: [],
  };
  const candidate: NewBaySaveDocuments = structuredClone(documents);
  candidate.bayConfigurations.bays.push(structuredClone(bay));
  candidate.bayConfigurations.nextBaySequence = issued.nextSequence;

  if (!activeLayout.systemDefault) {
    const target = candidate.mainLayouts.layouts.find((layout) => layout.id === activeLayoutId);
    if (target === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);
    const lastTopOrder = target.placements
      .filter((placement) => placement.rail === "top")
      .reduce((maximum, placement) => Math.max(maximum, placement.order), 0);
    target.placements.push({ bayId: issued.id, rail: "top", order: lastTopOrder + 1 });
  }

  const persist = options.saveDocuments
    ?? ((patch: NewBaySaveDocuments) => saveDockingDocuments(patch));
  await persist(structuredClone(candidate));
  return {
    bay: structuredClone(bay),
    documents: structuredClone(candidate),
  };
}
