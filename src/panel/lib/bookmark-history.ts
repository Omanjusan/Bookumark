import type { BookmarkItem } from "./bookmarks.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import { withBookmarkSortMetadata } from "./display-item.js";

interface VisitRecord {
  readonly visitTime?: number;
}

type GetVisits = (details: { url: string }) => Promise<readonly VisitRecord[]>;

interface HistoryLoadOptions {
  readonly getVisits?: GetVisits;
  readonly concurrency?: number;
}

const DEFAULT_HISTORY_CONCURRENCY = 8;

/** Firefox履歴をURL単位で取得し、入力順を維持して表示項目へ合成する。 */
export async function loadBookmarkHistory(
  items: readonly BookmarkItem[],
  options: HistoryLoadOptions = {},
): Promise<DisplayBookmarkItem[]> {
  const concurrency = options.concurrency ?? DEFAULT_HISTORY_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("history concurrency must be a positive integer");
  }

  const getVisits: GetVisits = options.getVisits
    ?? ((details) => browser.history.getVisits(details));
  const results = new Array<DisplayBookmarkItem>(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      const visits = await getVisits({ url: item.url });
      const definedTimes = visits
        .map(({ visitTime }) => visitTime)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const lastVisitTime = definedTimes.length > 0 ? Math.max(...definedTimes) : undefined;
      results[index] = withBookmarkSortMetadata(item, {
        visitCount: visits.length,
        ...(lastVisitTime === undefined ? {} : { lastVisitTime }),
      });
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
