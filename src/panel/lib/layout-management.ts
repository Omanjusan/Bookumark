import { issueLayoutId } from "./docking-persistence-model.js";
import type {
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

export interface NamedLayoutIdentity {
  readonly id: string;
  readonly name: string;
  readonly nextLayoutSequence: number;
}

const NUMBERED_NAME_PATTERN = /^(.*) \(([2-9]|[1-9]\d+)\)$/;

/** 入力名を検証し、重複時は空いている最小の括弧付き連番名を返す。 */
export function resolveUniqueLayoutName(
  requestedName: string,
  existingNames: readonly string[],
): string {
  const name = requestedName.trim();
  if (name === "") throw new TypeError("layout name must not be empty");

  const usedNames = new Set(existingNames);
  if (!usedNames.has(name)) return name;

  const baseName = NUMBERED_NAME_PATTERN.exec(name)?.[1] ?? name;
  let suffix = 2;
  while (usedNames.has(`${baseName} (${suffix})`)) suffix += 1;
  return `${baseName} (${suffix})`;
}

/** レイアウトIDを発行し、同時に保存可能な一意名を確定する。 */
export function issueNamedLayoutIdentity(
  nextLayoutSequence: number,
  requestedName: string,
  existingNames: readonly string[],
): NamedLayoutIdentity {
  const issued = issueLayoutId(nextLayoutSequence);
  return {
    id: issued.id,
    name: resolveUniqueLayoutName(requestedName, existingNames),
    nextLayoutSequence: issued.nextSequence,
  };
}

/** ユーザー管理可能なレイアウトを、他レイアウトと重複しない名前へ変更する。 */
export function renameNamedLayout(
  layouts: MainLayoutsDocument,
  layoutId: string,
  requestedName: string,
): MainLayoutsDocument {
  const target = layouts.layouts.find((layout) => layout.id === layoutId);
  if (!target) throw new Error(`layout was not found: ${layoutId}`);
  if (target.systemDefault) throw new Error("system default layout cannot be renamed");

  const document = structuredClone(layouts);
  const renamed = document.layouts.find((layout) => layout.id === layoutId)!;
  renamed.name = resolveUniqueLayoutName(
    requestedName,
    layouts.layouts.filter((layout) => layout.id !== layoutId).map((layout) => layout.name),
  );
  return document;
}

/** 名前付きレイアウトを既定に設定し、未指定時は既定指定だけを解除する。 */
export function setPreferredLayout(
  metadata: DockingMetadataDocument,
  layouts: MainLayoutsDocument,
  layoutId: string | undefined,
): DockingMetadataDocument {
  const document = structuredClone(metadata);
  if (layoutId === undefined) {
    delete document.preferredLayoutId;
    return document;
  }

  const target = layouts.layouts.find((layout) => layout.id === layoutId);
  if (!target) throw new Error(`layout was not found: ${layoutId}`);
  if (target.systemDefault) throw new Error("system default layout cannot be preferred");
  document.preferredLayoutId = layoutId;
  return document;
}
