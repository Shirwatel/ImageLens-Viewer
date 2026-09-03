const DEFAULTS = {
  clickToView: true,
  enhanceNativeImagePages: true,
  siteOverrides: {},
  autoClickHosts: [
    "reddit.com", "i.redd.it", "preview.redd.it",
    "imgur.com", "imgbb.com", "imgbox.com", "imx.to",
    "jpg5.su", "jpeg5.com", "imagetwist.com"
  ],
  theme: "system",
  uiVisibility: "auto",
  constrainToWindow: true
};

const app = document.querySelector(".glass-app");
const hostLabel = document.getElementById("hostLabel");
const siteToggle = document.getElementById("siteToggle");
const altClickToggle = document.getElementById("altClickToggle");
const nativeToggle = document.getElementById("nativeToggle");
const uiAutoHideToggle = document.getElementById("uiAutoHideToggle");
const constrainToggle = document.getElementById("constrainToggle");
const themeToggle = document.getElementById("themeToggle");
const openOptions = document.getElementById("openOptions");

let currentHost = "";
let settings = { ...DEFAULTS };

function applyTheme(theme) {
  let resolved = theme;
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  app.dataset.theme = resolved;
}

function hostMatches(list, hostname) {
  return list.some((h) => hostname === h || hostname.endsWith("." + h));
}

async function getActiveHost() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        const url = new URL(tabs[0].url);
        resolve(url.hostname);
      } catch {
        resolve("");
      }
    });
  });
}

async function init() {
  settings = await new Promise((resolve) =>
    chrome.storage.sync.get(DEFAULTS, resolve)
  );
  applyTheme(settings.theme);

  currentHost = await getActiveHost();
  hostLabel.textContent = currentHost || "this page";

  const override = settings.siteOverrides[currentHost];
  const autoHost = hostMatches(settings.autoClickHosts, currentHost);
  siteToggle.checked = override === true || (override !== false && autoHost);

  altClickToggle.checked = settings.clickToView;
  nativeToggle.checked = settings.enhanceNativeImagePages;
  uiAutoHideToggle.checked = settings.uiVisibility === "auto";
  constrainToggle.checked = settings.constrainToWindow;
}

siteToggle.addEventListener("change", () => {
  const overrides = { ...settings.siteOverrides, [currentHost]: siteToggle.checked };
  settings.siteOverrides = overrides;
  chrome.storage.sync.set({ siteOverrides: overrides });
});

altClickToggle.addEventListener("change", () => {
  settings.clickToView = altClickToggle.checked;
  chrome.storage.sync.set({ clickToView: altClickToggle.checked });
});

nativeToggle.addEventListener("change", () => {
  settings.enhanceNativeImagePages = nativeToggle.checked;
  chrome.storage.sync.set({ enhanceNativeImagePages: nativeToggle.checked });
});

uiAutoHideToggle.addEventListener("change", () => {
  const value = uiAutoHideToggle.checked ? "auto" : "always";
  settings.uiVisibility = value;
  chrome.storage.sync.set({ uiVisibility: value });
});

constrainToggle.addEventListener("change", () => {
  settings.constrainToWindow = constrainToggle.checked;
  chrome.storage.sync.set({ constrainToWindow: constrainToggle.checked });
});

themeToggle.addEventListener("click", () => {
  const order = ["system", "light", "dark"];
  const idx = (order.indexOf(settings.theme) + 1) % order.length;
  settings.theme = order[idx];
  chrome.storage.sync.set({ theme: settings.theme });
  applyTheme(settings.theme);
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
