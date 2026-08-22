const DEFAULTS = {
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
};

const app = document.querySelector(".glass-app");
let settings = { ...DEFAULTS };
let saveTimer = null;

function applyTheme(theme) {
  let resolved = theme;
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  app.dataset.theme = resolved;
}

function flashSaved() {
  const el = document.getElementById("saveStatus");
  el.textContent = "Saved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => (el.textContent = ""), 1200);
}

function persist(partial) {
  Object.assign(settings, partial);
  chrome.storage.sync.set(partial, flashSaved);
}

function renderZoomSeg() {
  document.querySelectorAll("#zoomModeSeg .seg-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === settings.initialZoomMode);
  });
}

function renderHostList() {
  const list = document.getElementById("hostList");
  list.innerHTML = "";
  if (settings.autoClickHosts.length === 0) {
    list.innerHTML = '<span class="chip-empty">No sites added yet</span>';
    return;
  }
  settings.autoClickHosts.forEach((host) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${host} <button data-host="${host}">&#10005;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const next = settings.autoClickHosts.filter((h) => h !== host);
      persist({ autoClickHosts: next });
      renderHostList();
    });
    list.appendChild(chip);
  });
}

function renderOverrideList() {
  const list = document.getElementById("overrideList");
  list.innerHTML = "";
  const entries = Object.entries(settings.siteOverrides || {});
  if (entries.length === 0) {
    list.innerHTML = '<span class="chip-empty">No per-site overrides yet</span>';
    return;
  }
  entries.forEach(([host, val]) => {
    const chip = document.createElement("span");
    chip.className = "chip " + (val ? "on" : "off");
    chip.innerHTML = `${host} — ${val ? "one-click on" : "one-click off"} <button data-host="${host}">&#10005;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const next = { ...settings.siteOverrides };
      delete next[host];
      persist({ siteOverrides: next });
      renderOverrideList();
    });
    list.appendChild(chip);
  });
}

async function init() {
  settings = await new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
  applyTheme(settings.theme);

  renderZoomSeg();
  document.getElementById("bgColor").value = settings.backgroundColor;
  document.getElementById("bgColorValue").textContent = settings.backgroundColor;
  document.getElementById("hideScrollbars").checked = settings.hideScrollbars;
  document.getElementById("enhanceNative").checked = settings.enhanceNativeImagePages;
  document.getElementById("clickToView").checked = settings.clickToView;
  renderHostList();
  renderOverrideList();
}

document.querySelectorAll("#zoomModeSeg .seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    persist({ initialZoomMode: btn.dataset.value });
    renderZoomSeg();
  });
});

document.getElementById("bgColor").addEventListener("input", (e) => {
  document.getElementById("bgColorValue").textContent = e.target.value;
  persist({ backgroundColor: e.target.value });
});

document.getElementById("bgColorReset").addEventListener("click", () => {
  const val = DEFAULTS.backgroundColor;
  document.getElementById("bgColor").value = val;
  document.getElementById("bgColorValue").textContent = val;
  persist({ backgroundColor: val });
});

document.getElementById("hideScrollbars").addEventListener("change", (e) => {
  persist({ hideScrollbars: e.target.checked });
});

document.getElementById("enhanceNative").addEventListener("change", (e) => {
  persist({ enhanceNativeImagePages: e.target.checked });
});

document.getElementById("clickToView").addEventListener("change", (e) => {
  persist({ clickToView: e.target.checked });
});

document.getElementById("addHost").addEventListener("click", () => {
  const input = document.getElementById("hostInput");
  let val = input.value.trim().toLowerCase();
  if (!val) return;
  val = val.replace(/^https?:\/\//, "").split("/")[0];
  if (!settings.autoClickHosts.includes(val)) {
    persist({ autoClickHosts: [...settings.autoClickHosts, val] });
    renderHostList();
  }
  input.value = "";
});

document.getElementById("hostInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addHost").click();
});

document.getElementById("themeToggle").addEventListener("click", () => {
  const order = ["system", "light", "dark"];
  const idx = (order.indexOf(settings.theme) + 1) % order.length;
  persist({ theme: order[idx] });
  applyTheme(order[idx]);
});

init();
