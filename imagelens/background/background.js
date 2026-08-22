function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "imagelens-open",
      title: "Open in ImageLens Viewer",
      contexts: ["image"]
    });
  });
}

chrome.runtime.onStartup.addListener(createContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "imagelens-open" || !tab || !tab.id) return;
  sendOpenImage(tab.id, info.srcUrl);
});

function sendOpenImage(tabId, src, alreadyRetried) {
  chrome.tabs.sendMessage(tabId, { type: "ILV_OPEN_IMAGE", src }, () => {
    if (!chrome.runtime.lastError) return; // delivered fine

    // Most likely cause: the tab was already open before the extension's
    // content script was installed/updated, so nothing is listening yet.
    // Inject it fresh and retry once.
    if (alreadyRetried) return;

    chrome.scripting.executeScript(
      { target: { tabId }, files: ["content/content.js"] },
      () => {
        if (chrome.runtime.lastError) return; // e.g. restricted page (chrome://, Web Store, etc.)
        chrome.scripting.insertCSS(
          { target: { tabId }, files: ["content/content.css"] },
          () => sendOpenImage(tabId, src, true)
        );
      }
    );
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  createContextMenu();
  if (details.reason === "install") {
    chrome.storage.sync.get(null, (stored) => {
      if (Object.keys(stored).length === 0) {
        chrome.storage.sync.set({
          backgroundColor: "#0b0b0f",
          initialZoomMode: "fit",
          hideScrollbars: true,
          enhanceNativeImagePages: true,
          clickToView: true,
          autoClickHosts: [
            "reddit.com", "i.redd.it", "preview.redd.it",
            "imgur.com", "imgbb.com", "imgbox.com", "imx.to",
            "jpg5.su", "jpeg5.com", "imagetwist.com"
          ],
          siteOverrides: {},
          theme: "system"
        });
      }
    });
  }
});
