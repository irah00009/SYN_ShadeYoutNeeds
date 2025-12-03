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

const framesStripEl = document.getElementById("frames-strip");
const framesPrevBtn = document.getElementById("frames-prev");
const framesNextBtn = document.getElementById("frames-next");

const getStartedBtn = document.getElementById("get-started-btn");
const consentModalEl = document.getElementById("consent-modal");
const consentContinueBtn = document.getElementById("consent-continue");

// Cart elements
const cartToggleBtn = document.getElementById("cart-toggle");
const cartDrawerEl = document.getElementById("cart-drawer");
const cartBackdropEl = document.getElementById("cart-backdrop");
const cartCloseBtn = document.getElementById("cart-close");
const cartItemsEl = document.getElementById("cart-items");
const cartBadgeEl = document.getElementById("cart-badge");
const cartTotalAmountEl = document.getElementById("cart-total-amount");
const checkoutBtn = document.getElementById("checkout-btn");

// Selected frame info elements
const selectedFrameSection = document.getElementById("selected-frame-info");
const selectedFrameImage = document.getElementById("selected-frame-image");
const selectedFrameName = document.getElementById("selected-frame-name");
const selectedFramePrice = document.getElementById("selected-frame-price");
const selectedFrameDesc = document.getElementById("selected-frame-desc");
const addToCartBtn = document.getElementById("add-to-cart-btn");

// Frame modal elements
const frameModalEl = document.getElementById("frame-modal");
const frameModalBackdropEl = document.getElementById("frame-modal-backdrop");
const frameModalCloseBtn = document.getElementById("frame-modal-close");
const frameModalImgEl = document.getElementById("frame-modal-img");
const frameModalNameEl = document.getElementById("frame-modal-name");
const frameModalPriceEl = document.getElementById("frame-modal-price");
const frameModalDescEl = document.getElementById("frame-modal-desc");
const frameModalAddCartBtn = document.getElementById("frame-modal-add-cart");

// Toast notification elements
const toastEl = document.getElementById("toast");
const toastMessageEl = document.getElementById("toast-message");

// Frame catalogue: Ruby + 4 variants
const PRODUCTS = [
  {
    id: "ruby",
    name: "SINAG",
    price: 450,
    overlay: "assets/ruby.png",
    thumb: "assets/ruby.png",
    description:
      "Striking in shape and vivid in tone, Sinag illuminates your look with captivating fiery energy and a gaze full of purpose.",
  },
  {
    id: "amethyst",
    name: "KATALONA",
    price: 475,
    overlay: "assets/amethyst-frame.png",
    thumb: "assets/amethyst-frame.png",
    description:
      "Embrace clarity and wisdom with these classic round frames in a striking royal purple. This lightweight design offers a sophisticated look perfect for focus and serenity.",
  },
  {
    id: "diamond",
    name: "AMANIKABLE",
    price: 500,
    overlay: "assets/diamond-frame.png",
    thumb: "assets/diamond-frame.png",
    description:
      "These sleek frames offer the calming balance of sea and sky in a vibrant aqua blue. The modern silhouette brings fresh energy and a truly optimistic view to your daily look.",
  },
  {
    id: "mercury",
    name: "MAYARI",
    price: 425,
    overlay: "assets/mercury-frame.png",
    thumb: "assets/mercury-frame.png",
    description:
      "Unleash your inner glamour and intuition with the alluring cat-eye shape in polished silver. This elegant design is perfect for the bold personality seeking a touch of mystical confidence.",
  },
  {
    id: "silver",
    name: "SITAN",
    price: 490,
    overlay: "assets/Silver-frame.png",
    thumb: "assets/Silver-frame.png",
    description:
      "Designed for strength and authority, the durable matte black finish provides a powerful, professional aesthetic.",
  },
  {
    id: "sun",
    name: "SARIMANOK",
    price: 400,
    overlay: "assets/Sun-frame.png",
    thumb: "assets/Sun-frame.png",
    description:
      "Channel vibrance and spirit with these golden patterned frames inspired by the legendary Sarimanok. Exotic, enchanting, and made for those who move with magic.",
  },
];

