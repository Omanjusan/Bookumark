import type { DockingDocuments } from "./docking-persistence-model.js";
import { saveDockingDocuments } from "./docking-storage.js";

type DockingDocumentsPatch = Partial<DockingDocuments>;

interface LayoutSaveSessionOptions {
  readonly saveDocuments?: (documents: DockingDocumentsPatch) => Promise<void>;
}

export interface LayoutSaveSession {
  readonly pending: boolean;
  readonly saving: boolean;
  stage(documents: DockingDocumentsPatch): void;
  stagedDocuments(): DockingDocumentsPatch | null;
  committedDocuments(): DockingDocuments;
  adoptCommittedDocuments(documents: DockingDocuments): void;
  save(): Promise<DockingDocuments>;
}

const DOCUMENT_FIELDS: ReadonlyArray<keyof DockingDocuments> = [
  "bayConfigurations",
  "mainLayouts",
  "dockingMetadata",
];

/** レイアウト管理候補の変更キーだけを原子的に保存するセッションを生成する。 */
export function createLayoutSaveSession(
  documents: DockingDocuments,
  options: LayoutSaveSessionOptions = {},
): LayoutSaveSession {
  let committed = structuredClone(documents);
  let staged: DockingDocumentsPatch | null = null;
  let saving = false;

  /** 変更対象文書を保存前の候補として防御的に保持する。 */
  const stage = (candidate: DockingDocumentsPatch): void => {
    if (saving) throw new Error("layout save is in progress");
    if (!DOCUMENT_FIELDS.some((field) => candidate[field] !== undefined)) {
      throw new Error("at least one docking document is required");
    }
    staged = structuredClone(candidate);
  };

  /** ステージ済みの全キーを1回で保存し、成功時だけ正本へ反映する。 */
  const save = async (): Promise<DockingDocuments> => {
    if (saving) throw new Error("layout save is already in progress");
    if (staged === null) throw new Error("layout save is not pending");

    const candidate = structuredClone(staged);
    saving = true;
    try {
      const persist = options.saveDocuments ?? saveDockingDocuments;
      await persist(structuredClone(candidate));
      const next = structuredClone(committed);
      for (const field of DOCUMENT_FIELDS) {
        const document = candidate[field];
        if (document !== undefined) {
          // キーごとに型が対応することはDockingDocumentsPatchの構造で保証される。
          Object.assign(next, { [field]: structuredClone(document) });
        }
      }
      committed = next;
      staged = null;
      return structuredClone(committed);
    } finally {
      saving = false;
    }
  };

  return {
    get pending(): boolean { return staged !== null; },
    get saving(): boolean { return saving; },
    stage,
    stagedDocuments: (): DockingDocumentsPatch | null => structuredClone(staged),
    committedDocuments: (): DockingDocuments => structuredClone(committed),
    adoptCommittedDocuments(documents): void {
      if (saving || staged !== null) throw new Error("layout save session is not idle");
      committed = structuredClone(documents);
    },
    save,
  };
}
