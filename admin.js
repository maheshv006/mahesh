/**
 * Owner admin — edit catalogue (prices, images, text).
 * Login is only casual protection (credentials are visible in this file).
 * For everyone to see changes: use "Download products.json" and replace the file on GitHub.
 */
(function () {
  var STORAGE_KEY = "sangam_products_override";
  var SESSION_KEY = "sangam_admin_session";
  var ADMIN_USER = "MVPATIL";
  var ADMIN_PASS = "006";

  var loginEl = document.getElementById("admin-login");
  var panelEl = document.getElementById("admin-panel");
  var tbody = document.getElementById("admin-rows");
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

    var res = await fetch("products.json");
    if (!res.ok) throw new Error("Could not load products.json");
    var data = await res.json();
    return data.map(normalizeRow);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function renderRows(products) {
    tbody.innerHTML = products
      .map(function (p, i) {
        return (
          "<tr data-idx='" +
          i +
          "'>" +
          "<td><input type='number' class='inp-id' value='" +
          esc(p.id) +
          "' min='1' /></td>" +
          "<td><input type='text' class='inp-name' value=\"" +
          esc(p.name) +
          "\" /></td>" +
          "<td><input type='number' class='inp-price' value='" +
          esc(p.price) +
          "' min='0' step='1' /></td>" +
          "<td><input type='text' class='inp-category' value=\"" +
          esc(p.category) +
          "\" /></td>" +
          "<td><input type='text' class='inp-image' value=\"" +
          esc(p.image) +
          "\" placeholder='images/photo.jpg or https://...' /></td>" +
          "<td><textarea class='inp-desc' rows='2'>" +
          esc(p.description) +
          "</textarea></td>" +
          "<td style='text-align:center'><input type='checkbox' class='inp-featured' " +
          (p.featured ? "checked" : "") +
          " /></td>" +
          "<td><button type='button' class='admin-del' data-del='" +
          i +
          "'>Remove</button></td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll(".admin-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-del"), 10);
        var rows = collectFromDom();
        rows.splice(idx, 1);
        renderRows(rows.length ? rows : [emptyProduct(1)]);
      });
    });
  }

  function emptyProduct(id) {
    return {
      id: id,
      name: "",
      price: 0,
      category: "Jewelry",
      image: "images/product1.svg",
      description: "",
      featured: false,
    };
  }

  function collectFromDom() {
    var trs = tbody.querySelectorAll("tr");
    var out = [];
    trs.forEach(function (tr, i) {
      var id = tr.querySelector(".inp-id");
      var name = tr.querySelector(".inp-name");
      var price = tr.querySelector(".inp-price");
      var cat = tr.querySelector(".inp-category");
      var img = tr.querySelector(".inp-image");
      var desc = tr.querySelector(".inp-desc");
      var feat = tr.querySelector(".inp-featured");
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
    fetch("products.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        renderRows(data.map(normalizeRow));
        alert("Loaded data from products.json on the website (form only — not saved yet).");
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
      alert("Could not save (storage full or blocked).");
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
