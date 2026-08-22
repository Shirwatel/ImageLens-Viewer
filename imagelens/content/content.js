// ImageLens Viewer — content script
(function () {
  "use strict";

  const DEFAULTS = {
    backgroundColor: "#0b0b0f",
    initialZoomMode: "fit", // 'fit' | 'actual'
    hideScrollbars: true,
    enhanceNativeImagePages: true,
    clickToView: true, // Alt+Click opens any image
    autoClickHosts: [
      "reddit.com", "i.redd.it", "preview.redd.it",
      "imgur.com", "imgbb.com", "imgbox.com", "imx.to",
      "jpg5.su", "jpeg5.com", "imagetwist.com"
    ],
    siteOverrides: {} // hostname -> boolean, lets plain click work without Alt
  };

  let settings = { ...DEFAULTS };
  let activeViewer = null;

  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(DEFAULTS, (stored) => {
          settings = { ...DEFAULTS, ...stored };
          resolve(settings);
        });
      } catch (e) {
        resolve(settings);
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const key in changes) {
      settings[key] = changes[key].newValue;
    }
  });

  function hostMatches(list, hostname) {
    return list.some((h) => hostname === h || hostname.endsWith("." + h));
  }

  function isNativeImagePage() {
    // Chrome's built-in image viewer: <html><body><img></body></html>, nothing else
    if (document.images.length !== 1) return false;
    const body = document.body;
    if (!body) return false;
    const kids = Array.from(body.children).filter(
      (el) => el.tagName !== "SCRIPT" && el.tagName !== "STYLE"
    );
    if (kids.length !== 1) return false;
    if (kids[0].tagName !== "IMG") return false;
    // Rule out pages that merely happen to have one <img> amid lots of text nodes/content
    if (body.textContent.trim().length > 0) return false;
    return true;
  }

  // ---------- Viewer ----------

  class ImageViewer {
    constructor(imgSrc, opts) {
      this.opts = opts; // { overlay: bool, naturalWidth, naturalHeight, sourceImg }
      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
      this.rotation = 0;
      this.flipX = false;
      this.flipY = false;
      this.dragging = false;
      this.dragMoved = false;
      this.imgSrc = imgSrc;
      this._build();
      this._bind();
      this._setInitialZoom();
    }

    _build() {
      const root = document.createElement("div");
      root.className = "ilv-root" + (this.opts.overlay ? " ilv-overlay" : " ilv-native");
      root.style.setProperty("--ilv-bg", settings.backgroundColor);

      const viewport = document.createElement("div");
      viewport.className = "ilv-viewport";

      const wrap = document.createElement("div");
      wrap.className = "ilv-wrap";

      const img = document.createElement("img");
      img.className = "ilv-img";
      img.draggable = false;
      img.src = this.imgSrc;

      wrap.appendChild(img);
      viewport.appendChild(wrap);
      root.appendChild(viewport);

      const toolbar = this._buildToolbar();
      root.appendChild(toolbar);

      if (this.opts.overlay) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "ilv-close";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.innerHTML = "&#10005;";
        closeBtn.addEventListener("click", () => this.destroy());
        root.appendChild(closeBtn);
      }

      if (settings.hideScrollbars) {
        document.documentElement.classList.add("ilv-no-scroll");
      }

      document.documentElement.appendChild(root);

      this.root = root;
      this.viewport = viewport;
      this.wrap = wrap;
      this.img = img;

      const finish = () => this._setInitialZoom();
      if (img.complete) finish();
      else img.addEventListener("load", finish, { once: true });
    }

    _buildToolbar() {
      const bar = document.createElement("div");
      bar.className = "ilv-toolbar";

      const mkBtn = (label, title, onClick) => {
        const b = document.createElement("button");
        b.className = "ilv-btn";
        b.title = title;
        b.innerHTML = label;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          onClick();
        });
        return b;
      };

      bar.appendChild(mkBtn("&#8634;", "Rotate left (Q)", () => this.rotate(-90)));
      bar.appendChild(mkBtn("&#8635;", "Rotate right (E)", () => this.rotate(90)));
      bar.appendChild(mkBtn("&#9638;", "Toggle fit / actual size", () => this.toggleFit()));
      bar.appendChild(mkBtn("&#8596;", "Flip horizontal (H)", () => this.flipHorizontal()));
      bar.appendChild(mkBtn("&#8597;", "Flip vertical (V)", () => this.flipVertical()));
      bar.appendChild(mkBtn("&#128190;", "Save image (S)", () => this.save()));
      bar.appendChild(mkBtn("&#8635;&#8635;", "Reset view", () => this.reset()));

      return bar;
    }

    _bind() {
      this._onWheel = this._onWheel.bind(this);
      this._onDown = this._onDown.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onUp = this._onUp.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onKey = this._onKey.bind(this);

      this.viewport.addEventListener("wheel", this._onWheel, { passive: false });
      this.viewport.addEventListener("mousedown", this._onDown);
      window.addEventListener("mousemove", this._onMove);
      window.addEventListener("mouseup", this._onUp);
      this.viewport.addEventListener("click", this._onClick);
      window.addEventListener("keydown", this._onKey, true);
      this.viewport.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.reset();
      });
    }

    _unbind() {
      this.viewport.removeEventListener("wheel", this._onWheel);
      this.viewport.removeEventListener("mousedown", this._onDown);
      window.removeEventListener("mousemove", this._onMove);
      window.removeEventListener("mouseup", this._onUp);
      window.removeEventListener("keydown", this._onKey, true);
    }

    _setInitialZoom() {
      const vw = this.viewport.clientWidth || window.innerWidth;
      const vh = this.viewport.clientHeight || window.innerHeight;
      const iw = this.img.naturalWidth || 1;
      const ih = this.img.naturalHeight || 1;
      this.fitScale = Math.min(vw / iw, vh / ih, 1) || 1;
      this.scale = settings.initialZoomMode === "actual" ? 1 : this.fitScale;
      this.isFit = settings.initialZoomMode !== "actual";
      this.tx = 0;
      this.ty = 0;
      this._applyTransform();
    }

    _applyTransform() {
      const sx = (this.flipX ? -1 : 1) * this.scale;
      const sy = (this.flipY ? -1 : 1) * this.scale;
      const t = `translate(-50%, -50%) translate(${this.tx}px, ${this.ty}px) rotate(${this.rotation}deg) scale(${sx}, ${sy})`;
      this.wrap.style.transform = t;
    }

    _onWheel(e) {
      e.preventDefault();
      if (e.altKey) {
        this.rotate(e.deltaY > 0 ? 15 : -15);
        return;
      }
      if (e.shiftKey) {
        this.tx -= e.deltaY;
        this._applyTransform();
        return;
      }
      if (e.ctrlKey) {
        this.ty -= e.deltaY;
        this._applyTransform();
        return;
      }
      // Zoom centered on cursor
      const rect = this.viewport.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(this.scale * factor, 0.05), 20);
      const ratio = newScale / this.scale;
      this.tx = cx - (cx - this.tx) * ratio;
      this.ty = cy - (cy - this.ty) * ratio;
      this.scale = newScale;
      this.isFit = false;
      this._applyTransform();
    }

    _onDown(e) {
      if (e.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.origTx = this.tx;
      this.origTy = this.ty;
      this.viewport.classList.add("ilv-dragging");
    }

    _onMove(e) {
      if (!this.dragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragMoved = true;
      this.tx = this.origTx + dx;
      this.ty = this.origTy + dy;
      this._applyTransform();
    }

    _onUp() {
      this.dragging = false;
      this.viewport.classList.remove("ilv-dragging");
    }

    _onClick(e) {
      if (this.dragMoved) {
        this.dragMoved = false;
        return;
      }
      if (e.target.closest(".ilv-toolbar") || e.target.closest(".ilv-close")) return;
      this.toggleFit();
    }

    _onKey(e) {
      if (e.key === "Escape" && this.opts.overlay) {
        this.destroy();
      } else if (e.key === "q" || e.key === "Q") {
        this.rotate(-90);
      } else if (e.key === "e" || e.key === "E") {
        this.rotate(90);
      } else if (e.key === "h" || e.key === "H") {
        this.flipHorizontal();
      } else if (e.key === "v" || e.key === "V") {
        this.flipVertical();
      } else if (e.key === "s" || e.key === "S") {
        this.save();
      } else {
        return;
      }
      e.preventDefault();
    }

    toggleFit() {
      if (this.isFit) {
        this.scale = 1;
        this.isFit = false;
      } else {
        this.scale = this.fitScale;
        this.isFit = true;
      }
      this.tx = 0;
      this.ty = 0;
      this._applyTransform();
    }

    rotate(deg) {
      this.rotation = (this.rotation + deg) % 360;
      this._applyTransform();
    }

    reset() {
      this.rotation = 0;
      this._setInitialZoom();
    }

    flipHorizontal() {
      this.flipX = !this.flipX;
      this._applyTransform();
    }

    flipVertical() {
      this.flipY = !this.flipY;
      this._applyTransform();
    }

    _filenameFromSrc() {
      try {
        const u = new URL(this.imgSrc, location.href);
        let name = decodeURIComponent(u.pathname.split("/").pop() || "image");
        if (!name || !/\.[a-z0-9]{2,5}$/i.test(name)) name = (name || "image") + ".png";
        return name;
      } catch {
        return "image.png";
      }
    }

    _triggerDownload(url, filename) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
    }

    save() {
      // Try to bake the current rotation/flip into the saved file via canvas.
      // Falls back to saving the original file untouched if the source is
      // cross-origin without permissive CORS headers (canvas gets "tainted").
      const iw = this.img.naturalWidth;
      const ih = this.img.naturalHeight;
      if (!iw || !ih) {
        this._triggerDownload(this.imgSrc, this._filenameFromSrc());
        return;
      }

      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => {
        try {
          const swap = Math.abs(this.rotation % 180) === 90;
          const canvas = document.createElement("canvas");
          canvas.width = swap ? ih : iw;
          canvas.height = swap ? iw : ih;
          const ctx = canvas.getContext("2d");
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((this.rotation * Math.PI) / 180);
          ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
          ctx.drawImage(probe, -iw / 2, -ih / 2, iw, ih);
          canvas.toBlob((blob) => {
            if (!blob) {
              this._triggerDownload(this.imgSrc, this._filenameFromSrc());
              return;
            }
            const url = URL.createObjectURL(blob);
            const base = this._filenameFromSrc().replace(/\.[a-z0-9]{2,5}$/i, "");
            this._triggerDownload(url, `${base}-imagelens.png`);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }, "image/png");
        } catch {
          this._triggerDownload(this.imgSrc, this._filenameFromSrc());
        }
      };
      probe.onerror = () => {
        this._triggerDownload(this.imgSrc, this._filenameFromSrc());
      };
      probe.src = this.imgSrc;
    }

    destroy() {
      this._unbind();
      this.root.remove();
      document.documentElement.classList.remove("ilv-no-scroll");
      if (activeViewer === this) activeViewer = null;
    }
  }

  function openOverlay(src) {
    if (activeViewer) activeViewer.destroy();
    activeViewer = new ImageViewer(src, { overlay: true });
  }

  function enhanceNativePage() {
    const nativeImg = document.images[0];
    const src = nativeImg.src;
    document.documentElement.classList.add("ilv-native-host");
    // Remove default content, mount viewer directly
    document.body.innerHTML = "";
    document.body.style.margin = "0";
    activeViewer = new ImageViewer(src, { overlay: false });
  }

  function isEligibleImage(img) {
    const r = img.getBoundingClientRect();
    return r.width >= 80 && r.height >= 80 && img.src;
  }

  function onDocumentClick(e) {
    const img = e.target.closest && e.target.closest("img");
    if (!img || !isEligibleImage(img)) return;

    const hostname = location.hostname;
    const autoHost = hostMatches(settings.autoClickHosts, hostname);
    const override = settings.siteOverrides[hostname];
    const oneClickEnabled = override === true || (override !== false && autoHost);

    if (e.altKey && settings.clickToView) {
      e.preventDefault();
      e.stopPropagation();
      openOverlay(img.currentSrc || img.src);
      return;
    }
    if (oneClickEnabled && settings.clickToView) {
      e.preventDefault();
      e.stopPropagation();
      openOverlay(img.currentSrc || img.src);
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "ILV_OPEN_IMAGE" && msg.src) {
      openOverlay(msg.src);
    }
  });

  async function init() {
    await loadSettings();
    if (settings.enhanceNativeImagePages && isNativeImagePage()) {
      enhanceNativePage();
      return;
    }
    document.addEventListener("click", onDocumentClick, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
