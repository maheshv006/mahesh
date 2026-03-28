/**
 * Shree Jewelry — site behavior
 * -------------------------------------------
 * 1) Change WhatsApp: edit WHATSAPP_NUMBER below (country code + number, no + or spaces).
 * 2) Products load from products.json via fetch — use a local server or GitHub Pages
 *    (opening index.html as file:// may block fetch in some browsers).
 */

// ========== CONFIG — update for your business ==========
const WHATSAPP_NUMBER = "919876543210"; // Example: India +91 98765 43210 → 919876543210

/**
 * Builds a WhatsApp click URL with an encoded pre-filled message.
 * @param {string} text - Plain text message (will be URL-encoded).
 */
function buildWhatsAppUrl(text) {
  const base = "https://wa.me/" + WHATSAPP_NUMBER;
  const encoded = encodeURIComponent(text);
  return base + "?text=" + encoded;
}

/**
 * Order message template for a product.
 */
function orderMessageForProduct(product) {
  const priceStr = formatRupee(product.price);
  return (
    "Hello, I want to order " +
    product.name +
    " priced at " +
    priceStr
  );
}

/** Format number as Indian Rupee for display (e.g. ₹12,999) */
function formatRupee(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

/** Fetch products once; cache for the session */
let productsCache = null;

async function loadProducts() {
  if (productsCache) return productsCache;
  const res = await fetch("products.json");
  if (!res.ok) throw new Error("Could not load products.json");
  productsCache = await res.json();
  return productsCache;
}

/**
 * Create HTML for one product card (used on home and products pages).
 */
function createProductCard(product) {
  const msg = orderMessageForProduct(product);
  const waUrl = buildWhatsAppUrl(msg);
  const alt =
    product.name + " — " + (product.description || "").slice(0, 80);
  const category = product.category || "Jewelry";

  return (
    '<article class="product-card">' +
    '<div class="product-card__image-wrap">' +
    '<img src="' +
    escapeHtml(product.image) +
    '" alt="' +
    escapeHtml(alt) +
    '" width="400" height="400" loading="lazy" />' +
    "</div>" +
    '<div class="product-card__body">' +
    '<p class="product-card__category">' +
    escapeHtml(category) +
    "</p>" +
    "<h3 class=\"product-card__name\">" +
    escapeHtml(product.name) +
    "</h3>" +
    '<p class="product-card__price">' +
    formatRupee(product.price) +
    "</p>" +
    '<p class="product-card__desc">' +
    escapeHtml(product.description || "") +
    "</p>" +
    '<a href="' +
    escapeHtml(waUrl) +
    '" class="btn btn--whatsapp" target="_blank" rel="noopener noreferrer">Order on WhatsApp</a>' +
    "</div>" +
    "</article>"
  );
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Home page: featured products (featured === true, max 6) */
async function renderFeaturedProducts() {
  const root = document.getElementById("featured-products");
  if (!root) return;

  try {
    const all = await loadProducts();
    const featured = all.filter((p) => p.featured).slice(0, 6);
    if (featured.length === 0) {
      root.innerHTML = all.slice(0, 6).map(createProductCard).join("");
    } else {
      root.innerHTML = featured.map(createProductCard).join("");
    }
  } catch (e) {
    root.innerHTML =
      '<p class="error-msg">Could not load products. If you opened this file from your computer folder, try using <strong>Live Server</strong> in VS Code or publish to <strong>GitHub Pages</strong> so <code>products.json</code> can load.</p>';
    console.error(e);
  }
}

/** Products page: all products + category filter */
let currentFilter = "all";

async function renderProductFilters(categories) {
  const wrap = document.getElementById("product-filters");
  if (!wrap) return;

  const buttons = ['<button type="button" class="filter-btn is-active" data-cat="all">All</button>'];
  categories.forEach((cat) => {
    buttons.push(
      '<button type="button" class="filter-btn" data-cat="' +
        escapeHtml(cat) +
        '">' +
        escapeHtml(cat) +
        "</button>"
    );
  });
  wrap.innerHTML = buttons.join("");

  wrap.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.getAttribute("data-cat") || "all";
      wrap.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderFilteredProducts();
    });
  });
}

async function renderFilteredProducts() {
  const root = document.getElementById("all-products");
  if (!root) return;

  try {
    const all = await loadProducts();
    const list =
      currentFilter === "all"
        ? all
        : all.filter((p) => (p.category || "") === currentFilter);
    if (list.length === 0) {
      root.innerHTML = '<p class="loading-msg">No products in this category.</p>';
      return;
    }
    root.innerHTML = list.map(createProductCard).join("");
  } catch (e) {
    root.innerHTML =
      '<p class="error-msg">Could not load products. Use a local web server or GitHub Pages.</p>';
    console.error(e);
  }
}

async function initProductsPage() {
  const root = document.getElementById("all-products");
  if (!root) return;

  try {
    const all = await loadProducts();
    const cats = [...new Set(all.map((p) => p.category).filter(Boolean))].sort();
    await renderProductFilters(cats);
    await renderFilteredProducts();
  } catch (e) {
    root.innerHTML =
      '<p class="error-msg">Could not load products.json.</p>';
    console.error(e);
  }
}

/** Mobile nav toggle */
function initNav() {
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
}

/** Footer & contact WhatsApp links use data-message */
function initWhatsAppLinks() {
  document.querySelectorAll(".js-footer-whatsapp, #contact-whatsapp-btn").forEach((el) => {
    const msg = el.getAttribute("data-message") || "Hello!";
    el.setAttribute("href", buildWhatsAppUrl(msg));
    if (el.id !== "contact-whatsapp-btn") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    } else {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/** Current year in footer */
function initYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initYear();
  initWhatsAppLinks();
  renderFeaturedProducts();
  initProductsPage();
});
