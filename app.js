// Glasster AR eyewear try-on
// Uses MediaPipe FaceMesh (CDN) for face landmarks, runs fully client-side.

const videoEl = document.getElementById("video");
const photoPreviewEl = document.getElementById("photo-preview");
const canvasEl = document.getElementById("overlay-canvas");
const ctx = canvasEl.getContext("2d");

const cameraOverlayEl = document.getElementById("camera-overlay");
const cameraMessageEl = document.getElementById("camera-message");
const retryCameraBtn = document.getElementById("retry-camera");

const productsCarouselEl = document.getElementById("products-carousel");
const carouselPrevBtn = document.getElementById("carousel-prev");
const carouselNextBtn = document.getElementById("carousel-next");

const getStartedBtn = document.getElementById("get-started-btn");
const consentModalEl = document.getElementById("consent-modal");
const consentContinueBtn = document.getElementById("consent-continue");

// 6+ eyewear options
const PRODUCTS = [
  {
    id: "ruby",
    name: "Ruby",
    price: 1345,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Ruby, a warm everyday frame with a subtle red finish that suits most face shapes.",
  },
  {
    id: "round-tortoise",
    name: "Round Tortoise",
    price: 109,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Soft round silhouette with warm tones for a vintage feel.",
  },
  {
    id: "aviator-gold",
    name: "Aviator Gold",
    price: 129,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Lightweight metal aviators with a subtle gold sheen.",
  },
  {
    id: "wire-minimal",
    name: "Wire Minimal",
    price: 99,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Ultra-thin wire frame that almost disappears on your face.",
  },
  {
    id: "oversized",
    name: "Oversized Studio",
    price: 139,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Bold oversized frame for maximum presence in every room.",
  },
  {
    id: "cat-eye",
    name: "Cat-Eye Glow",
    price: 119,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description: "Playful cat-eye uplift that flatters cheekbones and jawlines.",
  },
];

// State
let currentProduct = PRODUCTS[0];
let overlayImage = new Image();
let currentStream = null;
let facingMode = "user"; // "user" | "environment"

// Last computed transform so we can reuse it for snapshots
let lastOverlayTransform = null;
let prevOverlayTransform = null;
const OVERLAY_SMOOTHING = 0.18; // 0 = frozen, 1 = no smoothing

// FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});
faceMesh.onResults(onFaceResults);

// Resize canvas to match video container
function resizeCanvas() {
  const rect = videoEl.getBoundingClientRect();
  const { width, height } = rect;
  canvasEl.width = width;
  canvasEl.height = height;
}

window.addEventListener("resize", resizeCanvas);

async function startCamera(desiredFacingMode = "user") {
  facingMode = desiredFacingMode;
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
  }

  cameraOverlayEl.classList.remove("hidden");
  cameraMessageEl.textContent = "Requesting camera…";
  retryCameraBtn.classList.add("hidden");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: desiredFacingMode },
      },
      audio: false,
    });

    currentStream = stream;
    videoEl.srcObject = stream;
    videoEl.classList.remove("hidden");
    photoPreviewEl.classList.add("hidden");

    await videoEl.play();
    resizeCanvas();

    cameraOverlayEl.classList.add("hidden");
    processVideoFrames();
  } catch (err) {
    console.error("Camera error", err);
    cameraMessageEl.textContent =
      "We couldn't access your camera. You can upload a photo instead.";
    retryCameraBtn.classList.remove("hidden");
  }
}

async function processVideoFrames() {
  if (!videoEl.srcObject) return;

  try {
    await faceMesh.send({ image: videoEl });
  } catch (e) {
    console.error("FaceMesh error", e);
  }

  requestAnimationFrame(processVideoFrames);
}

