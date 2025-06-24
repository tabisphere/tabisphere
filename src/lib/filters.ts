export const filters = {
  title: {
    name: "Title",
    id: "title",
    options: [
      {
        name: "Starts with",
        id: "starts-with",
        checkFilter: (text: string, filter: string) => {
          return text.startsWith(filter);
        },
      },
      {
        name: "Ends with",
        id: "ends-with",
        checkFilter: (text: string, filter: string) => {
          return text.endsWith(filter);
        },
      },
      {
        name: "Contains",
        id: "contains",
        checkFilter: (text: string, filter: string) => {
          return text.includes(filter);
        },
      },
      {
        name: "Is",
        id: "is",
        checkFilter: (text: string, filter: string) => {
          return text === filter;
        },
      },
      {
        name: "Doesn't start with",
        id: "does-not-start-with",
        checkFilter: (text: string, filter: string) => {
          return !text.startsWith(filter);
        },
      },
      {
        name: "Doesn't end with",
        id: "does-not-end-with",
        checkFilter: (text: string, filter: string) => {
          return !text.endsWith(filter);
        },
      },
      {
        name: "Doesn't contain",
        id: "does-not-contain",
        checkFilter: (text: string, filter: string) => {
          return !text.includes(filter);
        },
      },
      {
        name: "Is not",
        id: "is-not",
        checkFilter: (text: string, filter: string) => {
          return text !== filter;
        },
      },
    ],
  },
  url: {
    name: "URL",
    id: "url",
    options: [
      {
        name: "Domain is",
        id: "domain-is",
        checkFilter: (url: string, filter: string) => {
          try {
            return new URL(url).hostname === filter;
          } catch {
            return false;
          }
        },
      },
      {
        name: "Domain contains",
        id: "domain-contains",
        checkFilter: (url: string, filter: string) => {
          try {
            return new URL(url).hostname.includes(filter);
          } catch {
            return false;
          }
        },
      },
      {
        name: "Path contains",
        id: "path-contains",
        checkFilter: (url: string, filter: string) => {
          try {
            return new URL(url).pathname.includes(filter);
          } catch {
            return false;
          }
        },
      },
      {
        name: "URL contains",
        id: "url-contains",
        checkFilter: (url: string, filter: string) => {
          return url.includes(filter);
        },
      },
      {
        name: "Is secure (HTTPS)",
        id: "is-secure",
        checkFilter: (url: string, filter: string) => {
          try {
            const isSecure = new URL(url).protocol === "https:";
            return filter.toLowerCase() === "true" ? isSecure : !isSecure;
          } catch {
            return false;
          }
        },
      },
    ],
  },
  date: {
    name: "Date added",
    id: "date",
    options: [
      {
        name: "Today",
        id: "today",
        checkFilter: (dateAdded: number) => {
          const today = new Date();
          const bookmarkDate = new Date(dateAdded);
          return (
            today.getDate() === bookmarkDate.getDate() &&
            today.getMonth() === bookmarkDate.getMonth() &&
            today.getFullYear() === bookmarkDate.getFullYear()
          );
        },
      },
      {
        name: "Yesterday",
        id: "yesterday",
        checkFilter: (dateAdded: number) => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const bookmarkDate = new Date(dateAdded);
          return (
            yesterday.getDate() === bookmarkDate.getDate() &&
            yesterday.getMonth() === bookmarkDate.getMonth() &&
            yesterday.getFullYear() === bookmarkDate.getFullYear()
          );
        },
      },
      {
        name: "This week",
        id: "this-week",
        checkFilter: (dateAdded: number) => {
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return dateAdded >= weekAgo.getTime();
        },
      },
      {
        name: "This month",
        id: "this-month",
        checkFilter: (dateAdded: number) => {
          const now = new Date();
          const bookmarkDate = new Date(dateAdded);
          return (
            now.getMonth() === bookmarkDate.getMonth() &&
            now.getFullYear() === bookmarkDate.getFullYear()
          );
        },
      },
      {
        name: "This year",
        id: "this-year",
        checkFilter: (dateAdded: number) => {
          const now = new Date();
          const bookmarkDate = new Date(dateAdded);
          return now.getFullYear() === bookmarkDate.getFullYear();
        },
      },
      {
        name: "Older than days",
        id: "older-than-days",
        checkFilter: (dateAdded: number, filter: string) => {
          const days = parseInt(filter);
          if (isNaN(days)) return false;
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          return dateAdded < cutoff.getTime();
        },
      },
      {
        name: "Newer than days",
        id: "newer-than-days",
        checkFilter: (dateAdded: number, filter: string) => {
          const days = parseInt(filter);
          if (isNaN(days)) return false;
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          return dateAdded >= cutoff.getTime();
        },
      },
    ],
  },
};
