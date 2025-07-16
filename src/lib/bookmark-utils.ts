// Utility functions for handling Chrome bookmark API changes
// This provides backward compatibility for the upcoming sync changes

export interface BookmarkFolder {
  name: string;
  syncing?: boolean;
  folderType?: string;
  id: string; // Add ID to track the actual folder
}

export interface BookmarkWithFolder extends chrome.bookmarks.BookmarkTreeNode {
  folderPath: string[];
}

// Helper function to safely access new API properties
function getNodeProperty<T>(
  node: chrome.bookmarks.BookmarkTreeNode,
  property: string
): T | undefined {
  return (node as unknown as Record<string, unknown>)[property] as
    | T
    | undefined;
}

// Flatten bookmarks with their folder information
export function flattenBookmarksWithFolder(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  folderPath: string[] = []
): BookmarkWithFolder[] {
  let bookmarks: BookmarkWithFolder[] = [];
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({ ...node, folderPath });
    }
    if (node.children) {
      bookmarks = bookmarks.concat(
        flattenBookmarksWithFolder(node.children, [
          ...folderPath,
          node.title || "",
        ])
      );
    }
  }
  return bookmarks;
}

// Extract root-level folders with support for new API
export function getRootLevelFolders(
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): BookmarkFolder[] {
  const folders: BookmarkFolder[] = [];

  for (const rootNode of nodes) {
    if (rootNode.children) {
      for (const node of rootNode.children) {
        const folderType = getNodeProperty<string>(node, "folderType");

        // Handle new API with folderType
        if (folderType === "bookmarks-bar" || folderType === "other") {
          if (node.children) {
            for (const child of node.children) {
              if (!child.url && child.title) {
                const childFolderType = getNodeProperty<string>(
                  child,
                  "folderType"
                );
                const childSyncing = getNodeProperty<boolean>(child, "syncing");
                folders.push({
                  name: child.title,
                  syncing: childSyncing,
                  folderType: childFolderType,
                  id: child.id!,
                });
              }
            }
          }
        }
        // Fallback for older API
        else if (
          node.title === "Bookmarks Bar" ||
          node.title === "Other Bookmarks"
        ) {
          if (node.children) {
            for (const child of node.children) {
              if (!child.url && child.title) {
                folders.push({
                  name: child.title,
                  syncing: undefined,
                  folderType: undefined,
                  id: child.id!,
                });
              }
            }
          }
        }
      }
    }
  }

  // Remove duplicates while preserving sync info
  const uniqueFolders = folders.reduce((acc, folder) => {
    const existingIndex = acc.findIndex((f) => f.name === folder.name);
    if (existingIndex === -1) {
      acc.push(folder);
    } else {
      // If we have both syncing and non-syncing versions, prefer syncing
      if (folder.syncing === true && acc[existingIndex].syncing !== true) {
        acc[existingIndex] = folder;
      }
    }
    return acc;
  }, [] as BookmarkFolder[]);

  return uniqueFolders;
}

// Get folder by folderType (e.g., 'bookmarks-bar', 'other')
export function getFolderByType(
  folderType: string,
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
  preferSyncing: boolean = true
): string | null {
  const foundIds: Array<{ id: string; syncing?: boolean }> = [];

  for (const rootNode of bookmarkTree) {
    if (rootNode.children) {
      for (const node of rootNode.children) {
        const nodeType = getNodeProperty<string>(node, "folderType");
        const nodeSyncing = getNodeProperty<boolean>(node, "syncing");

        // Handle new API with folderType
        if (nodeType === folderType) {
          foundIds.push({
            id: node.id!,
            syncing: nodeSyncing,
          });
        }
        // Fallback for older API
        else if (
          (folderType === "bookmarks-bar" && node.title === "Bookmarks Bar") ||
          (folderType === "other" && node.title === "Other Bookmarks")
        ) {
          foundIds.push({
            id: node.id!,
            syncing: undefined,
          });
        }
      }
    }
  }

  if (foundIds.length === 0) return null;
  if (foundIds.length === 1) return foundIds[0].id;

  // If multiple found, prefer syncing one if requested
  if (preferSyncing) {
    const syncingFolder = foundIds.find((f) => f.syncing === true);
    if (syncingFolder) return syncingFolder.id;
  }

  return foundIds[0].id;
}

// Find folder ID by name with sync preference
export function getFolderId(
  folderName: string,
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
  preferSyncing: boolean = true
): string | null {
  const foundIds: Array<{ id: string; syncing?: boolean }> = [];

  for (const rootNode of bookmarkTree) {
    if (rootNode.children) {
      for (const node of rootNode.children) {
        const folderType = getNodeProperty<string>(node, "folderType");

        // Handle new API with folderType
        if (folderType === "bookmarks-bar" || folderType === "other") {
          if (node.children) {
            for (const child of node.children) {
              if (!child.url && child.title === folderName) {
                const childSyncing = getNodeProperty<boolean>(child, "syncing");
                foundIds.push({
                  id: child.id!,
                  syncing: childSyncing,
                });
              }
            }
          }
        }
        // Fallback for older API
        else if (
          node.title === "Bookmarks Bar" ||
          node.title === "Other Bookmarks"
        ) {
          if (node.children) {
            for (const child of node.children) {
              if (!child.url && child.title === folderName) {
                foundIds.push({
                  id: child.id!,
                  syncing: undefined,
                });
              }
            }
          }
        }
      }
    }
  }

  if (foundIds.length === 0) return null;
  if (foundIds.length === 1) return foundIds[0].id;

  // If multiple folders found, prefer syncing one if requested
  if (preferSyncing) {
    const syncingFolder = foundIds.find((f) => f.syncing === true);
    if (syncingFolder) return syncingFolder.id;
  }

  return foundIds[0].id;
}

// Get Bookmarks Bar ID with sync preference
export function getBookmarksBarId(
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
  preferSyncing: boolean = true
): string | null {
  return getFolderByType("bookmarks-bar", bookmarkTree, preferSyncing);
}

// Get Other Bookmarks ID with sync preference
export function getOtherBookmarksId(
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
  preferSyncing: boolean = true
): string | null {
  return getFolderByType("other", bookmarkTree, preferSyncing);
}

// Get all special folders (bookmarks-bar, other, mobile)
export function getSpecialFolders(
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[]
): Array<{ name: string; id: string; folderType: string; syncing?: boolean }> {
  const specialFolders: Array<{
    name: string;
    id: string;
    folderType: string;
    syncing?: boolean;
  }> = [];

  for (const rootNode of bookmarkTree) {
    if (rootNode.children) {
      for (const node of rootNode.children) {
        const folderType = getNodeProperty<string>(node, "folderType");
        const syncing = getNodeProperty<boolean>(node, "syncing");

        // Handle new API with folderType
        if (
          folderType === "bookmarks-bar" ||
          folderType === "other" ||
          folderType === "mobile"
        ) {
          specialFolders.push({
            name: node.title || "",
            id: node.id!,
            folderType,
            syncing,
          });
        }
        // Fallback for older API
        else if (
          node.title === "Bookmarks Bar" ||
          node.title === "Other Bookmarks" ||
          node.title === "Mobile Bookmarks"
        ) {
          const fallbackType =
            node.title === "Bookmarks Bar"
              ? "bookmarks-bar"
              : node.title === "Other Bookmarks"
              ? "other"
              : "mobile";

          specialFolders.push({
            name: node.title,
            id: node.id!,
            folderType: fallbackType,
            syncing: undefined,
          });
        }
      }
    }
  }

  return specialFolders;
}
