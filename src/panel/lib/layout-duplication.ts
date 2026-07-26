import type {
  LayoutConfiguration,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";
import { issueNamedLayoutIdentity } from "./layout-management.js";

export interface SharedBayLayoutDuplicationResult {
  readonly document: MainLayoutsDocument;
  readonly layout: LayoutConfiguration;
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
