import type { BookmarkTreeItem } from "./bookmarks.js";
import type { OfficialSiblingMovePlan } from "./official-order.js";

interface OfficialMoveDependencies {
  move(
    guid: string,
    destination: OfficialSiblingMovePlan["destination"],
  ): Promise<unknown>;
  loadTree(): Promise<BookmarkTreeItem[]>;
}

export type OfficialMoveExecutionResult =
  | { readonly status: "success"; readonly items: BookmarkTreeItem[] }
  | {
    readonly status: "move-failed";
    readonly error: unknown;
    readonly items: BookmarkTreeItem[];
  }
  | {
    readonly status: "recovery-failed";
    readonly error?: unknown;
    readonly recoveryError: unknown;
  };

/** 移動成否にかかわらずFirefoxツリーを再取得し、表示確定可能な結果を返す。 */
export async function executeOfficialMoveWithRecovery(
  plan: OfficialSiblingMovePlan,
  dependencies: OfficialMoveDependencies,
): Promise<OfficialMoveExecutionResult> {
  let moveError: unknown;
  let moveFailed = false;
  try {
    await dependencies.move(plan.guid, plan.destination);
  } catch (error) {
    moveFailed = true;
    moveError = error;
  }

  try {
    const items = await dependencies.loadTree();
    return moveFailed
      ? { status: "move-failed", error: moveError, items }
      : { status: "success", items };
  } catch (recoveryError) {
    return {
      status: "recovery-failed",
      ...(moveFailed ? { error: moveError } : {}),
      recoveryError,
    };
  }
}
