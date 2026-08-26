# ImageLens Viewer
happy about the extension? a donation would greatly help me financially
paypal: paypal.me/shirwatel

## Extension Title
ImageLens Viewer

## Short description
Zoom, pan, rotate, flip, and save any image in Chrome. A cleaner, faster upgrade to the built-in viewer.

## Category
Productivity

## Language
English

---
## Installation
Installing ImageLens Viewer — Beginner's Guide

This guide walks you through installing ImageLens Viewer from the zip file, step by step. No coding experience needed — just about 3 minutes.

Step 1: Unzip the file
Find imagelens-extension.zip wherever you downloaded it (usually your Downloads folder).
Windows: Right-click the file → Extract All → choose a folder you'll remember (e.g., Desktop) → Extract. Mac: Double-click the zip file — it will automatically create a folder next to it.
You should now have a regular folder (not a zip) containing files like manifest.json and folders named content, options, popup, icons, and background.

Keep this folder where it is permanently. Chrome loads the extension directly from this folder — if you delete or move it later, the extension will stop working until you re-load it.

Step 2: Open Chrome's extensions page
Open Google Chrome.
Click the three dots (⋮) in the top-right corner → Extensions → Manage Extensions. — or — Type this directly into the address bar and press Enter:
   chrome://extensions
Step 3: Turn on Developer mode

On the Extensions page, look at the top-right corner for a toggle labeled Developer mode. Click it to turn it on (it should turn blue).

This unlocks a few extra buttons at the top of the page, including Load unpacked.

Step 4: Load the extension
Click the Load unpacked button that just appeared.
A file picker will open. Navigate to the folder you unzipped in Step 1.
Select the folder itself (the one containing manifest.json) and click Select Folder (Windows) or Open (Mac).

ImageLens Viewer should now appear as a card on the Extensions page, with its teal-and-indigo icon.

Step 5: Pin it to your toolbar (optional but recommended)
Click the puzzle piece icon (🧩) near the top-right of Chrome, next to the address bar.
Find ImageLens Viewer in the list.
Click the pin icon next to it.

The ImageLens icon will now always be visible in your toolbar, so you can quickly open its settings.

You're done! Here's how to use it

Try it right away:

Right-click any image on a webpage and choose "Open in ImageLens Viewer" from the menu.
Or hold Alt and click any image directly.
Or navigate straight to an image link (like a .jpg or .png URL) — it upgrades automatically.

---

## Detailed description

**Chrome's image viewer, but actually useful.**

ImageLens Viewer replaces the bare-bones way Chrome shows images with a fast, distraction-free viewer built for anyone who deals with high-resolution photos, screenshots, artwork, or image-heavy sites like Reddit and image hosts.

**Core controls**
- Scroll to zoom in and out, centered exactly where your cursor is
- Click and drag to pan around an image
- Alt + scroll to rotate, or use Q / E for quick rotation steps
- Flip horizontal or vertical with a click, or the H / V keys
- Save the image with your rotation and flip baked in, with one click or the S key
- Click to toggle between "fit to window" and actual size
- Double-click to reset the view instantly
- Shift or Ctrl + scroll to pan horizontally or vertically without dragging

**Where it works**
- Automatically upgrades any page that's just a raw image (like opening a .jpg or .png link directly)
- Alt+Click any image on any website to pop it open in a full-screen viewer
- Right-click any image and choose "Open in ImageLens Viewer" from the context menu
- One-click viewing (no Alt needed) is pre-configured for Reddit, Imgur, ImgBB, imgbox, and other popular image hosts — and you can add any site you like from the settings page
- Works with local files and in Incognito mode

**Make it yours**
- Choose a custom background color for the viewer
- Set your preferred default zoom (fit to window or actual size)
- Hide scrollbars for a cleaner look
- Turn per-site click behavior on or off right from the toolbar popup
- Light and dark interface themes

