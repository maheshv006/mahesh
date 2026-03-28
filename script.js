/**
 * Sangam Gemstone — site behavior
 * -------------------------------------------
 * 1) WhatsApp: edit WHATSAPP_NUMBER (country code + digits only).
 * 2) Products:
 *    - PRODUCTS_FROM "file" → loads products.json from your site (GitHub).
 *    - PRODUCTS_FROM "web"  → loads JSON from PRODUCTS_WEB_URL (Google Sheet via
 *      Apps Script). Then you edit the Sheet + image links only — see google-apps-script.txt
 */

// ========== CONFIG — update for your business ==========
const WHATSAPP_NUMBER = "918080087432"; // +91 80800 87432 → 918080087432 (digits only)

/** "file" = products.json in the repo | "web" = Google Apps Script URL below */
const PRODUCTS_FROM = "file";

/**
 * Paste your Web App URL here when PRODUCTS_FROM is "web"
 * (from Google Apps Script → Deploy → Web app → ends with /exec)
 */
const PRODUCTS_WEB_URL = "";

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

/** Same key as admin.js — if set, shop uses this instead of products.json (this device only). */
var PRODUCTS_LOCAL_KEY = "sangam_products_override";

/** Fetch products once per page load; cache for the session */
let productsCache = null;

/**
 * Turn sheet/API rows into the shape the site expects.
 * image may be a full https URL or a path like images/x.svg
 */
function normalizeProducts(list) {
  if (!Array.isArray(list)) return [];
  return list.map(function (p, i) {
    var price = p.price;
    if (typeof price === "string") price = price.replace(/,/g, "");
    var featured = p.featured;
    if (typeof featured === "string") {
      featured = featured.toUpperCase() === "TRUE" || featured === "1";
    }
    return {
      id: Number(p.id) || i + 1,
      name: String(p.name || "").trim(),
      price: Number(price) || 0,
      category: String(p.category || "Jewelry").trim(),
      image: String(p.image || "").trim(),
      description: String(p.description || "").trim(),
      featured: Boolean(featured),
    };
  }).filter(function (p) {
    return p.name.length > 0;
  });
}

async function loadProducts() {
  if (productsCache) return productsCache;

  /* Owner edits saved in browser (admin panel) — only affects this browser until you upload JSON to GitHub. */
  try {
    var stored = localStorage.getItem(PRODUCTS_LOCAL_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        productsCache = normalizeProducts(parsed);
        return productsCache;
      }
    }
  } catch (e) {
    /* ignore bad JSON */
  }

  var useWeb =
    PRODUCTS_FROM === "web" &&
    typeof PRODUCTS_WEB_URL === "string" &&
    PRODUCTS_WEB_URL.indexOf("http") === 0;

  if (PRODUCTS_FROM === "web" && !useWeb) {
    console.warn("PRODUCTS_FROM is \"web\" but PRODUCTS_WEB_URL is empty — using products.json.");
  }

  var url = useWeb ? PRODUCTS_WEB_URL : "products.json";
  var res = await fetch(url);
  if (!res.ok) throw new Error("Could not load products from: " + url);

  var data = await res.json();
  productsCache = normalizeProducts(data);
  return productsCache;
}

/**
 * Image URL for <img src>. Full https URLs pass through. Relative paths resolve
 * from the current page folder (fixes GitHub Pages project URLs like /mahesh/).
 * Leading "/" in JSON would wrongly hit site root — we strip it and resolve from the page directory.
 */
function resolveProductImageUrl(path) {
  var p = String(path || "").trim();
  if (!p) return "";
  /* Embedded image from admin "upload from computer" */
  if (/^data:image\//i.test(p)) return p;
  if (/^https?:\/\//i.test(p)) return p;
  var dir = window.location.pathname;
  if (!dir.endsWith("/")) {
    dir = dir.substring(0, dir.lastIndexOf("/") + 1);
  }
  var base = window.location.origin + (dir || "/");
  try {
    return new URL(p.replace(/^\//, ""), base).href;
  } catch (e) {
    return p;
  }
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
  const imgSrc = resolveProductImageUrl(product.image);
  const imgBlock = imgSrc
    ? '<img src="' +
      escapeHtml(imgSrc) +
      '" alt="' +
      escapeHtml(alt) +
      '" width="400" height="400" loading="lazy" />'
    : '<span class="product-card__placeholder">Add a photo in Owner admin</span>';

  return (
    '<article class="product-card">' +
    '<div class="product-card__image-wrap">' +
    imgBlock +
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