function onFaceResults(results) {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    lastOverlayTransform = null;
    prevOverlayTransform = null;
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];
  // Mediapipe face indices: 33 (right eye), 263 (left eye), 168 (nose bridge)
  const leftEye = landmarks[263];
  const rightEye = landmarks[33];
  const nose = landmarks[168];

  if (!leftEye || !rightEye || !nose || !overlayImage.complete) {
    return;
  }

  const vw = canvasEl.width;
  const vh = canvasEl.height;

  const lx = leftEye.x * vw;
  const ly = leftEye.y * vh;
  const rx = rightEye.x * vw;
  const ry = rightEye.y * vh;
  const nx = nose.x * vw;
  const ny = nose.y * vh;

  const eyeDx = lx - rx;
  const eyeDy = ly - ry;
  const eyeDist = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy);

  // Slightly narrower but taller frame for better fit
  const overlayWidth = eyeDist * 2.0;
  const overlayHeight = eyeDist * 0.9;

  const midEyeX = (lx + rx) / 2;
  const midEyeY = (ly + ry) / 2;

  // Use both eyes and nose to keep vertical placement stable relative to face
  const centerX = midEyeX;
  const eyeNoseMidY = (midEyeY * 2 + ny) / 3;
  const centerY = eyeNoseMidY + overlayHeight * 0.05;

  const angle = Math.atan2(eyeDy, eyeDx);

  const rawTransform = {
    centerX,
    centerY,
    width: overlayWidth,
    height: overlayHeight,
    angle,
  };

  lastOverlayTransform = smoothTransform(rawTransform);

  drawOverlay(ctx, overlayImage, lastOverlayTransform);
}

function smoothTransform(raw) {
  if (!prevOverlayTransform) {
    prevOverlayTransform = raw;
    return raw;
  }

  const a = OVERLAY_SMOOTHING;
  const lerp = (p, c) => p + a * (c - p);

  const smoothed = {
    centerX: lerp(prevOverlayTransform.centerX, raw.centerX),
    centerY: lerp(prevOverlayTransform.centerY, raw.centerY),
    width: lerp(prevOverlayTransform.width, raw.width),
    height: lerp(prevOverlayTransform.height, raw.height),
    angle: lerp(prevOverlayTransform.angle, raw.angle),
  };

  prevOverlayTransform = smoothed;
  return smoothed;
}

function drawOverlay(context, image, transform) {
  if (!transform) return;
  const { centerX, centerY, width, height, angle } = transform;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(angle);

  context.globalAlpha = 1;
  context.drawImage(image, -width / 2, -height / 2, width, height);

  context.restore();
}

function buildProductsUI() {
  productsCarouselEl.innerHTML = "";

  PRODUCTS.forEach((product, index) => {
    const card = document.createElement("button");
    card.className = "product-card";
    card.setAttribute("type", "button");
    card.setAttribute("aria-label", `${product.name}, $${product.price}`);
    card.dataset.productId = product.id;
    if (index === 0) {
      card.classList.add("active");
    }

    const thumb = document.createElement("div");
    thumb.className = "product-thumb";
    const img = document.createElement("img");
    img.src = product.thumb;
    img.alt = product.name;
    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = product.name;

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = `₱${product.price}`;

    meta.appendChild(name);
    meta.appendChild(price);

    card.appendChild(thumb);
    card.appendChild(meta);

    card.addEventListener("click", () => {
      setActiveProduct(product.id);
      tinyBounce(card);
    });

    productsCarouselEl.appendChild(card);
  });
}

function setActiveProduct(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  currentProduct = product;
  Array.from(productsCarouselEl.children).forEach((card) => {
    if (card.dataset.productId === productId) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  loadOverlayImage(product.overlay);
}

function loadOverlayImage(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    overlayImage = img;
  };
}

function tinyBounce(el) {
  el.style.transform = "translateY(-3px) scale(1.02)";
  setTimeout(() => {
    el.style.transform = "";
  }, 120);
}

// Snapshot + share
// (Snapshot / sharing removed for this streamlined demo UI)

function openConsentModal() {
  if (!consentModalEl) return;
  consentModalEl.classList.remove("hidden");
}

function closeConsentModal() {
  if (!consentModalEl) return;
  consentModalEl.classList.add("hidden");
}

// Simple carousel scroll
function scrollCarousel(direction) {
  const amount = 160 * direction;
  productsCarouselEl.scrollBy({ left: amount, behavior: "smooth" });
}

// Event wiring
retryCameraBtn.addEventListener("click", () => startCamera(facingMode));

carouselPrevBtn.addEventListener("click", () => scrollCarousel(-1));
carouselNextBtn.addEventListener("click", () => scrollCarousel(1));

if (getStartedBtn) {
  getStartedBtn.addEventListener("click", openConsentModal);
}

if (consentContinueBtn) {
  consentContinueBtn.addEventListener("click", () => {
    closeConsentModal();
    startCamera("user");
    const tryOnSection = document.getElementById("try-on");
    if (tryOnSection) {
      tryOnSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (consentModalEl) {
  consentModalEl.addEventListener("click", (e) => {
    if (e.target === consentModalEl) {
      closeConsentModal();
    }
  });
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  buildProductsUI();
  setActiveProduct(PRODUCTS[0].id);
  resizeCanvas();
});


