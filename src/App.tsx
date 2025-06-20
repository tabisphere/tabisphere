import { useEffect, useState } from "react";
import { cn, focusEndContentEditable, trimEnd } from "./lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./components/ui/context-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";

import {
  Check,
  FolderOpen,
  ListIcon,
  PencilIcon,
  Plus,
  SearchIcon,
  Share,
  Star,
  TrashIcon,
} from "lucide-react";
import { filters } from "./lib/filters";
import FilterDialog from "./components/filterDialog";
import { sorts } from "./lib/sorts";
import { SortDropdown } from "./components/sortDropdown";
import { useLocalStorage } from "./lib/storage";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { isFuzzyMatch } from "./lib/fuzzy-search";

// New function to get bookmarks with their folder information
function flattenBookmarksWithFolder(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  folderPath: string[] = []
): (chrome.bookmarks.BookmarkTreeNode & { folderPath: string[] })[] {
  let bookmarks: (chrome.bookmarks.BookmarkTreeNode & { folderPath: string[] })[] = [];
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({ ...node, folderPath });
    }
    if (node.children) {
      bookmarks = bookmarks.concat(
        flattenBookmarksWithFolder(node.children, [...folderPath, node.title || ""])
      );
    }
  }
  return bookmarks;
}

// Function to extract root-level folders from Bookmarks Bar and Other Bookmarks
function getRootLevelFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]): string[] {
  const folders: string[] = [];
  
  for (const rootNode of nodes) {
    if (rootNode.children) {
      for (const node of rootNode.children) {
        // Look for "Bookmarks Bar" and "Other Bookmarks"
        if (node.title === "Bookmarks Bar" || node.title === "Other Bookmarks") {
          if (node.children) {
            for (const child of node.children) {
              // Only add folders (nodes without URLs) and ignore subfolders
              if (!child.url && child.title) {
                folders.push(child.title);
              }
            }
          }
        }
      }
    }
  }
  
  return [...new Set(folders)]; // Remove duplicates
}

function getNumericalFullDate(date: number) {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  return Number(
    `${year}${month.toString().padStart(2, "0")}${day
      .toString()
      .padStart(2, "0")}`
  );
}

function makeGroupHeader(date: number) {
  const curDate = getNumericalFullDate(Date.now());
  const numericalFullDate = getNumericalFullDate(date);
  if (numericalFullDate == curDate) {
    return "Today";
  } else if (numericalFullDate == curDate - 1) {
    return "Yesterday";
  } else if (numericalFullDate == curDate + 1) {
    return "Tomorrow";
  } else if (
    numericalFullDate.toString().startsWith(new Date().getFullYear().toString())
  ) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      weekday: "long",
    });
  } else {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      weekday: "long",
      year: "numeric",
    });
  }
}

