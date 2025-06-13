chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage(() => console.log("options page opened"));
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-tabisphere",
    title: "Save to Tabisphere",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-tabisphere") {
    try {
      let title, url;

      if (info.linkUrl) {
        console.log(info);
        url = info.linkUrl;
        title = info.linkText || info.selectionText || new URL(url).hostname;
      } else {
        url = tab.url;
        title = tab.title;
      }

      await chrome.bookmarks.create({
        parentId: "1",
        title: title,
        url: url,
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Bookmark Saved",
        message: `"${title}" saved to Tabisphere`,
      });
    } catch (error) {
      console.error("Failed to save bookmark:", error);

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Error",
        message: "Failed to save bookmark",
      });
    }
  }
});
