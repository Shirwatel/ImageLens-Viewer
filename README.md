like the tool? consider a tip plz? https://www.paypal.me/shirwatel

# Changelog

All notable changes to ImageLens Viewer are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.3.0] - 2026-08-27

### Added
- **Firefox support** — a parallel build with the manifest adjusted for Firefox's WebExtensions implementation (`background.scripts` instead of `service_worker`, `options_ui`, `spanning` incognito mode, and a stable extension ID so `storage.sync` works correctly).
- **Inline SVG support** — Alt+Click or one-click sites now also work on inline `<svg>` elements embedded directly in a page, not just `<img>` tags (which already worked, since they're just normal images).
- **"Scale small images up to fit"** setting — lets "Fit to window" enlarge images smaller than the window instead of only ever shrinking, never growing them.
- **"Keep within window while dragging"** setting — the image's edge stops right at the window's edge like hitting a wall, instead of dragging past it. Independent from the existing zoom-out limit.
- **Ctrl+Shift+Scroll** for vertical panning, alongside the existing Shift+Scroll for horizontal.
- **Toolbar color and transparency settings** — pick any toolbar color (now defaults to a neutral gray instead of white-tinted glass, for better icon visibility on light backgrounds) and toggle between a translucent blurred panel or a fully solid one.

### Changed
- Clicking the image to zoom from fit to actual size now keeps whatever point you clicked fixed under the cursor, instead of always snapping to center.

### Fixed
- Scrolling to zoom out no longer gets stuck silently panning instead of shrinking when it hits the zoom-out limit — scale and position now stay in sync.
- Saving an image with rotation or flip applied could silently save the untouched original instead. Caused by a separate CORS-mode re-fetch of the image failing outright on hosts without CORS headers (the common case) rather than just restricting canvas access. Save now uses the already-displayed image directly, which works correctly for same-origin and local files.

## [1.1.0] - 2026-08-24

### Added
- **Flip controls** — flip the image horizontally or vertically from the toolbar, or with the `H` / `V` keys.
- **Save image** — export the currently viewed image with rotation and flip baked in, via the toolbar button or the `S` key. Falls back to saving the original file untouched if the source is cross-origin and blocks canvas access.
- **Right-click → "Open in ImageLens Viewer"** — a new context menu entry on any image, as an alternative to Alt+Click.
- **Hold Ctrl+Shift to reveal the toolbar** — the toolbar and close button are now hidden by default and only appear while both keys are held, hiding again the instant you let go (or if the window loses focus mid-hold).
- **Click outside the image to exit** — clicking the image itself still toggles fit/actual size, but clicking the backdrop area outside the image's edges now closes the viewer (or navigates back, on a directly-opened image page).
- **"Limit zooming out" setting** — optionally prevents zooming out past fit-to-window.

### Changed
- **Dragging is now completely unrestricted** — panning no longer stops or bounces back at any edge, at any zoom level, in any direction.
- **Ctrl+scroll now zooms** instead of panning vertically, so it matches trackpads' native pinch-to-zoom gesture instead of hijacking it into an unrelated pan.
- Removed the **pixelate** feature (toolbar button and `P` shortcut) in favor of flip and save.

### Fixed
- Scroll-wheel zoom, drag panning, and keyboard shortcuts stopped responding after the pixelate removal, caused by a leftover reference to a removed canvas element. All input handling is restored.
- Native browser "Copy image" / "Save image as" were missing when right-clicking inside ImageLens's own viewer, because the displayed image had pointer events disabled for pan/zoom purposes. Right-click now correctly targets the image, restoring those native options.
- Dragging could silently fail to register (falling through to a click instead) because the browser's native "drag the image out" ghost behavior was intercepting the pointer. Explicitly suppressed via `dragstart` prevention and CSS.
- The viewer's cursor was permanently stuck showing the zoom-out (magnifying glass with a minus) icon. It now shows a normal cursor by default, and a grabbing-hand cursor only while actively dragging.
- Right-clicking an image in a tab that was already open before an install/update could throw `Could not establish connection. Receiving end does not exist.` The background script now detects this and re-injects the content script automatically before retrying.

## [1.0.0] - 2026-08-22

### Added
- Initial release: zoom to cursor, click-and-drag panning, rotation (`Q` / `E` and Alt+scroll), pixelation (`P`), fit/actual-size toggle, double-click reset.
- Automatic upgrade of Chrome's native image viewer on direct image URLs.
- Alt+Click to open any image on any page in a full-screen overlay.
- One-click viewing (no modifier needed) pre-configured for Reddit, Imgur, ImgBB, imgbox, and other image hosts, with per-site overrides.
- Options page and popup with light/dark Liquid Glass theming.