function App() {
  const [bookmarks, setBookmarks] = useState<
    (chrome.bookmarks.BookmarkTreeNode & { folderPath: string[] })[]
  >([]);
  const [bookmarkFolders, setBookmarkFolders] = useState<string[]>([]);
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [activeTab, setActiveTab] = useLocalStorage<string>("bookmark-active-tab", "All");
  const [titleValue, setTitleValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [moveFolderDialogOpen, setMoveFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string>("");
  const [movingBookmark, setMovingBookmark] = useState<chrome.bookmarks.BookmarkTreeNode | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [searchShown, setSearchShown] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Array<{
      id: string;
      category: string;
      type: string;
      value: string;
    }>
  >(() => {
    const saved = localStorage.getItem("bookmark-filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [searchValue, setSearchValue] = useState("");
  const [sort, setSort] = useLocalStorage<string>("bookmark-sort", sorts[0].id);
  const [currentFilter, setCurrentFilter] = useState<{
    category: string;
    type: string;
    value: string;
  }>({
    category: "title",
    type: "contains",
    value: "",
  });

  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);

  useEffect(() => {
    if (editingFilterId) {
      document.getElementById("filter-value-input")?.focus();
    }
  }, [editingFilterId]);

  useEffect(() => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setTabs(tabs);
    });
    chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
      setTabs((prevTabs) => prevTabs.map((t) => (t.id === tabId ? tab : t)));
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      setTabs((prevTabs) => prevTabs.filter((t) => t.id !== tabId));
    });
    chrome.tabs.onCreated.addListener((tab) => {
      setTabs((prevTabs) => [...prevTabs, tab]);
    });
    return () => {
      chrome.tabs.onUpdated.removeListener((tabId, _changeInfo, tab) => {
        setTabs((prevTabs) => prevTabs.map((t) => (t.id === tabId ? tab : t)));
      });
      chrome.tabs.onRemoved.removeListener((tabId) => {
        setTabs((prevTabs) => prevTabs.filter((t) => t.id !== tabId));
      });
      chrome.tabs.onCreated.removeListener((tab) => {
        setTabs((prevTabs) => [...prevTabs, tab]);
      });
    };
  }, []);

  function handlePaste(event: ClipboardEvent) {
    if (document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain");
      try {
        if (text && new URL(text)) {
          setDialogOpen(true);
          setUrlValue(text);
        }
      } catch {
        setDialogOpen(true);
        setTitleValue(text ?? "");
      }
    }
  }

  function isAltKey(event: KeyboardEvent) {
    return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((isAltKey(event) && event.key === "f") || event.key === "ƒ") {
      event.preventDefault();
      document.getElementById("filter-button")?.click();
    }
    if ((isAltKey(event) && event.key === "t") || event.key === "†") {
      event.preventDefault();
      document.getElementById("open-tabs-button")?.click();
    }
    if ((isAltKey(event) && event.key === "e") || event.key === "Dead") {
      event.preventDefault();
      setDialogOpen(true);
    }
    if (
      event.key === "/" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      document.activeElement?.tagName !== "INPUT"
    ) {
      document.getElementById("search-button")?.click();
    }
  }

  useEffect(() => {
    document.addEventListener("keyup", handleKeyDown);
    return () => {
      document.removeEventListener("keyup", handleKeyDown);
    };
  }, []);

  function getTree() {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allBookmarks = flattenBookmarksWithFolder(bookmarkTreeNodes);
      const folders = getRootLevelFolders(bookmarkTreeNodes);
      setBookmarks(allBookmarks);
      setBookmarkFolders(folders);
      setBookmarkTree(bookmarkTreeNodes);
    });
  }

  useEffect(() => {
    if (chrome.bookmarks !== undefined) {
      getTree();
    }

    chrome.bookmarks.onChanged.addListener(() => {
      getTree();
    });

    chrome.bookmarks.onCreated.addListener(() => {
      getTree();
    });

    chrome.bookmarks.onRemoved.addListener(() => {
      getTree();
    });

    document.addEventListener("paste", handlePaste as EventListener);
    return () => {
      document.removeEventListener("paste", handlePaste as EventListener);
    };
  }, []);

  useEffect(() => {
    if (activeFilters.length > 0) {
      localStorage.setItem("bookmark-filters", JSON.stringify(activeFilters));
    } else {
      localStorage.removeItem("bookmark-filters");
    }
  }, [activeFilters]);

  useEffect(() => {
    if (searchShown) {
      document.getElementById("search-input")?.focus();
    }
  }, [searchShown]);

  const isURLinBookmarks = (url: string) => {
    return bookmarks.some((bookmark) => bookmark.url === url);
  };

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    // First filter by tab/folder
    if (activeTab !== "All") {
      // Check if the bookmark is in the selected folder (root level only)
      const isInFolder = bookmark.folderPath.length >= 3 && 
                        bookmark.folderPath[2] === activeTab;
      if (!isInFolder) {
        return false;
      }
    }

    // Then apply search filter
    if (searchValue) {
      return isFuzzyMatch(
        {
          title: bookmark.title,
          url: bookmark.url!,
        },
        searchValue
      );
    }

    // Finally apply other filters
    if (activeFilters.length === 0) {
      return true;
    }

    const checkFilter = (filter: (typeof activeFilters)[0]) => {
      const filterCategory = filters[filter.category as keyof typeof filters];
      if (!filterCategory) return true;

      const filterOption = filterCategory.options.find(
        (option) => option.id === filter.type
      );

      if (!filterOption) return true;

      if (filter.category === "title") {
        const targetValue = bookmark.title?.toLowerCase() || "";
        return (
          filterOption.checkFilter as (text: string, filter: string) => boolean
        )(targetValue, filter.value.toLowerCase());
      } else if (filter.category === "url") {
        const targetValue = bookmark.url || "";
        return (
          filterOption.checkFilter as (text: string, filter: string) => boolean
        )(targetValue, filter.value.toLowerCase());
      } else if (filter.category === "date") {
        return (
          filterOption.checkFilter as (
            dateAdded: number,
            filter: string
          ) => boolean
        )(bookmark.dateAdded || 0, filter.value);
      }

      return true;
    };

    // All filters must pass (for now)
    return activeFilters.every(checkFilter);
  });

  // Get the folder ID for a given folder name
  function getFolderId(folderName: string): string | null {
    const findFolderInTree = (nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null => {
      for (const rootNode of nodes) {
        if (rootNode.children) {
          for (const node of rootNode.children) {
            if (node.title === "Bookmarks Bar" || node.title === "Other Bookmarks") {
              if (node.children) {
                for (const child of node.children) {
                  if (!child.url && child.title === folderName) {
                    return child.id!;
                  }
                }
              }
            }
          }
        }
      }
      return null;
    };
    
    return findFolderInTree(bookmarkTree);
  }

  // Get the default parent folder ID (Bookmarks Bar)
  function getDefaultParentId(): string | null {
    const findBookmarksBar = (nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null => {
      for (const rootNode of nodes) {
        if (rootNode.children) {
          for (const node of rootNode.children) {
            if (node.title === "Bookmarks Bar") {
              return node.id!;
            }
          }
        }
      }
      return null;
    };
    
    return findBookmarksBar(bookmarkTree);
  }

  // Create a new folder
  function createFolder(name: string) {
    const parentId = getDefaultParentId();
    if (parentId) {
      chrome.bookmarks.create({
        parentId: parentId,
        title: name,
      }).then(() => {
        toast("Folder created successfully", {
          description: `Created folder "${name}"`,
        });
        getTree(); // Refresh the tree
      }).catch((error) => {
        toast("Error creating folder", {
          description: error.message,
        });
      });
    }
  }

  // Rename a folder
  function renameFolder(oldName: string, newName: string) {
    const folderId = getFolderId(oldName);
    if (folderId) {
      chrome.bookmarks.update(folderId, {
        title: newName,
      }).then(() => {
        toast("Folder renamed successfully", {
          description: `Renamed "${oldName}" to "${newName}"`,
        });
        // If the renamed folder was the active tab, update it
        if (activeTab === oldName) {
          setActiveTab(newName);
        }
        getTree(); // Refresh the tree
      }).catch((error) => {
        toast("Error renaming folder", {
          description: error.message,
        });
      });
    }
  }

  // Move bookmark to a different folder
  function moveBookmark(bookmarkId: string, targetFolderName: string) {
    let parentId: string | null = null;
    
    if (targetFolderName === "Bookmarks Bar" || targetFolderName === "Other Bookmarks") {
      // Moving to root level
      const findRootFolder = (nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null => {
        for (const rootNode of nodes) {
          if (rootNode.children) {
            for (const node of rootNode.children) {
              if (node.title === targetFolderName) {
                return node.id!;
              }
            }
          }
        }
        return null;
      };
      parentId = findRootFolder(bookmarkTree);
    } else {
      // Moving to a specific folder
      parentId = getFolderId(targetFolderName);
    }

    if (parentId) {
      chrome.bookmarks.move(bookmarkId, {
        parentId: parentId,
      }).then(() => {
        toast("Bookmark moved successfully", {
          description: `Moved to "${targetFolderName}"`,
        });
        getTree(); // Refresh the tree
      }).catch((error) => {
        toast("Error moving bookmark", {
          description: error.message,
        });
      });
    }
  }

  return (
    <div className="flex-col items-center justify-center min-h-screen max-w-2xl mx-auto p-12 px-16">
      <div className="flex items-center gap-2 justify-between w-full">
        <h1 className="text-2xl font-semibold pl-2 select-none">Home</h1>
      </div>
      <div className="flex items-center gap-2 justify-between w-full pl-2 pt-2 sticky top-0 bg-background z-40">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-muted-foreground" fill="currentColor" />
          <span className="text-sm font-normal select-none text-muted-foreground">
            Bookmarks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0">
            <div className="flex items-center">
              <Dialog>
                <Tooltip>
                  <TooltipTrigger>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" id="open-tabs-button">
                        <ListIcon className="size-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Open tabs (
                      {navigator.platform.includes("Mac") ? "⌥" : "Alt"}
                      +T)
                    </p>
                  </TooltipContent>
                </Tooltip>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tabs</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2 max-w-full overflow-hidden">
                    {tabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="text-[16px] bg-black/5 border border-black/10 rounded-xl p-2 px-3.5 font-medium flex flex-row gap-3 items-center"
                      >
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span
                            className="font-medium truncate"
                            title={tab.title}
                          >
                            {tab.title}
                          </span>
                          <span
                            className="text-muted-foreground truncate"
                            title={tab.url}
                          >
                            {tab.url}
                          </span>
                        </div>
                        <Button
                          disabled={isURLinBookmarks(tab.url!)}
                          onClick={() => {
                            chrome.bookmarks
                              .create({
                                url: tab.url!,
                                title: tab.title!,
                              })
                              .then((bookmark) => {
                                toast("Bookmark has been added", {
                                  description: tab.url,
                                  action: {
                                    label: "Undo",
                                    onClick: () => {
                                      chrome.bookmarks.remove(bookmark.id!);
                                    },
                                  },
                                });
                              })
                              .catch((error) => {
                                toast("Error adding bookmark", {
                                  description: error.message,
                                });
                              });
                          }}
                          className="w-[91px]"
                        >
                          {isURLinBookmarks(tab.url!) ? (
                            <Check className="size-4" />
                          ) : (
                            <Plus className="size-4" />
                          )}
                          {isURLinBookmarks(tab.url!) ? "Added" : "Add"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    id="search-button"
                    onClick={() => setSearchShown(!searchShown)}
                  >
                    <SearchIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search (/)</p>
                </TooltipContent>
              </Tooltip>
              <Input
                value={searchValue}
                id="search-input"
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSearchValue("");
                    e.currentTarget.blur();
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => setSearchShown(false)}
                placeholder="Search"
                className={cn(
                  "h-[32px] w-0 border-0 shadow-none px-0 py-1 transition-all ring-0 focus-visible:ring-0",
                  {
                    "w-[120px] pr-3": searchShown || searchValue.length > 0,
                  }
                )}
              />
            </div>
            <SortDropdown setSort={setSort} sort={sort} />
            <FilterDialog
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
              activeFilters={activeFilters}
              setActiveFilters={setActiveFilters}
              editingFilterId={editingFilterId}
              setEditingFilterId={setEditingFilterId}
              currentFilter={currentFilter}
              setCurrentFilter={setCurrentFilter}
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <form>
              <DialogTrigger asChild>
                <Button className="h-8" size={"sm"} id="create-bookmark-button">
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create bookmark</DialogTitle>
                  <DialogDescription>
                    Create a new bookmark here.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="title-1">Title</Label>
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document.getElementById("url-input")?.focus();
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="url-1">URL</Label>
                    <Input
                      value={urlValue}
                      id="url-input"
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document
                            .getElementById("create-bookmark-button")
                            ?.click();
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="folder-select">Folder</Label>
                    <select
                      id="folder-select"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                    >
                      <option value="">Bookmarks Bar</option>
                      <option value="Other Bookmarks">Other Bookmarks</option>
                      {bookmarkFolders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    id="create-bookmark-button"
                    disabled={!(titleValue && urlValue)}
                    onClick={() => {
                      let fixedUrlValue = urlValue;
                      if (!urlValue.startsWith("http")) {
                        fixedUrlValue = `https://${urlValue}`;
                      }

                      // Determine the parent folder ID
                      let parentId: string | null = null;
                      if (selectedFolder === "" || selectedFolder === "Bookmarks Bar") {
                        parentId = getDefaultParentId(); // Bookmarks Bar
                      } else if (selectedFolder === "Other Bookmarks") {
                        // Find Other Bookmarks ID
                        const findOtherBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null => {
                          for (const rootNode of nodes) {
                            if (rootNode.children) {
                              for (const node of rootNode.children) {
                                if (node.title === "Other Bookmarks") {
                                  return node.id!;
                                }
                              }
                            }
                          }
                          return null;
                        };
                        parentId = findOtherBookmarks(bookmarkTree);
                      } else {
                        parentId = getFolderId(selectedFolder);
                      }

                      const bookmarkData: {
                        url: string;
                        title: string;
                        parentId?: string;
                      } = {
                        url: fixedUrlValue,
                        title: titleValue,
                      };

                      if (parentId) {
                        bookmarkData.parentId = parentId;
                      }

                      chrome.bookmarks
                        .create(bookmarkData)
                        .then((bookmark) => {
                          toast("Bookmark has been added", {
                            description: fixedUrlValue,
                            action: {
                              label: "Undo",
                              onClick: () => {
                                chrome.bookmarks.remove(bookmark.id!);
                              },
                            },
                          });
                        })
                        .catch((error) => {
                          toast("Error adding bookmark", {
                            description: error.message,
                          });
                        });
                      setDialogOpen(false);
                      setTitleValue("");
                      setUrlValue("");
                      setSelectedFolder("");
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>
        </div>
      </div>
      
      {/* Folder-based Tabs */}
      {bookmarkTree.length > 0 && (
        <div className="w-full mt-3 pl-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center gap-2">
              <TabsList className="flex-1">
                <TabsTrigger value="All">All</TabsTrigger>
                {bookmarkFolders.map((folder) => (
                  <ContextMenu key={folder}>
                    <ContextMenuTrigger asChild>
                      <TabsTrigger value={folder}>
                        {folder}
                      </TabsTrigger>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onSelect={() => {
                          setRenamingFolder(folder);
                          setNewFolderName(folder);
                          setRenameFolderDialogOpen(true);
                        }}
                      >
                        <PencilIcon className="size-4" />
                        Rename Folder
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewFolderName("");
                  setNewFolderDialogOpen(true);
                }}
                className="h-8 px-2"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </Tabs>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full mt-3">
        {filteredBookmarks
          .sort((a, b) => sorts.find((s) => s.id === sort)?.sort(a, b) || 0)
          .map((bookmark, index) => (
            <div
              key={bookmark.id}
              className="flex flex-row gap-1 w-full select-none"
            >
              <div className="flex flex-col flex-1">
                <span
                  className={cn(
                    "text-sm text-muted-foreground font-medium",
                    index == 0
                      ? "mb-1 pl-2"
                      : getNumericalFullDate(
                          filteredBookmarks[index - 1].dateAdded!
                        ) == getNumericalFullDate(bookmark.dateAdded!)
                      ? ""
                      : "mb-1 pl-2"
                  )}
                >
                  {index == 0
                    ? makeGroupHeader(bookmark.dateAdded!)
                    : getNumericalFullDate(
                        filteredBookmarks[index - 1].dateAdded!
                      ) == getNumericalFullDate(bookmark.dateAdded!)
                    ? ""
                    : makeGroupHeader(bookmark.dateAdded!)}
                </span>
                <ContextMenu>
                  <ContextMenuTrigger>
                    <div className="isolate relative flex flex-col p-2">
                      <a
                        href={bookmark.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group focus:outline-none"
                        onKeyDown={(e) => {
                          if (
                            e.key === " " &&
                            !document.activeElement?.classList.contains(
                              "title-edit-box"
                            )
                          ) {
                            e.preventDefault();
                            const element = document.getElementById(
                              `${bookmark.id}-title`
                            );
                            focusEndContentEditable(element!);
                          }
                        }}
                        onClick={(e) => {
                          if (tabs.some((tab) => tab.url === bookmark.url)) {
                            e.preventDefault();
                            chrome.tabs.update(
                              tabs.find((tab) => tab.url === bookmark.url)!.id!,
                              {
                                active: true,
                              }
                            );
                          }
                          if (!bookmark.title.endsWith(" [read]")) {
                            chrome.bookmarks.update(bookmark.id!, {
                              title: `${bookmark.title} [read]`,
                            });
                          }
                        }}
                      >
                        <span className="absolute inset-0 hover:bg-foreground/5 rounded-md group-focus-within:bg-foreground/5 group-focus-within:outline-2 transition-all"></span>
                        <div className="flex flex-row gap-1.5 items-center">
                          <div
                            className={cn("bg-primary size-2.5 rounded-full", {
                              hidden: bookmark.title.endsWith(" [read]"),
                            })}
                            aria-hidden
                          ></div>
                          <span
                            className="title-edit-box text-sm font-medium outline-none"
                            contentEditable
                            spellCheck={false}
                            id={`${bookmark.id}-title`}
                            tabIndex={-1}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={(e) => {
                              chrome.bookmarks.get(
                                bookmark.id!,
                                (bookmarks) => {
                                  const priorTitle = bookmarks[0].title;
                                  const isRead = priorTitle.endsWith(" [read]");
                                  if (priorTitle !== e.target.innerText) {
                                    chrome.bookmarks.update(bookmark.id!, {
                                      title: `${e.target.innerText}${
                                        isRead &&
                                        !e.target.innerText.endsWith(" [read]")
                                          ? " [read]"
                                          : ""
                                      }`,
                                    });
                                  }
                                }
                              );
                            }}
                          >
                            {bookmark.title.endsWith(" [read]")
                              ? trimEnd(bookmark.title, " [read]")
                              : bookmark.title}
                          </span>
                        </div>
                      </a>
                      <span className="text-sm text-muted-foreground">
                        {new URL(bookmark.url!).hostname}
                        {new URL(bookmark.url!).pathname}
                      </span>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onSelect={() => {
                        setTimeout(() => {
                          const element = document.getElementById(
                            `${bookmark.id}-title`
                          );
                          focusEndContentEditable(element!);
                        }, 200);
                      }}
                    >
                      <PencilIcon className="size-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        chrome.bookmarks.get(bookmark.id!, (bookmarks) => {
                          const priorTitle = bookmarks[0].title;
                          const isRead = priorTitle.endsWith(" [read]");
                          if (isRead) {
                            chrome.bookmarks.update(bookmark.id!, {
                              title: priorTitle.replace(" [read]", ""),
                            });
                          } else {
                            chrome.bookmarks.update(bookmark.id!, {
                              title: `${priorTitle} [read]`,
                            });
                          }
                        });
                      }}
                    >
                      <Check className="size-4" /> Mark as{" "}
                      {bookmark.title.endsWith(" [read]") ? "unread" : "read"}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        setMovingBookmark(bookmark);
                        setSelectedFolder("Bookmarks Bar");
                        setMoveFolderDialogOpen(true);
                      }}
                    >
                      <FolderOpen className="size-4" />
                      Move to Folder
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={async () => {
                        const shareData = {
                          title: bookmark.title.endsWith(" [read]")
                            ? trimEnd(bookmark.title, " [read]")
                            : bookmark.title,
                          url: bookmark.url!,
                        };

                        // Try to use Web Share API if available
                        if (
                          navigator.share &&
                          navigator.canShare &&
                          navigator.canShare(shareData)
                        ) {
                          try {
                            await navigator.share(shareData);
                            toast("Bookmark shared successfully");
                          } catch (error) {
                            if (
                              error instanceof Error &&
                              error.name !== "AbortError"
                            ) {
                              await navigator.clipboard.writeText(
                                `${shareData.title} - ${shareData.url}`
                              );
                              toast("Bookmark copied to clipboard");
                            }
                          }
                        } else {
                          try {
                            await navigator.clipboard.writeText(
                              `${shareData.title} - ${shareData.url}`
                            );
                            toast("Bookmark copied to clipboard");
                          } catch (error) {
                            toast("Failed to copy bookmark", {
                              description: "Unable to access clipboard",
                            });
                            console.log(error);
                          }
                        }
                      }}
                    >
                      <Share className="size-4" />
                      Share
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        try {
                          chrome.bookmarks
                            .remove(bookmark.id!)
                            .then(() => {
                              toast("Bookmark has been deleted", {
                                description: bookmark.url,
                                action: {
                                  label: "Undo",
                                  onClick: () => {
                                    chrome.bookmarks.create({
                                      url: bookmark.url!,
                                      title: bookmark.title!,
                                      parentId: bookmark.parentId!,
                                    });
                                  },
                                },
                              });
                            })
                            .catch((error) => {
                              toast("Error deleting bookmark", {
                                description: error.message,
                              });
                            });
                        } catch (error) {
                          toast("Error deleting bookmark", {
                            description:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                          });
                        }
                      }}
                      variant="destructive"
                    >
                      <TrashIcon /> Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </div>
          ))}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your bookmarks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="new-folder-name">Folder Name</Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newFolderName.trim()) {
                      createFolder(newFolderName.trim());
                      setNewFolderDialogOpen(false);
                      setNewFolderName("");
                    }
                  }
                }}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!newFolderName.trim()}
              onClick={() => {
                if (newFolderName.trim()) {
                  createFolder(newFolderName.trim());
                  setNewFolderDialogOpen(false);
                  setNewFolderName("");
                }
              }}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderDialogOpen} onOpenChange={setRenameFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Rename the folder "{renamingFolder}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newFolderName.trim() && newFolderName.trim() !== renamingFolder) {
                      renameFolder(renamingFolder, newFolderName.trim());
                      setRenameFolderDialogOpen(false);
                      setNewFolderName("");
                      setRenamingFolder("");
                    }
                  }
                }}
                placeholder="Enter new folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {
                setNewFolderName("");
                setRenamingFolder("");
              }}>Cancel</Button>
            </DialogClose>
            <Button
              disabled={!newFolderName.trim() || newFolderName.trim() === renamingFolder}
              onClick={() => {
                if (newFolderName.trim() && newFolderName.trim() !== renamingFolder) {
                  renameFolder(renamingFolder, newFolderName.trim());
                  setRenameFolderDialogOpen(false);
                  setNewFolderName("");
                  setRenamingFolder("");
                }
              }}
            >
              Rename Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Bookmark Dialog */}
      <Dialog open={moveFolderDialogOpen} onOpenChange={setMoveFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Move Bookmark</DialogTitle>
            <DialogDescription>
              Choose where to move "{movingBookmark?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="move-folder-select">Destination Folder</Label>
              <select
                id="move-folder-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="Bookmarks Bar">Bookmarks Bar</option>
                <option value="Other Bookmarks">Other Bookmarks</option>
                {bookmarkFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {
                setSelectedFolder("");
                setMovingBookmark(null);
              }}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (movingBookmark && selectedFolder) {
                  moveBookmark(movingBookmark.id!, selectedFolder);
                  setMoveFolderDialogOpen(false);
                  setSelectedFolder("");
                  setMovingBookmark(null);
                }
              }}
            >
              Move Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
