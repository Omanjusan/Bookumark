export const MIN_FOLDER_FRAME_ROWS = 1;
export const MAX_FOLDER_FRAME_ROWS = 5;
export const DEFAULT_FOLDER_FRAME_ROWS = 3;

export interface FolderFrameRowsState {
  readonly defaultRows: number;
  readonly sceneRows: number | null;
}

/** 既定段数から、シーン内調整を持たない初期状態を生成する。 */
export function createFolderFrameRowsState(
  defaultRows = DEFAULT_FOLDER_FRAME_ROWS,
): FolderFrameRowsState {
  assertRequestedRows(defaultRows);
  return { defaultRows, sceneRows: null };
}

/** 現在の基準段数を1増やし、フォルダ欄を広げるシーン内希望を作る。 */
export function expandFolderFrame(state: FolderFrameRowsState): FolderFrameRowsState {
  const requestedRows = requestedFolderFrameRows(state);
  if (requestedRows === MAX_FOLDER_FRAME_ROWS) return state;
  return { ...state, sceneRows: requestedRows + 1 };
}

/** 現在の基準段数を1減らし、アイテム欄を広げるシーン内希望を作る。 */
export function expandItemFrame(state: FolderFrameRowsState): FolderFrameRowsState {
  const requestedRows = requestedFolderFrameRows(state);
  if (requestedRows === MIN_FOLDER_FRAME_ROWS) return state;
  return { ...state, sceneRows: requestedRows - 1 };
}

/** シーン内希望を破棄し、永続化された既定段数へ戻す。 */
export function resetFolderFrameSceneRows(
  state: FolderFrameRowsState,
): FolderFrameRowsState {
  if (state.sceneRows === null) return state;
  return { ...state, sceneRows: null };
}

/** 既定段数を置き換え、現在シーンにも新しい既定値を適用する。 */
export function setDefaultFolderFrameRows(
  state: FolderFrameRowsState,
  defaultRows: number,
): FolderFrameRowsState {
  assertRequestedRows(defaultRows);
  if (state.defaultRows === defaultRows && state.sceneRows === null) return state;
  return { defaultRows, sceneRows: null };
}

/** シーン内希望があれば優先し、なければ永続化された既定段数を返す。 */
export function requestedFolderFrameRows(state: FolderFrameRowsState): number {
  return state.sceneRows ?? state.defaultRows;
}

/** 必要段数と画面高25%相当の上限から、最低1段を保つ実効段数を求める。 */
export function effectiveFolderFrameRows(
  state: FolderFrameRowsState,
  requiredRows: number,
  viewportLimitRows: number,
): number {
  assertNonNegativeInteger(requiredRows, "required folder rows");
  assertNonNegativeInteger(viewportLimitRows, "viewport folder row limit");
  const contentRows = Math.max(MIN_FOLDER_FRAME_ROWS, requiredRows);
  const availableRows = Math.max(MIN_FOLDER_FRAME_ROWS, viewportLimitRows);
  return Math.min(requestedFolderFrameRows(state), contentRows, availableRows);
}

/** 希望段数が合意した1～5の整数であることを検証する。 */
function assertRequestedRows(rows: number): void {
  assertNonNegativeInteger(rows, "folder frame rows");
  if (rows < MIN_FOLDER_FRAME_ROWS || rows > MAX_FOLDER_FRAME_ROWS) {
    throw new RangeError("folder frame rows must be between 1 and 5");
  }
}

/** 値が有限の0以上の整数であることを検証する。 */
function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}
