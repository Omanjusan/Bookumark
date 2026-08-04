const EXPERIMENT_FOLDER_TITLE = "bookumark";

interface ExperimentBookmarkRootDependencies {
  readonly getChildren: (
    parentGuid: string,
  ) => Promise<readonly browser.bookmarks.BookmarkTreeNode[]>;
  readonly create: (
    details: browser.bookmarks.CreateDetails,
  ) => Promise<browser.bookmarks.BookmarkTreeNode>;
}

export interface ExperimentBookmarkRootResult {
  readonly folderGuid: string;
  readonly error: unknown | null;
}

/**
 * Firefoxルート直下にexperiment専用フォルダを確保する。
 * 既存フォルダは内容を変更せず先頭の1件を再利用し、API失敗時はFirefoxルートへ戻す。
 */
export async function ensureExperimentBookmarkRoot(
  firefoxRootGuid: string,
  dependencies: ExperimentBookmarkRootDependencies,
): Promise<ExperimentBookmarkRootResult> {
  try {
    const children = await dependencies.getChildren(firefoxRootGuid);
    const existing = children.find((node) => (
      node.title === EXPERIMENT_FOLDER_TITLE
      && node.url === undefined
      && node.type !== "separator"
    ));
    if (existing !== undefined) {
      return { folderGuid: existing.id, error: null };
    }

    const created = await dependencies.create({
      parentId: firefoxRootGuid,
      title: EXPERIMENT_FOLDER_TITLE,
    });
    return { folderGuid: created.id, error: null };
  } catch (error) {
    return { folderGuid: firefoxRootGuid, error };
  }
}
