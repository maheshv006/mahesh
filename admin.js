/**
 * Owner admin — edit catalogue (prices, images, text).
 * Login is only casual protection (credentials are visible in this file).
 * For everyone to see changes: use "Download products.json" and replace the file on GitHub.
 *
 * Local image upload: files are embedded as base64 (data URLs) in products.json.
 */
(function () {
  var STORAGE_KEY = "sangam_products_override";
  var SESSION_KEY = "sangam_admin_session";
  var ADMIN_USER = "MVPATIL";
  var ADMIN_PASS = "006";
  var MAX_FILE_MB = 2.5;
  var MAX_DIMENSION = 1000;
  var JPEG_QUALITY = 0.88;

  var loginEl = document.getElementById("admin-login");
  var panelEl = document.getElementById("admin-panel");
  var listEl = document.getElementById("admin-rows");
  var errEl = document.getElementById("admin-login-error");

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
  }

  function isLoggedIn() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setLoggedIn(yes) {
    try {
      if (yes) sessionStorage.setItem(SESSION_KEY, "1");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function showLogin() {
    loginEl.hidden = false;
    panelEl.hidden = true;
  }

  function showPanel() {
    loginEl.hidden = true;
    panelEl.hidden = false;
  }

  function normalizeRow(p, index) {
    return {
      id: Number(p.id) || index + 1,
      name: String(p.name || "").trim(),
      price: Number(String(p.price).replace(/,/g, "")) || 0,
      category: String(p.category || "Jewelry").trim(),
      image: String(p.image || "").trim(),
      description: String(p.description || "").trim(),
      featured: Boolean(p.featured),
    };
  }

  async function loadBaselineProducts() {
    try {
      var local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        var j = JSON.parse(local);
        if (Array.isArray(j) && j.length) return j.map(normalizeRow);
      }
    } catch (e) {}

    var res = await fetch("products.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load products.json");
    var data = await res.json();
    return data.map(normalizeRow);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function processImageFile(file, done) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert("File is larger than " + MAX_FILE_MB + " MB. Please choose a smaller image.");
      done(null);
      return;
    }
    if (!file.type || file.type.indexOf("image/") !== 0) {
      alert("Please choose an image file.");
      done(null);
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var raw = reader.result;
      if (file.type === "image/svg+xml" || file.type === "image/gif") {
        done(raw);
        return;
      }
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        var scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
        var nw = Math.max(1, Math.round(w * scale));
        var nh = Math.max(1, Math.round(h * scale));
        var cv = document.createElement("canvas");
        cv.width = nw;
        cv.height = nh;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, nw, nh);
        ctx.drawImage(img, 0, 0, nw, nh);
        try {
          done(cv.toDataURL("image/jpeg", JPEG_QUALITY));
        } catch (err) {
          done(raw);
        }
      };
      img.onerror = function () {
        done(raw);
      };
      img.src = raw;
    };
    reader.onerror = function () {
      alert("Could not read that file.");
      done(null);
    };
    reader.readAsDataURL(file);
  }

  function updatePreview(card, src) {
    var prev = card.querySelector(".admin-preview");
    if (!prev) return;
    if (!src || !String(src).trim()) {
      prev.innerHTML = "";
      return;
    }
    prev.innerHTML =
      '<img src="' + esc(String(src)) + '" alt="Preview" width="96" height="96" loading="lazy" />';
  }

  function bindFileInputs() {
    listEl.querySelectorAll(".inp-file").forEach(function (fileInp) {
      fileInp.addEventListener("change", function () {
        var card = fileInp.closest(".admin-product-card");
        var ta = card ? card.querySelector(".inp-image") : null;
        var f = fileInp.files && fileInp.files[0];
        fileInp.value = "";
        if (!f || !card || !ta) return;
        processImageFile(f, function (dataUrl) {
          if (!dataUrl) return;
          ta.value = dataUrl;
          updatePreview(card, dataUrl);
        });
      });
    });
  }

  function renderRows(products) {
    listEl.innerHTML = products
      .map(function (p, i) {
        var imgVal = esc(p.image);
        return (
          '<div class="admin-product-card" data-idx="' +
          i +
          '">' +
          '<div class="admin-card__title">Product #' +
          (i + 1) +
          "</div>" +
          '<div class="admin-card__fields">' +
          '<label class="admin-field"><span class="admin-field__label">ID</span>' +
          '<input type="number" class="inp-id" value="' +
          esc(p.id) +
          '" min="1" /></label>' +
          '<label class="admin-field"><span class="admin-field__label">Name</span>' +
          '<input type="text" class="inp-name" value="' +
          esc(p.name) +
          '" /></label>' +
          '<label class="admin-field"><span class="admin-field__label">Price (₹)</span>' +
          '<input type="number" class="inp-price" value="' +
          esc(p.price) +
          '" min="0" step="1" /></label>' +
          '<label class="admin-field"><span class="admin-field__label">Category</span>' +
          '<input type="text" class="inp-category" value="' +
          esc(p.category) +
          '" /></label>' +
          "</div>" +
          '<div class="admin-card__upload">' +
          '<span class="admin-field__label">Upload from gallery / camera / files</span>' +
          '<input type="file" class="inp-file" accept="image/*" />' +
          '<div class="admin-preview"></div>' +
          '<span class="admin-field__label">Image data or link (auto-filled when you upload)</span>' +
          '<textarea class="inp-image" rows="4" placeholder="Choose a file above, or paste images/photo.jpg or https://...">' +
          imgVal +
          "</textarea>" +
          "</div>" +
          '<label class="admin-field"><span class="admin-field__label">Description</span>' +
          '<textarea class="inp-desc" rows="3">' +
          esc(p.description) +
          "</textarea></label>" +
          '<label class="admin-field admin-field--inline">' +
          '<input type="checkbox" class="inp-featured" ' +
          (p.featured ? "checked " : "") +
          "/>" +
          '<span class="admin-field__label" style="text-transform:none;letter-spacing:0">Featured on home page</span>' +
          "</label>" +
          '<button type="button" class="admin-del btn btn--danger btn--small" data-del="' +
          i +
          '">Remove this product</button>' +
          "</div>"
        );
      })
      .join("");

    listEl.querySelectorAll(".admin-product-card").forEach(function (card) {
      var ta = card.querySelector(".inp-image");
      if (ta && ta.value.trim()) updatePreview(card, ta.value.trim());
    });

    listEl.querySelectorAll(".admin-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-del"), 10);
        var rows = collectFromDom();
        rows.splice(idx, 1);
        renderRows(rows.length ? rows : [emptyProduct(1)]);
      });
    });

    bindFileInputs();
  }

  function emptyProduct(id) {
    return {
      id: id,
      name: "",
      price: 0,
      category: "Jewelry",
      image: "",
      description: "",
      featured: false,
    };
  }

  function collectFromDom() {
    var cards = listEl.querySelectorAll(".admin-product-card");
    var out = [];
    cards.forEach(function (card, i) {
      var id = card.querySelector(".inp-id");
      var name = card.querySelector(".inp-name");
      var price = card.querySelector(".inp-price");
      var cat = card.querySelector(".inp-category");
      var img = card.querySelector(".inp-image");
      var desc = card.querySelector(".inp-desc");
      var feat = card.querySelector(".inp-featured");
      out.push(
        normalizeRow(
          {
            id: id ? id.value : i + 1,
            name: name ? name.value : "",
            price: price ? price.value : 0,
            category: cat ? cat.value : "",
            image: img ? img.value : "",
            description: desc ? desc.value : "",
            featured: feat && feat.checked,
          },
          i
        )
      );
    });
    return out.filter(function (p) {
      return p.name.length > 0;
    });
  }

  function nextId(rows) {
    var m = 0;
    rows.forEach(function (r) {
      if (r.id > m) m = r.id;
    });
    return m + 1;
  }

  document.getElementById("admin-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    var u = (document.getElementById("admin-user").value || "").trim();
    var p = document.getElementById("admin-pass").value || "";
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      setLoggedIn(true);
      showPanel();
      loadBaselineProducts()
        .then(function (rows) {
          renderRows(rows);
        })
        .catch(function () {
          renderRows([emptyProduct(1)]);
        });
    } else {
      showError("Wrong username or password.");
    }
  });

  document.getElementById("admin-logout").addEventListener("click", function () {
    setLoggedIn(false);
    showLogin();
    showError("");
  });

  document.getElementById("admin-load-server").addEventListener("click", function () {
    fetch("products.json", { cache: "no-store" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        renderRows(data.map(normalizeRow));
        alert("Loaded data from products.json on the website (not saved yet).");
      })
      .catch(function () {
        alert("Could not load products.json.");
      });
  });

  document.getElementById("admin-save-local").addEventListener("click", function () {
    var rows = collectFromDom();
    if (!rows.length) {
      alert("Add at least one product with a name.");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      alert(
        "Saved in this browser only. Open Home/Products here to preview. Other people still see GitHub until you upload the file."
      );
    } catch (e) {
      alert(
        "Could not save — catalogue may be too large for this browser. Try fewer/smaller photos or use Download only."
      );
    }
  });

  document.getElementById("admin-download").addEventListener("click", function () {
    var rows = collectFromDom();
    if (!rows.length) {
      alert("Add at least one product with a name.");
      return;
    }
    var json = JSON.stringify(rows, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.json";
    a.click();
    URL.revokeObjectURL(a.href);
    alert(
      "Downloaded products.json — replace the file in your GitHub repo (same name), then push, to update the live site for everyone."
    );
  });

  document.getElementById("admin-clear-local").addEventListener("click", function () {
    if (!confirm("Remove saved catalogue from this browser? The shop will use products.json again.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    alert("Done. Refresh Home and Products pages.");
  });

  document.getElementById("admin-add-row").addEventListener("click", function () {
    var rows = collectFromDom();
    rows.push(emptyProduct(nextId(rows)));
    renderRows(rows);
  });

  if (isLoggedIn()) {
    showPanel();
    loadBaselineProducts()
      .then(function (rows) {
        renderRows(rows);
      })
      .catch(function () {
        renderRows([emptyProduct(1)]);
      });
  } else {
    showLogin();
  }
})();
