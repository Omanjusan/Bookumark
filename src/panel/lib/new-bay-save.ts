import { createNewBayDraft } from "./bay-management.js";
import type { NewBayDraft } from "./bay-management.js";
import { issueBayId } from "./docking-persistence-model.js";
import type {
  BayConfiguration,
  BayConfigurationsDocument,
  MainLayoutsDocument,
  RailId,
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

/** 編集済みの一時ベイを正式IDへ置換し、チップを含む2文書を原子的に保存する。 */
export async function saveNewBayConfiguration(
  documents: NewBaySaveDocuments,
  temporaryBayConfigurations: BayConfigurationsDocument,
  temporaryBayId: string,
  activeLayoutId: string,
  targetRail: RailId,
  options: NewBaySaveOptions = {},
): Promise<NewBaySaveResult> {
  const activeLayout = documents.mainLayouts.layouts.find(({ id }) => id === activeLayoutId);
  if (activeLayout === undefined) {
    throw new Error(`active layout was not found: ${activeLayoutId}`);
  }
  const temporaryBay = temporaryBayConfigurations.bays.find(({ id }) => id === temporaryBayId);
  if (temporaryBay === undefined) {
    throw new Error(`temporary bay was not found: ${temporaryBayId}`);
  }
  if (temporaryBay.permanent) throw new Error("temporary bay must not be permanent");
  if (documents.bayConfigurations.bays.some(({ name }) => name === temporaryBay.name)) {
    throw new Error(`bay name already exists: ${temporaryBay.name}`);
  }

  const issued = issueBayId(documents.bayConfigurations.nextBaySequence);
  const bay = structuredClone(temporaryBay);
  bay.id = issued.id;
  const candidate: NewBaySaveDocuments = {
    bayConfigurations: structuredClone(temporaryBayConfigurations),
    mainLayouts: structuredClone(documents.mainLayouts),
  };
  const temporaryIndex = candidate.bayConfigurations.bays.findIndex(
    ({ id }) => id === temporaryBayId,
  );
  candidate.bayConfigurations.bays[temporaryIndex] = structuredClone(bay);
  candidate.bayConfigurations.nextBaySequence = issued.nextSequence;
  placeNewBay(candidate.mainLayouts, activeLayoutId, issued.id, targetRail);

  const persist = options.saveDocuments
    ?? ((patch: NewBaySaveDocuments) => saveDockingDocuments(patch));
  await persist(structuredClone(candidate));
  return { bay: structuredClone(bay), documents: structuredClone(candidate) };
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

  placeNewBay(candidate.mainLayouts, activeLayoutId, issued.id, "top");

  const persist = options.saveDocuments
    ?? ((patch: NewBaySaveDocuments) => saveDockingDocuments(patch));
  await persist(structuredClone(candidate));
  return {
    bay: structuredClone(bay),
    documents: structuredClone(candidate),
  };
}

/** 非デフォルトのactiveレイアウトで、新規ベイを上レールの内側末尾へ配置する。 */
function placeNewBay(
  mainLayouts: MainLayoutsDocument,
  activeLayoutId: string,
  bayId: string,
  rail: RailId,
): void {
  const target = mainLayouts.layouts.find((layout) => layout.id === activeLayoutId);
  if (target === undefined) throw new Error(`active layout was not found: ${activeLayoutId}`);
  if (target.systemDefault) return;
  const lastTopOrder = target.placements
    .filter((placement) => placement.rail === rail)
    .reduce((maximum, placement) => Math.max(maximum, placement.order), 0);
  target.placements.push({ bayId, rail, order: lastTopOrder + 1 });
}
