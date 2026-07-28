import { createBlankNamedLayout } from "./layout-creation.js";
import { deleteNamedLayout } from "./layout-deletion.js";
import {
  duplicateLayoutWithIndependentBays,
  duplicateLayoutWithSharedBays,
} from "./layout-duplication.js";
import { renameNamedLayout, setPreferredLayout } from "./layout-management.js";
import { createLayoutSaveSession } from "./layout-save-session.js";
import {
  restoreSystemDefaultLayout,
  switchNamedLayout,
} from "./layout-selection.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

type DockingDocumentsPatch = Partial<DockingDocuments>;

interface LayoutManagementCoordinatorOptions {
  readonly saveDocuments?: (documents: DockingDocumentsPatch) => Promise<void>;
}

export interface LayoutCreationRequest {
  readonly name: string;
  readonly sourceLayoutId: string | null;
  readonly duplicateBays: boolean;
}

export interface LayoutManagementCoordinator {
  readonly pending: boolean;
  readonly saving: boolean;
  state(): DockingDocuments;
  replaceState(documents: DockingDocuments): void;
  create(request: LayoutCreationRequest): Promise<DockingDocuments>;
  rename(layoutId: string, name: string): Promise<DockingDocuments>;
  setPreferred(layoutId: string | undefined): Promise<DockingDocuments>;
  switchTo(layoutId: string): Promise<DockingDocuments>;
  restoreDefault(): Promise<DockingDocuments>;
  delete(layoutId: string): Promise<DockingDocuments>;
  retry(): Promise<DockingDocuments>;
}

/** 名前付きレイアウトの全管理操作を候補生成と原子的保存へ接続する。 */
export function createLayoutManagementCoordinator(
  initial: DockingDocuments,
  options: LayoutManagementCoordinatorOptions = {},
): LayoutManagementCoordinator {
  const session = createLayoutSaveSession(initial, options);

  /** 新しい候補をステージできる状態か確認する。 */
  const assertReady = (): void => {
    if (session.pending) throw new Error("a failed layout save must be retried first");
  };

  /** 指定キーを1回で保存し、成功後の正本を返す。 */
  const persist = async (patch: DockingDocumentsPatch): Promise<DockingDocuments> => {
    assertReady();
    session.stage(patch);
    return session.save();
  };

  /** 作成方式に応じた文書候補を生成し、新レイアウトをactiveにして保存する。 */
  const create = async (request: LayoutCreationRequest): Promise<DockingDocuments> => {
    const current = session.committedDocuments();
    if (request.sourceLayoutId === null) {
      const created = createBlankNamedLayout(
        current.mainLayouts,
        current.bayConfigurations,
        request.name,
      );
      return persist({
        mainLayouts: created.document,
        dockingMetadata: switchNamedLayout(
          current.dockingMetadata,
          created.document,
          created.layout.id,
        ),
      });
    }

    if (!request.duplicateBays) {
      const created = duplicateLayoutWithSharedBays(
        current.mainLayouts,
        request.sourceLayoutId,
        request.name,
      );
      return persist({
        mainLayouts: created.document,
        dockingMetadata: switchNamedLayout(
          current.dockingMetadata,
          created.document,
          created.layout.id,
        ),
      });
    }

    const created = duplicateLayoutWithIndependentBays(
      current.mainLayouts,
      current.bayConfigurations,
      request.sourceLayoutId,
      request.name,
    );
    return persist({
      bayConfigurations: created.bayConfigurations,
      mainLayouts: created.mainLayouts,
      dockingMetadata: switchNamedLayout(
        current.dockingMetadata,
        created.mainLayouts,
        created.layout.id,
      ),
    });
  };

  return {
    get pending(): boolean { return session.pending; },
    get saving(): boolean { return session.saving; },
    state: (): DockingDocuments => session.committedDocuments(),
    replaceState: (documents): void => session.adoptCommittedDocuments(documents),
    create,
    rename: (layoutId, name) => {
      const current = session.committedDocuments();
      return persist({ mainLayouts: renameNamedLayout(current.mainLayouts, layoutId, name) });
    },
    setPreferred: (layoutId) => {
      const current = session.committedDocuments();
      return persist({
        dockingMetadata: setPreferredLayout(
          current.dockingMetadata,
          current.mainLayouts,
          layoutId,
        ),
      });
    },
    switchTo: (layoutId) => {
      const current = session.committedDocuments();
      return persist({
        dockingMetadata: switchNamedLayout(
          current.dockingMetadata,
          current.mainLayouts,
          layoutId,
        ),
      });
    },
    restoreDefault: () => {
      const current = session.committedDocuments();
      return persist({
        dockingMetadata: restoreSystemDefaultLayout(
          current.dockingMetadata,
          current.mainLayouts,
        ),
      });
    },
    delete: (layoutId) => {
      const current = session.committedDocuments();
      const deleted = deleteNamedLayout(
        current.mainLayouts,
        current.dockingMetadata,
        layoutId,
      );
      return persist({
        mainLayouts: deleted.mainLayouts,
        dockingMetadata: deleted.dockingMetadata,
      });
    },
    retry: (): Promise<DockingDocuments> => session.save(),
  };
}
