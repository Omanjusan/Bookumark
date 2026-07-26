import type {
  BayConfigurationsDocument,
  LayoutConfiguration,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";
import { issueNamedLayoutIdentity } from "./layout-management.js";

export interface BlankLayoutCreationResult {
  readonly document: MainLayoutsDocument;
  readonly layout: LayoutConfiguration;
}

/** 固定ベイだけを上レールへ置いた、新しい名前付きレイアウト候補を生成する。 */
export function createBlankNamedLayout(
  layouts: MainLayoutsDocument,
  bays: BayConfigurationsDocument,
  requestedName: string,
): BlankLayoutCreationResult {
  const permanentBays = bays.bays.filter((bay) => bay.permanent);
  if (permanentBays.length !== 1) {
    throw new Error("exactly one permanent bay is required");
  }

  const identity = issueNamedLayoutIdentity(
    layouts.nextLayoutSequence,
    requestedName,
    layouts.layouts.map((layout) => layout.name),
  );
  const layout: LayoutConfiguration = {
    id: identity.id,
    name: identity.name,
    systemDefault: false,
    placements: [{ bayId: permanentBays[0].id, rail: "top", order: 1 }],
  };
  const document = structuredClone(layouts);
  document.nextLayoutSequence = identity.nextLayoutSequence;
  document.layouts.push(structuredClone(layout));
  return { document, layout: structuredClone(layout) };
}
