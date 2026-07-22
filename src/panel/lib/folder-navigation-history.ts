export interface FolderNavigationHistory {
  current(): string;
  backDestination(): string | null;
  forwardDestination(): string | null;
  visit(folderGuid: string): boolean;
  moveBack(): string | null;
  moveForward(): string | null;
}

export function createFolderNavigationHistory(
  initialRoute: string | readonly string[],
): FolderNavigationHistory {
  const entries = typeof initialRoute === "string"
    ? [initialRoute]
    : [...initialRoute];
  if (entries.length === 0) {
    throw new Error("Folder navigation history requires an initial folder");
  }
  let index = entries.length - 1;

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
