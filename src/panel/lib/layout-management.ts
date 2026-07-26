import { issueLayoutId } from "./docking-persistence-model.js";

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
