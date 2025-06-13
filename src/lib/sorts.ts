type Sort = {
  name: string;
  default: boolean;
  id: string;
  sort: (
    a: chrome.bookmarks.BookmarkTreeNode,
    b: chrome.bookmarks.BookmarkTreeNode
  ) => number;
};

const sorts: Sort[] = [
  {
    name: "Newest",
    default: true,
    id: "newest",
    sort: (a, b) => b.dateAdded! - a.dateAdded!,
  },
  {
    name: "Oldest",
    default: false,
    id: "oldest",
    sort: (a, b) => a.dateAdded! - b.dateAdded!,
  },
  {
    name: "A-Z",
    default: false,
    id: "a-z",
    sort: (a, b) => a.title!.localeCompare(b.title!),
  },
  {
    name: "Z-A",
    default: false,
    id: "z-a",
    sort: (a, b) => b.title!.localeCompare(a.title!),
  },
];

export { sorts, type Sort };