// State
let currentProduct = PRODUCTS[0];
let overlayImage = new Image();
let currentStream = null;
let facingMode = "user"; // "user" | "environment"
const FRAME_PAGE_SIZE = 2;
let framePage = 0;

// Cart state
let cart = [];

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

  // Base frame width relative to eye distance
  const overlayWidth = eyeDist * 2.1;

  // Preserve the actual aspect ratio of the PNG so it doesn't stretch
  const aspectFromImage =
    overlayImage && overlayImage.naturalWidth
      ? overlayImage.naturalHeight / overlayImage.naturalWidth
      : 0.4; // sensible default if not yet loaded

  const overlayHeight = overlayWidth * aspectFromImage;

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

function buildFramesHero() {
  if (!framesStripEl) return;
  framesStripEl.innerHTML = "";

  PRODUCTS.forEach((product) => {
    const card = document.createElement("article");
    card.className = "frame-card-hero";

    const img = document.createElement("img");
    img.src = product.thumb;
    img.alt = product.name;

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "frame-card-hero-price";
    price.textContent = `₱${product.price}`;

    const desc = document.createElement("p");
    desc.className = "frame-card-hero-desc";
    desc.textContent = product.description;

    const addToCartBtn = document.createElement("button");
    addToCartBtn.className = "primary-button add-to-cart-btn";
    addToCartBtn.textContent = "Add to Cart";
    addToCartBtn.type = "button";
    addToCartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(product.id);
    });

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(desc);
    card.appendChild(addToCartBtn);

    // Open modal when card is clicked (but not when clicking Add to Cart button)
    card.addEventListener("click", (e) => {
      if (e.target === addToCartBtn || addToCartBtn.contains(e.target)) {
        return;
      }
      openFrameModal(product);
    });

    framesStripEl.appendChild(card);
  });

  updateFramesHeroVisibility();
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
  showSelectedFrame(product);
}

function showSelectedFrame(product) {
  if (!selectedFrameSection || !product) return;
  
  selectedFrameImage.src = product.thumb;
  selectedFrameImage.alt = product.name;
  selectedFrameName.textContent = product.name;
  selectedFramePrice.textContent = `₱${product.price}`;
  selectedFrameDesc.textContent = product.description;
  
  selectedFrameSection.classList.remove("hidden");
  
  // Scroll to selected frame section
  selectedFrameSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

// Toast notification function
function showToast(message) {
  if (!toastEl || !toastMessageEl) return;
  
  toastMessageEl.textContent = message;
  toastEl.classList.remove("hidden");
  
  // Animate in
  setTimeout(() => {
    toastEl.classList.add("show");
  }, 10);
  
  // Hide after 3 seconds
  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 300);
  }, 3000);
}

// Cart functions
function addToCart(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  
  // Check if item already exists in cart
  const existingItem = cart.find((item) => item.id === productId);
  
  if (existingItem) {
    // Increment quantity if item already exists
    existingItem.quantity += 1;
  } else {
    // Add new item with quantity 1
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      thumb: product.thumb,
      quantity: 1,
    });
  }
  
  updateCartUI();
  updateCartBadge();
  
  // Show toast notification
  showToast(`${product.name} is added to cart successfully`);
  
  // Show success feedback on button (if exists)
  if (addToCartBtn) {
    const originalText = addToCartBtn.textContent;
    addToCartBtn.textContent = "Added!";
    addToCartBtn.style.background = "#10b981";
    setTimeout(() => {
      addToCartBtn.textContent = originalText;
      addToCartBtn.style.background = "";
    }, 1500);
  }
}

function updateQuantity(index, change) {
  if (index < 0 || index >= cart.length) return;
  
  const item = cart[index];
  item.quantity += change;
  
  // Remove item if quantity reaches 0
  if (item.quantity <= 0) {
    cart.splice(index, 1);
  }
  
  updateCartUI();
  updateCartBadge();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
  updateCartBadge();
}

