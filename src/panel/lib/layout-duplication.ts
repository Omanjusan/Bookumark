import type {
  BayConfiguration,
  BayConfigurationsDocument,
  LayoutConfiguration,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";
import { issueBayId, issueChipId } from "./docking-persistence-model.js";
import { issueNamedLayoutIdentity } from "./layout-management.js";

export interface SharedBayLayoutDuplicationResult {
  readonly document: MainLayoutsDocument;
  readonly layout: LayoutConfiguration;
}

export interface IndependentBayLayoutDuplicationResult {
  readonly mainLayouts: MainLayoutsDocument;
  readonly bayConfigurations: BayConfigurationsDocument;
  readonly layout: LayoutConfiguration;
  readonly duplicatedBayIds: string[];
}

/** 複製元と同じベイIDを参照する、新しい名前付きレイアウト候補を生成する。 */
export function duplicateLayoutWithSharedBays(
  layouts: MainLayoutsDocument,
  sourceLayoutId: string,
  requestedName: string,
): SharedBayLayoutDuplicationResult {
  const source = layouts.layouts.find((layout) => layout.id === sourceLayoutId);
  if (!source) throw new Error(`layout source was not found: ${sourceLayoutId}`);

  const identity = issueNamedLayoutIdentity(
    layouts.nextLayoutSequence,
    requestedName,
    layouts.layouts.map((layout) => layout.name),
  );
  const layout: LayoutConfiguration = {
    id: identity.id,
    name: identity.name,
    systemDefault: false,
    placements: structuredClone(source.placements),
  };
  const document = structuredClone(layouts);
  document.nextLayoutSequence = identity.nextLayoutSequence;
  document.layouts.push(structuredClone(layout));
  return { document, layout: structuredClone(layout) };
}

/** 配置済みユーザーベイを新IDで複製し、固定ベイだけを共有するレイアウト候補を生成する。 */
export function duplicateLayoutWithIndependentBays(
  layouts: MainLayoutsDocument,
  bays: BayConfigurationsDocument,
  sourceLayoutId: string,
  requestedName: string,
): IndependentBayLayoutDuplicationResult {
  const source = layouts.layouts.find((layout) => layout.id === sourceLayoutId);
  if (!source) throw new Error(`layout source was not found: ${sourceLayoutId}`);

  const baysById = new Map(bays.bays.map((bay) => [bay.id, bay]));
  for (const placement of source.placements) {
    if (!baysById.has(placement.bayId)) {
      throw new Error(`placed bay was not found: ${placement.bayId}`);
    }
  }

  const identity = issueNamedLayoutIdentity(
    layouts.nextLayoutSequence,
    requestedName,
    layouts.layouts.map((layout) => layout.name),
  );
  let nextBaySequence = bays.nextBaySequence;
  let nextChipSequence = bays.nextChipSequence;
  const duplicatedBySourceId = new Map<string, BayConfiguration>();
  const duplicatedBays: BayConfiguration[] = [];

  for (const placement of source.placements) {
    const sourceBay = baysById.get(placement.bayId)!;
    if (sourceBay.permanent || duplicatedBySourceId.has(sourceBay.id)) continue;

    const issuedBay = issueBayId(nextBaySequence);
    nextBaySequence = issuedBay.nextSequence;
    const duplicate: BayConfiguration = {
      id: issuedBay.id,
      name: sourceBay.name,
      permanent: false,
      chips: sourceBay.chips.map((chip) => {
        const issuedChip = issueChipId(nextChipSequence);
        nextChipSequence = issuedChip.nextSequence;
        return {
          instanceId: issuedChip.id,
          chipType: chip.chipType,
          order: chip.order,
          settings: structuredClone(chip.settings),
        };
      }),
    };
    duplicatedBySourceId.set(sourceBay.id, duplicate);
    duplicatedBays.push(duplicate);
  }

  const layout: LayoutConfiguration = {
    id: identity.id,
    name: identity.name,
    systemDefault: false,
    placements: source.placements.map((placement) => ({
      ...placement,
      bayId: duplicatedBySourceId.get(placement.bayId)?.id ?? placement.bayId,
    })),
  };
  const mainLayouts = structuredClone(layouts);
  mainLayouts.nextLayoutSequence = identity.nextLayoutSequence;
  mainLayouts.layouts.push(structuredClone(layout));
  const bayConfigurations = structuredClone(bays);
  bayConfigurations.nextBaySequence = nextBaySequence;
  bayConfigurations.nextChipSequence = nextChipSequence;
  bayConfigurations.bays.push(...structuredClone(duplicatedBays));

  return {
    mainLayouts,
    bayConfigurations,
    layout: structuredClone(layout),
    duplicatedBayIds: duplicatedBays.map((bay) => bay.id),
  };
}
