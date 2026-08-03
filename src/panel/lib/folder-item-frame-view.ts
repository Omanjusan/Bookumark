import {
  effectiveFolderFrameRows,
  MAX_FOLDER_FRAME_ROWS,
  MIN_FOLDER_FRAME_ROWS,
  requestedFolderFrameRows,
} from "./folder-item-frame-rows.js";
import type { FolderFrameRowsState } from "./folder-item-frame-rows.js";

const FOLDER_WIDTH = 144;
const FOLDER_HEIGHT = 36;
const FOLDER_GAP = 6;
const FRAME_VERTICAL_CHROME = 12;

interface FolderItemFrameElements {
  readonly folderFrame: { readonly style: { height: string } };
  readonly folderContent: { scrollTop: number };
  readonly itemContent: { scrollTop: number };
  readonly expandFolder: { disabled: boolean };
  readonly expandItem: { disabled: boolean };
}

interface FolderItemFrameMeasurements {
  readonly folderCount: number;
  readonly folderContentWidth: number;
  readonly availableHeight: number;
}

export interface FolderItemFrameAllocation {
  readonly requiredRows: number;
  readonly viewportLimitRows: number;
  readonly effectiveRows: number;
}

/** フォルダ数と利用可能寸法から上下枠の段数、固定高さ、操作可否を反映する。 */
export function renderFolderItemFrameAllocation(
  elements: FolderItemFrameElements,
  state: FolderFrameRowsState,
  measurements: FolderItemFrameMeasurements,
): FolderItemFrameAllocation {
  const requiredRows = requiredFolderRows(
    measurements.folderCount,
    measurements.folderContentWidth,
  );
  const viewportLimitRows = rowsWithinViewportQuarter(measurements.availableHeight);
  const effectiveRows = effectiveFolderFrameRows(state, requiredRows, viewportLimitRows);
  const height = effectiveRows * FOLDER_HEIGHT
    + (effectiveRows - 1) * FOLDER_GAP
    + FRAME_VERTICAL_CHROME;
  elements.folderFrame.style.height = `${height}px`;

  const requestedRows = requestedFolderFrameRows(state);
  elements.expandFolder.disabled = requestedRows === MAX_FOLDER_FRAME_ROWS;
  elements.expandItem.disabled = requestedRows === MIN_FOLDER_FRAME_ROWS;
  return { requiredRows, viewportLimitRows, effectiveRows };
}

/** 固定幅フォルダが現在幅で必要とする行数を求める。 */
function requiredFolderRows(folderCount: number, contentWidth: number): number {
  assertNonNegativeFinite(folderCount, "folder count");
  assertNonNegativeFinite(contentWidth, "folder content width");
  if (!Number.isInteger(folderCount)) throw new RangeError("folder count must be an integer");
  const columns = Math.max(1, Math.floor((contentWidth + FOLDER_GAP) / (FOLDER_WIDTH + FOLDER_GAP)));
  return Math.max(MIN_FOLDER_FRAME_ROWS, Math.ceil(folderCount / columns));
}

/** 利用可能な中央領域の25%以内に収まる行数を求める。 */
function rowsWithinViewportQuarter(availableHeight: number): number {
  assertNonNegativeFinite(availableHeight, "available frame height");
  const quarter = availableHeight * 0.25;
  return Math.max(
    MIN_FOLDER_FRAME_ROWS,
    Math.floor((quarter - FRAME_VERTICAL_CHROME + FOLDER_GAP) / (FOLDER_HEIGHT + FOLDER_GAP)),
  );
}

/** 値が有限の0以上であることを検証する。 */
function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be non-negative`);
}