function updateCartUI() {
  if (!cartItemsEl) return;
  
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }
  
  cartItemsEl.innerHTML = "";
  
  cart.forEach((item, index) => {
    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";
    
    const img = document.createElement("img");
    img.src = item.thumb;
    img.alt = item.name;
    img.className = "cart-item-image";
    
    const details = document.createElement("div");
    details.className = "cart-item-details";
    
    const name = document.createElement("p");
    name.className = "cart-item-name";
    name.textContent = item.name;
    
    const price = document.createElement("p");
    price.className = "cart-item-price";
    const itemTotal = item.price * item.quantity;
    price.textContent = `₱${itemTotal.toLocaleString()}`;
    
    // Quantity controls
    const quantityControls = document.createElement("div");
    quantityControls.className = "cart-item-quantity";
    
    const minusBtn = document.createElement("button");
    minusBtn.className = "quantity-btn quantity-minus";
    minusBtn.textContent = "−";
    minusBtn.type = "button";
    minusBtn.setAttribute("aria-label", "Decrease quantity");
    minusBtn.addEventListener("click", () => updateQuantity(index, -1));
    
    const quantityDisplay = document.createElement("span");
    quantityDisplay.className = "quantity-value";
    quantityDisplay.textContent = item.quantity;
    
    const plusBtn = document.createElement("button");
    plusBtn.className = "quantity-btn quantity-plus";
    plusBtn.textContent = "+";
    plusBtn.type = "button";
    plusBtn.setAttribute("aria-label", "Increase quantity");
    plusBtn.addEventListener("click", () => updateQuantity(index, 1));
    
    quantityControls.appendChild(minusBtn);
    quantityControls.appendChild(quantityDisplay);
    quantityControls.appendChild(plusBtn);
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "cart-item-remove";
    removeBtn.textContent = "Remove";
    removeBtn.type = "button";
    removeBtn.addEventListener("click", () => removeFromCart(index));
    
    details.appendChild(name);
    details.appendChild(price);
    details.appendChild(quantityControls);
    
    cartItem.appendChild(img);
    cartItem.appendChild(details);
    cartItem.appendChild(removeBtn);
    
    cartItemsEl.appendChild(cartItem);
  });
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (cartTotalAmountEl) {
    cartTotalAmountEl.textContent = `₱${total.toLocaleString()}`;
  }
  
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateCartBadge() {
  if (!cartBadgeEl) return;
  
  // Count total items (sum of quantities)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItems > 0) {
    cartBadgeEl.textContent = totalItems;
    cartBadgeEl.classList.remove("hidden");
  } else {
    cartBadgeEl.classList.add("hidden");
  }
}

function openCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.add("hidden");
  document.body.style.overflow = "";
}

function handleCheckout() {
  if (cart.length === 0) return;
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const message = `Checkout Summary:\n\n${cart.map((item, i) => `${i + 1}. ${item.name} × ${item.quantity} - ₱${(item.price * item.quantity).toLocaleString()}`).join("\n")}\n\nTotal: ₱${total.toLocaleString()}\n\nThank you for your purchase!`;
  
  alert(message);
  
  // Clear cart
  cart = [];
  updateCartUI();
  updateCartBadge();
  closeCart();
}

// Frame modal functions
function openFrameModal(product) {
  if (!frameModalEl || !product) return;
  
  frameModalImgEl.src = product.thumb;
  frameModalImgEl.alt = product.name;
  frameModalNameEl.textContent = product.name;
  frameModalPriceEl.textContent = `₱${product.price}`;
  frameModalDescEl.textContent = product.description;
  
  frameModalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  
  // Store product ID for add to cart
  frameModalAddCartBtn.dataset.productId = product.id;
}

function closeFrameModal() {
  if (!frameModalEl) return;
  frameModalEl.classList.add("hidden");
  document.body.style.overflow = "";
}

