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
    siteOverrides: {}, // hostname -> boolean, lets plain click work without Alt
    uiVisibility: "auto", // 'auto' (hide until you move the mouse) | 'always'
    constrainToWindow: true, // keep the image from being panned/zoomed off-screen
    constrainDragToWindow: false, // also clamp dragging/panning to the window bounds
    upscaleSmallImages: false, // let "fit to window" scale small images up too, not just down
    toolbarColor: "#4b4b54", // gray by default so white icons stay visible on any backdrop
    toolbarTransparent: true // translucent + blurred, vs. a fully solid panel
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

  function hexToRgbTriplet(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!m) return "75, 75, 84";
    return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
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
      this.uiAuto = settings.uiVisibility !== "always";
      this._build();
      this._bind();
      this._setInitialZoom();
    }

    _build() {
      const root = document.createElement("div");
      root.className = "ilv-root" + (this.opts.overlay ? " ilv-overlay" : " ilv-native");
      root.style.setProperty("--ilv-bg", settings.backgroundColor);
      root.style.setProperty("--ilv-toolbar-rgb", hexToRgbTriplet(settings.toolbarColor));
      root.style.setProperty("--ilv-toolbar-alpha", settings.toolbarTransparent ? "0.55" : "1");

      const viewport = document.createElement("div");
      viewport.className = "ilv-viewport";

      const wrap = document.createElement("div");
      wrap.className = "ilv-wrap";

      const img = document.createElement("img");
      img.className = "ilv-img";
      img.draggable = false;
      img.src = this.imgSrc;
      img.addEventListener("dragstart", (e) => e.preventDefault());

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

      if (!this.uiAuto) {
        root.classList.add("ilv-ui-visible");
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
      this._onModKeyDown = this._onModKeyDown.bind(this);
      this._onModKeyUp = this._onModKeyUp.bind(this);
      this._onBlur = this._onBlur.bind(this);

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

      if (this.uiAuto) {
        window.addEventListener("keydown", this._onModKeyDown);
        window.addEventListener("keyup", this._onModKeyUp);
        window.addEventListener("blur", this._onBlur);
      }
    }

    _unbind() {
      this.viewport.removeEventListener("wheel", this._onWheel);
      this.viewport.removeEventListener("mousedown", this._onDown);
      window.removeEventListener("mousemove", this._onMove);
      window.removeEventListener("mouseup", this._onUp);
      window.removeEventListener("keydown", this._onKey, true);
      window.removeEventListener("keydown", this._onModKeyDown);
      window.removeEventListener("keyup", this._onModKeyUp);
      window.removeEventListener("blur", this._onBlur);
    }

    _showControls() {
      this.root.classList.add("ilv-ui-visible");
    }

    _hideControls() {
      this.root.classList.remove("ilv-ui-visible");
    }

    _onModKeyDown(e) {
      if (e.ctrlKey && e.shiftKey) this._showControls();
    }

    _onModKeyUp(e) {
      // Either key's own keyup event already reflects the released state
      if (!(e.ctrlKey && e.shiftKey)) this._hideControls();
    }

    _onBlur() {
      // Don't get stuck "visible" if the window loses focus while held
      this._hideControls();
    }

    _setInitialZoom() {
      const vw = this.viewport.clientWidth || window.innerWidth;
      const vh = this.viewport.clientHeight || window.innerHeight;
      const iw = this.img.naturalWidth || 1;
      const ih = this.img.naturalHeight || 1;
      const rawFit = Math.min(vw / iw, vh / ih) || 1;
      // Normally "fit" never upscales a small image past its natural size —
      // only when the setting is on does fit-to-window also scale small
      // images UP to fill the window.
      this.fitScale = settings.upscaleSmallImages ? rawFit : Math.min(rawFit, 1);
      this.scale = settings.initialZoomMode === "actual" ? 1 : this.fitScale;
      this.isFit = settings.initialZoomMode !== "actual";
      this.tx = 0;
      this.ty = 0;
      this._applyTransform();
    }

    _applyTransform() {
      if (!this.fitScale) {
        // not loaded yet — nothing to constrain
      } else {
        if (settings.constrainToWindow && this.scale < this.fitScale) {
          this.scale = this.fitScale;
        }
        if (settings.constrainDragToWindow) this._clampPosition();
      }
      const sx = (this.flipX ? -1 : 1) * this.scale;
      const sy = (this.flipY ? -1 : 1) * this.scale;
      const t = `translate(-50%, -50%) translate(${this.tx}px, ${this.ty}px) rotate(${this.rotation}deg) scale(${sx}, ${sy})`;
      this.wrap.style.transform = t;
    }

    _clampPosition() {
      // The image's own edge acts as a wall against the window's edge:
      // - If the image is bigger than the window, you can't drag far enough
      //   to reveal a gap past its edge.
      // - If the image is smaller than the window, you can slide it around,
      //   but it stops the moment its edge reaches the window's edge.
      const vw = this.viewport.clientWidth || window.innerWidth;
      const vh = this.viewport.clientHeight || window.innerHeight;
      const iw = this.img.naturalWidth * this.scale;
      const ih = this.img.naturalHeight * this.scale;
      const rad = (this.rotation * Math.PI) / 180;
      const bw = Math.abs(iw * Math.cos(rad)) + Math.abs(ih * Math.sin(rad));
      const bh = Math.abs(iw * Math.sin(rad)) + Math.abs(ih * Math.cos(rad));

      const maxTx = Math.abs(bw - vw) / 2;
      const maxTy = Math.abs(bh - vh) / 2;
      this.tx = Math.min(Math.max(this.tx, -maxTx), maxTx);
      this.ty = Math.min(Math.max(this.ty, -maxTy), maxTy);
    }

    _onWheel(e) {
      e.preventDefault();
      if (e.altKey) {
        this.rotate(e.deltaY > 0 ? 15 : -15);
        return;
      }
      if (e.shiftKey && e.ctrlKey) {
        // Vertical pan
        this.ty -= e.deltaY;
        this._applyTransform();
        return;
      }
      if (e.shiftKey) {
        // Horizontal pan
        this.tx -= e.deltaY;
        this._applyTransform();
        return;
      }
      // Note: Ctrl+wheel alone is treated as zoom (not pan) on purpose — trackpads
      // send Ctrl+wheel for pinch-to-zoom gestures, so panning here would
      // hijack that gesture and throw off the cursor-centered zoom.
      // Zoom centered on cursor
      const rect = this.viewport.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const minScale = settings.constrainToWindow && this.fitScale ? this.fitScale : 0.05;
      const newScale = Math.min(Math.max(this.scale * factor, minScale), 20);
      const ratio = newScale / this.scale;
      this.tx = cx - (cx - this.tx) * ratio;
      this.ty = cy - (cy - this.ty) * ratio;
      this.scale = newScale;
      this.isFit = false;
      this._applyTransform();
    }

    _onDown(e) {
      if (e.button !== 0) return;
      e.preventDefault(); // stop the browser's native image-drag ghost from stealing the pointer
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

      const rect = this.img.getBoundingClientRect();
      const insideImage =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!insideImage) {
        this._exit();
        return;
      }

      const vpRect = this.viewport.getBoundingClientRect();
      const cx = e.clientX - vpRect.left - vpRect.width / 2;
      const cy = e.clientY - vpRect.top - vpRect.height / 2;
      this.toggleFit(cx, cy);
    }

    _exit() {
      if (this.opts.overlay) {
        this.destroy();
      } else if (window.history.length > 1) {
        window.history.back();
      }
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

    toggleFit(cx = 0, cy = 0) {
      if (this.isFit) {
        // Zooming in: keep the clicked point fixed under the cursor,
        // the same way wheel-zoom does, instead of snapping to center.
        const newScale = 1;
        const ratio = newScale / this.scale;
        this.tx = cx - (cx - this.tx) * ratio;
        this.ty = cy - (cy - this.ty) * ratio;
        this.scale = newScale;
        this.isFit = false;
      } else {
        // Zooming back out to fit: show the whole image, centered.
        this.scale = this.fitScale;
        this.isFit = true;
        this.tx = 0;
        this.ty = 0;
      }
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
      // Bake the current rotation/flip into the saved file via canvas, using
      // the image already displayed in the viewer (not a separate re-fetch —
      // re-fetching with crossOrigin="anonymous" fails outright on the many
      // hosts that don't send CORS headers, which was silently discarding
      // the rotation/flip and saving the untouched original instead).
      const iw = this.img.naturalWidth;
      const ih = this.img.naturalHeight;
      if (!iw || !ih) {
        this._triggerDownload(this.imgSrc, this._filenameFromSrc());
        return;
      }

      try {
        const swap = Math.abs(this.rotation % 180) === 90;
        const canvas = document.createElement("canvas");
        canvas.width = swap ? ih : iw;
        canvas.height = swap ? iw : ih;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.drawImage(this.img, -iw / 2, -ih / 2, iw, ih);
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
        // Genuinely cross-origin source with no CORS support — the browser
        // won't allow reading its pixels at all, so this is the one case
        // where we can't bake in the transform and fall back to the original.
        this._triggerDownload(this.imgSrc, this._filenameFromSrc());
      }
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

  function isEligibleImage(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 80) return false;
    if (el.tagName === "IMG") return !!el.src;
    if (el.tagName === "svg" || el.tagName === "SVG") return true; // inline SVG
    return false;
  }

  function svgToDataUrl(svgEl) {
    const clone = svgEl.cloneNode(true);
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    // Carry over explicit pixel dimensions when the SVG only has a viewBox,
    // so it doesn't rasterize at the browser's small default replaced size.
    if (!clone.getAttribute("width") || !clone.getAttribute("height")) {
      const r = svgEl.getBoundingClientRect();
      if (!clone.getAttribute("width")) clone.setAttribute("width", String(Math.round(r.width)));
      if (!clone.getAttribute("height")) clone.setAttribute("height", String(Math.round(r.height)));
    }
    const svgStr = new XMLSerializer().serializeToString(clone);
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  }

  function srcForTarget(el) {
    if (el.tagName === "IMG") return el.currentSrc || el.src;
    return svgToDataUrl(el); // inline <svg>
  }

  function onDocumentClick(e) {
    if (e.target.closest && e.target.closest(".ilv-root")) return; // ignore clicks inside our own viewer
    const target = e.target.closest && e.target.closest("img, svg");
    if (!target || !isEligibleImage(target)) return;

    const hostname = location.hostname;
    const autoHost = hostMatches(settings.autoClickHosts, hostname);
    const override = settings.siteOverrides[hostname];
    const oneClickEnabled = override === true || (override !== false && autoHost);

    if (e.altKey && settings.clickToView) {
      e.preventDefault();
      e.stopPropagation();
      openOverlay(srcForTarget(target));
      return;
    }
    if (oneClickEnabled && settings.clickToView) {
      e.preventDefault();
      e.stopPropagation();
      openOverlay(srcForTarget(target));
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