**Privacy first**
ImageLens Viewer does not collect, transmit, or sell any of your browsing data, images, or personal information. All settings are stored locally (and synced through your own Chrome account if you're signed in) — never sent to any external server. See our full privacy policy below.

If you've been burned by an image-viewer extension that stopped working, got pulled from the store, or started behaving strangely after an update — ImageLens Viewer is a from-scratch, transparent alternative built to just do the one job well.

---

## Single purpose statement

ImageLens Viewer's single purpose is: **viewing images in the browser with enhanced controls (zoom, pan, rotate, flip) and saving them.** Every feature — the native image-page upgrade, the click-to-view overlay, the right-click menu entry, and the save function — exists only to support that one purpose. It does not manage tabs, bookmarks, downloads history, browsing history, or anything unrelated to displaying and exporting an image the user is actively looking at.

---

## Permission justification

**Host permission: `<all_urls>`**
Justification: ImageLens Viewer needs to detect when a user navigates directly to an image file (e.g., a .jpg or .png URL) on any website in order to replace Chrome's default image viewer, and to let users open any image — via Alt+Click or the right-click context menu — in the enhanced viewer. Because users may want this on any site they visit, the extension requests access to all URLs rather than a fixed list. No page content is read, modified, stored, or transmitted beyond detecting images and displaying the viewer overlay locally in the browser.

**Storage permission**
Justification: Used to save the user's preferences (theme, zoom mode, background color, per-site click settings) locally via `chrome.storage.sync`, so settings persist across browser sessions and sync across the user's signed-in Chrome devices. No data is sent to any server operated by the developer.

**contextMenus permission**
Justification: Adds a single "Open in ImageLens Viewer" entry to the right-click menu when the user right-clicks an image. This is an alternate, more discoverable way to trigger the same viewer that Alt+Click already opens — it does not add or read any other context menu items.

**scripting permission**
Justification: Used only as a fallback for the right-click menu entry. If a tab was already open before the extension was installed or updated, its content script may not have loaded yet; in that case, `scripting.executeScript` re-injects the same content script (already bundled in the extension package) into that specific tab so the right-click action can complete. It never fetches or executes code from a remote source — only the extension's own local `content/content.js` and `content/content.css` files.

**Remote code**
None. All code ships in the extension package; nothing is fetched or executed remotely, including through the `scripting` permission above.

---

## Data disclosure

As of August 2026, Chrome requires disclosure of *all* data an extension can access, not just data that goes beyond its stated purpose. For ImageLens Viewer, the honest, complete answer is:

- **Collects:** nothing that leaves the device. The only "data" the extension handles is: (1) the user's own settings (theme, zoom mode, background color, site list), stored via `chrome.storage.sync`, which syncs through the user's own Google account and is never sent to any server operated by the developer; and (2) image URLs/pixels, read transiently in the browser tab purely to render and, if requested, save them — never logged, stored, or transmitted anywhere.
- **Does not collect:** personally identifiable information, health information, financial or payment information, authentication credentials, personal communications, location, web browsing history, or user activity on other sites.
- **Does not sell or transfer** user data to third parties, for advertising, or for creditworthiness/lending purposes.
- **No remote servers.** The extension makes no network requests of its own; it only reads image bytes already loaded in the page and writes files the user explicitly saves to their own device.
- **If this ever changes:** any future version that changes what data is collected or how it's used will disclose that change in the store listing and, per policy, request the user's consent again before it takes effect.

## Data usage disclosure
- Does not collect personally identifiable information
- Does not collect health information
- Does not collect financial or payment information
- Does not collect authentication information
- Does not collect personal communications
- Does not collect location
- Does not collect web history
- Does not collect user activity
- Does not sell or transfer user data to third parties
- Does not use data for purposes unrelated to the extension's single stated purpose
- Does not use data to determine creditworthiness or for lending purposes

---

## Privacy Policy

**Privacy Policy for ImageLens Viewer**

*Last updated: 22/08/2026*

ImageLens Viewer ("the extension") is developed by MESSSID YACINE. This policy explains what data the extension does and does not access, in line with Google's Chrome Web Store developer policies.

**What the extension does**
ImageLens Viewer runs locally in your browser to detect images on web pages and display them in an enhanced viewer with zoom, pan, rotate, flip, and save controls.

**What data we collect**
None is collected by the developer. The extension's settings (theme, default zoom, background color, per-site preferences) are stored only through Chrome's built-in `storage.sync`, which lives in your own Google account. Image content is read only transiently, inside your browser, to display or save the image you're viewing — it is never logged, stored, or transmitted to any server the developer operates.

**Local settings storage**
Your preferences stay within your own Google/Chrome account and are never accessible to the developer or any third party.

**Third parties**
ImageLens Viewer does not integrate with, send data to, or share data with any third-party service, analytics provider, or advertiser.

**Permissions**
- `storage` — saves your preferences locally/synced to your Google account.
- `<all_urls>` (host permission) — lets the viewer detect and open images on any site you choose to use it on.
- `contextMenus` — adds the "Open in ImageLens Viewer" right-click option.
- `scripting` — re-injects the extension's own bundled script into a tab if needed for the right-click option to work on tabs opened before an update; never loads code from outside the extension package.

**Changes to this policy**
If this policy changes in a way that affects what data is collected or how it's used, the "Last updated" date above will be revised, the change will be reflected in the Chrome Web Store listing, and — per current Chrome Web Store policy — your consent will be requested again before the change takes effect.

**Contact**
Questions about this policy can be sent to: shirwatels@gmail.com
