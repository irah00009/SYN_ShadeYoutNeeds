# Glasster – AR Eyewear Try‑On (Static SPA)

Single‑page static demo for an eyewear e‑commerce experience with camera‑based try‑on.

Open `index.html` directly in a modern browser — no build step or backend required.

## Stack / libraries

- **HTML/CSS/vanilla JS only** – no bundler, no framework.
- **Face tracking**: [MediaPipe FaceMesh](https://developers.google.com/mediapipe/solutions/vision/face_mesh) loaded from jsDelivr CDN:
  - All inference runs **fully client‑side**; no frames are uploaded anywhere.

## Features

- Live camera (front/back where supported) using `navigator.mediaDevices.getUserMedia`.
- Real‑time face landmark tracking and glasses overlay that:
  - Follows horizontal position of the eyes.
  - Scales with face width (eye distance).
  - Rotates with head tilt.
- 6 eyewear styles wired as overlays (transparent SVGs):
  - Selected via horizontal product carousel.
- Snapshot button
  - Captures current frame + overlay baked into a PNG.
  - Triggers immediate download; also used by the Web Share API on mobile (if supported).
- Static cart
  - `Add to cart` for the selected frame (with color/size options).
  - Cart drawer with quantities + subtotal.
  - Cart is persisted in `localStorage` under `glasster_cart_v1`.
- Photo upload fallback
  - If camera is denied/unavailable, user can upload a photo and use the same overlay logic on the still image.
- Mobile‑first responsive layout, keyboard‑accessible controls and ARIA labels.

## Project structure

- `index.html` – main SPA shell.
- `styles.css` – layout and styling.
- `app.js` – camera / face tracking / overlay / cart logic.
- `assets/`
  - `frame-*.svg` – overlay SVGs for AR glasses.
  - `thumb-*.svg` – simplified thumbnails for product cards (reusing same shapes).

## How it works

### Camera / face tracking

1. On `DOMContentLoaded`, the app calls `navigator.mediaDevices.getUserMedia` with `{ video: { facingMode: "user" } }`.
2. The video stream is piped into the `<video>` element (`#video`) and displayed mirrored for selfie UX.
3. MediaPipe FaceMesh is configured in `app.js`:
   - `maxNumFaces: 1`, `refineLandmarks: true`.
4. Every animation frame, the current `<video>` frame is passed to `faceMesh.send({ image: videoEl })`.
5. `onResults` reads key landmarks:
   - `33` (right eye), `263` (left eye), `168` (nose bridge).
6. Eye distance and mid‑point are used to compute:
   - Overlay **width** (~2.4 × eye distance),
   - Overlay **height** (fixed ratio),
   - **Center** (between eyes, slightly above nose),
   - **Rotation** (angle between eyes).
7. Glasses overlay (SVG image) is drawn into the `overlay-canvas` with 2D transforms to match pose.

### Photo upload fallback

- If camera fails or is denied, the UI explains the issue and prompts photo upload.
- When a user uploads a photo:
  - The photo is shown in `#photo-preview` instead of the live video.
  - A hidden `Image` element is fed repeatedly into FaceMesh in a `requestAnimationFrame` loop.
  - The same overlay math is used, so behavior matches live camera.
- A "Use live camera" button switches back to camera and restarts the stream.

### Snapshot and share

- Snapshot:
  - Creates an offscreen `<canvas>` the same size as `overlay-canvas`.
  - Draws the current video (or uploaded photo) into the canvas, mirrored.
  - Re‑applies the latest stored overlay transform into the same canvas.
  - Exports a PNG via `canvas.toDataURL` and triggers a download.
- Web Share:
  - If `navigator.share` and `navigator.canShare` with files are supported (typically mobile):
    - Converts the latest snapshot data URL into a `File`.
    - Calls `navigator.share` with that file; otherwise, the user just gets the standard download.

### Products & cart

- Products are hard‑coded in `app.js` (`PRODUCTS` array) with:
  - `id`, `name`, `price`, `overlay` (frame SVG), and `thumb` (product thumbnail SVG).
- Clicking a product card:
  - Updates the active overlay.
  - Updates product name / price / description panel on the right.
- `Add to cart`:
  - Builds a cart line item `{ productId, name, price, color, size, qty }`.
  - Upserts into the cart array in `localStorage`.
- Cart drawer:
  - Reads `localStorage`, renders rows with qty +/– controls.
  - Computes subtotal and total quantity (also used in the header badge).

## Customizing / swapping assets

All frame overlays live in `assets/`. Each product uses:

- `overlay` – the file used by the AR overlay.
- `thumb` – the thumbnail shown in the product carousel.

To replace frames:

1. Export new transparent PNGs or SVGs (preferred) where the glasses fill most of the width of the image.
2. Drop them into `assets/`, e.g. `assets/my-frame-1.svg`.
3. Update the corresponding product in `PRODUCTS` in `app.js`:

   ```js
   {
     id: "my-frame",
     name: "My Frame",
     price: 120,
     overlay: "assets/my-frame-1.svg",
     thumb: "assets/my-frame-1.svg",
     description: "Short description here.",
   }
   ```

4. Reload `index.html` — no build/run step required.

If you want to use PNG instead of SVG, just point `overlay` and `thumb` to `.png` files; nothing else changes.

## Switching to a different face library (if you prefer)

The app is currently wired to **MediaPipe FaceMesh** because:

- It is relatively lightweight for full face landmarks.
- It can run purely client‑side via CDN.

If you want to swap it out (e.g. to `face-api.js`):

1. Remove the `<script>` tags near the bottom of `index.html` that load MediaPipe.
2. Include your alternative library from a CDN.
3. Replace the FaceMesh setup in `app.js`:
   - Construction (`new FaceMesh(...)`),
   - `faceMesh.setOptions(...)`,
   - `faceMesh.onResults(...)`,
   - The `faceMesh.send({ image })` calls in the camera/photo loops.
4. Map your library’s landmarks to:
   - Left eye outer corner,
   - Right eye outer corner,
   - Nose bridge / nose center,
   and plug those into the same overlay math (`onFaceResults`).

## Supported browsers

Tested / expected to work on:

- Chrome 100+ (desktop & Android)
- Edge 100+
- Safari iOS 16+ (for camera + Web Share)

Known constraints:

- Requires `https` origin for camera on most browsers.
  - For local dev, open using `http://localhost` or allow file‑URL camera access where supported.
- Web Share API with files is only available on some mobile browsers.

## Notes on performance & privacy

- All processing is done in the browser; there is **no network call** for:
  - Camera frames
  - Uploaded photos
  - Face landmarks
- Overlays and the model are loaded lazily via CDN when the page is opened.
- The app aims to keep JS small and focused:
  - No frameworks
  - One face model
  - Simple layout CSS without heavy utility libraries.


