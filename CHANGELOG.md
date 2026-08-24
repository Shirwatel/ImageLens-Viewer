# Changelog

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
