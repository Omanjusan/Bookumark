export interface FolderNavigationHistory {
  current(): string;
  backDestination(): string | null;
  forwardDestination(): string | null;
  visit(folderGuid: string): boolean;
  moveBack(): string | null;
  moveForward(): string | null;
}

export function createFolderNavigationHistory(
  initialFolderGuid: string,
): FolderNavigationHistory {
  const entries = [initialFolderGuid];
  let index = 0;

  return {
    current: () => entries[index],
    backDestination: () => index > 0 ? entries[index - 1] : null,
    forwardDestination: () => index + 1 < entries.length ? entries[index + 1] : null,
    visit(folderGuid) {
      if (entries[index] === folderGuid) return false;
      entries.splice(index + 1, entries.length - index - 1, folderGuid);
      index += 1;
      return true;
    },
    moveBack() {
      if (index === 0) return null;
      index -= 1;
      return entries[index];
    },
    moveForward() {
      if (index + 1 >= entries.length) return null;
      index += 1;
      return entries[index];
    },
  };
}