function updateFramesHeroVisibility() {
  if (!framesStripEl) return;
  const cards = Array.from(framesStripEl.children);
  const totalPages = Math.ceil(cards.length / FRAME_PAGE_SIZE);
  framePage = Math.min(framePage, Math.max(0, totalPages - 1));

  const start = framePage * FRAME_PAGE_SIZE;
  const end = start + FRAME_PAGE_SIZE;

  cards.forEach((card, index) => {
    if (index >= start && index < end) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });

  const remaining = cards.length - start;
  if (remaining === 1) {
    framesStripEl.style.justifyContent = "center";
  } else {
    framesStripEl.style.justifyContent = "space-between";
  }

  if (framesPrevBtn) {
    framesPrevBtn.disabled = framePage === 0;
  }
  if (framesNextBtn) {
    framesNextBtn.disabled = framePage >= totalPages - 1;
  }
}

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

// Cart events
if (cartToggleBtn) {
  cartToggleBtn.addEventListener("click", openCart);
}

if (cartCloseBtn) {
  cartCloseBtn.addEventListener("click", closeCart);
}

if (cartBackdropEl) {
  cartBackdropEl.addEventListener("click", closeCart);
}

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", handleCheckout);
}

if (addToCartBtn) {
  addToCartBtn.addEventListener("click", () => {
    if (currentProduct) {
      addToCart(currentProduct.id);
    }
  });
}

// Frame modal events
if (frameModalCloseBtn) {
  frameModalCloseBtn.addEventListener("click", closeFrameModal);
}

if (frameModalBackdropEl) {
  frameModalBackdropEl.addEventListener("click", closeFrameModal);
}

if (frameModalAddCartBtn) {
  frameModalAddCartBtn.addEventListener("click", () => {
    const productId = frameModalAddCartBtn.dataset.productId;
    if (productId) {
      addToCart(productId);
      closeFrameModal();
    }
  });
}

// Carousel navigation buttons removed - users can scroll horizontally
if (carouselPrevBtn) {
  carouselPrevBtn.addEventListener("click", () => scrollCarousel(-1));
}
if (carouselNextBtn) {
  carouselNextBtn.addEventListener("click", () => scrollCarousel(1));
}

if (framesPrevBtn) {
  framesPrevBtn.addEventListener("click", () => {
    framePage = Math.max(0, framePage - 1);
    updateFramesHeroVisibility();
  });
}

if (framesNextBtn) {
  framesNextBtn.addEventListener("click", () => {
    framePage += 1;
    updateFramesHeroVisibility();
  });
}

if (getStartedBtn) {
  getStartedBtn.addEventListener("click", () => {
    const framesSection = document.getElementById("frame-hero");
    if (framesSection) {
      framesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
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

// Contact form handler
const contactFormEl = document.getElementById("contact-form");
if (contactFormEl) {
  contactFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = document.getElementById("contact-message").value;
    if (message.trim()) {
      // In a real application, this would send the message to a server
      alert("Thank you for your message! We'll get back to you soon.");
      contactFormEl.reset();
    }
  });
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  buildProductsUI();
  buildFramesHero();
  setActiveProduct(PRODUCTS[0].id);
  resizeCanvas();
  updateCartUI();
  updateCartBadge();
  
  // Automatically request camera permission after a short delay
  // This allows the page to load first, then requests permission
  setTimeout(() => {
    // Only request if user hasn't interacted yet (browsers require user interaction)
    // We'll trigger it when user scrolls or interacts with the page
    const requestCameraOnInteraction = () => {
      startCamera("user");
      // Remove listeners after first interaction
      document.removeEventListener("scroll", requestCameraOnInteraction);
      document.removeEventListener("click", requestCameraOnInteraction);
      document.removeEventListener("touchstart", requestCameraOnInteraction);
    };
    
    // Request camera on first user interaction
    document.addEventListener("scroll", requestCameraOnInteraction, { once: true });
    document.addEventListener("click", requestCameraOnInteraction, { once: true });
    document.addEventListener("touchstart", requestCameraOnInteraction, { once: true });
  }, 500);
});


