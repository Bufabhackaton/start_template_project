// Bufab Catalog — client-side search, filter, and mock-order.
// Static mock data only; no backend.

(function () {
  "use strict";

  /**
   * Inspired by Bufab's customer-unique-products line (bolts, screws,
   * washers, anchors, studs, threaded rod). All values are illustrative.
   */
  var PRODUCTS = [
    {
      id: "BF-10023",
      name: "Hex Head Bolt M8x20",
      material: "Stainless steel A2",
      description: "ISO 4017 fully threaded hex bolt for general industrial fastening.",
      length: "20 mm",
      surface: "Plain",
      stock: "in",
    },
    {
      id: "BF-10024",
      name: "Hex Head Bolt M8x25",
      material: "Stainless steel A4",
      description: "ISO 4017 marine-grade hex bolt for corrosive environments.",
      length: "25 mm",
      surface: "Plain",
      stock: "in",
    },
    {
      id: "BF-10025",
      name: "Hex Head Bolt M10x30",
      material: "Carbon steel 8.8",
      description: "DIN 933 hex bolt for medium-load structural fastening.",
      length: "30 mm",
      surface: "Zinc-plated",
      stock: "low",
    },
    {
      id: "BF-20104",
      name: "Socket Cap Screw M6x16",
      material: "Carbon steel 10.9",
      description: "DIN 912 high-tensile socket head cap screw for precision assemblies.",
      length: "16 mm",
      surface: "Black oxide",
      stock: "in",
    },
    {
      id: "BF-20107",
      name: "Socket Cap Screw M8x40",
      material: "Stainless steel A2",
      description: "DIN 912 stainless socket cap screw, low-profile head.",
      length: "40 mm",
      surface: "Plain",
      stock: "in",
    },
    {
      id: "BF-30055",
      name: "Flat Washer M8",
      material: "Stainless steel A2",
      description: "DIN 125 form A flat washer for M8 bolts. Sold in bulk packs.",
      length: "—",
      surface: "Plain",
      stock: "in",
    },
    {
      id: "BF-30058",
      name: "Spring Lock Washer M10",
      material: "Carbon steel 8.8",
      description: "DIN 127 single-coil spring washer for vibration resistance.",
      length: "—",
      surface: "Zinc-plated",
      stock: "in",
    },
    {
      id: "BF-40012",
      name: "Hex Nut M8",
      material: "Stainless steel A4",
      description: "ISO 4032 marine-grade hex nut. Pairs with BF-10024 series.",
      length: "—",
      surface: "Plain",
      stock: "in",
    },
    {
      id: "BF-40015",
      name: "Nylon Lock Nut M10",
      material: "Carbon steel 8.8",
      description: "DIN 985 prevailing-torque nylon insert nut. Single-use.",
      length: "—",
      surface: "Zinc-plated",
      stock: "warning",
    },
    {
      id: "BF-50220",
      name: "Threaded Rod M12 — 1m",
      material: "Carbon steel 10.9",
      description: "DIN 976 fully threaded rod, cut to 1000 mm. Custom lengths on request.",
      length: "1000 mm",
      surface: "Hot-dip galvanized",
      stock: "in",
    },
    {
      id: "BF-60331",
      name: "Concrete Anchor M10x80",
      material: "Carbon steel 8.8",
      description: "Wedge anchor for cracked and uncracked concrete, ETA Option 1.",
      length: "80 mm",
      surface: "Hot-dip galvanized",
      stock: "low",
    },
    {
      id: "BF-70008",
      name: "Brass Insert Nut M5",
      material: "Brass",
      description: "Press-fit threaded insert for plastic enclosures.",
      length: "—",
      surface: "Plain",
      stock: "out",
    },
  ];

  var STOCK_PRESENTATION = {
    in: { label: "In stock", className: "badge--success" },
    low: { label: "Low stock", className: "badge--warning" },
    warning: { label: "Back order", className: "badge--warning" },
    out: { label: "Out of stock", className: "badge--error" },
  };

  /** Currently selected material filter, or "all". */
  var activeFilter = "all";
  /** Trimmed lowercase search query. */
  var activeQuery = "";

  function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function matches(product, query, filter) {
    if (filter !== "all" && product.material !== filter) return false;
    if (!query) return true;
    var haystack = [
      product.id,
      product.name,
      product.material,
      product.description,
      product.surface,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) >= 0;
  }

  function renderRows(products) {
    var tbody = document.getElementById("results-body");
    var emptyState = document.getElementById("empty-state");
    var countEl = document.getElementById("results-count");
    if (!tbody || !emptyState || !countEl) return;

    if (products.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      countEl.textContent = "0 results";
      return;
    }

    emptyState.hidden = true;
    countEl.textContent = products.length + " result" + (products.length === 1 ? "" : "s");

    var rows = products
      .map(function (p) {
        var stock = STOCK_PRESENTATION[p.stock] || STOCK_PRESENTATION.in;
        var disabled = p.stock === "out" ? " disabled" : "";
        return (
          "<tr>" +
          '<td><div class="cell-part">' +
          '<span class="cell-part__id">' +
          escapeHtml(p.id) +
          "</span>" +
          '<span class="cell-part__name">' +
          escapeHtml(p.name) +
          "</span>" +
          "</div></td>" +
          "<td>" +
          escapeHtml(p.material) +
          "</td>" +
          '<td class="cell-description">' +
          escapeHtml(p.description) +
          "</td>" +
          '<td class="cell-length">' +
          escapeHtml(p.length) +
          "</td>" +
          "<td>" +
          escapeHtml(p.surface) +
          "</td>" +
          "<td>" +
          '<span class="badge ' +
          stock.className +
          '">' +
          escapeHtml(stock.label) +
          "</span></td>" +
          '<td style="text-align:right;">' +
          '<button class="btn btn--cta" data-part-id="' +
          escapeHtml(p.id) +
          '" data-part-name="' +
          escapeHtml(p.name) +
          '"' +
          disabled +
          ">Order</button>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    tbody.innerHTML = rows;
  }

  function applyFilters() {
    var filtered = PRODUCTS.filter(function (p) {
      return matches(p, activeQuery, activeFilter);
    });
    renderRows(filtered);
  }

  function setActiveChip(value) {
    var chips = document.querySelectorAll(".chip");
    Array.prototype.forEach.call(chips, function (c) {
      if (c.getAttribute("data-filter") === value) {
        c.classList.add("chip--selected");
      } else {
        c.classList.remove("chip--selected");
      }
    });
  }

  function showToast(message) {
    var toast = document.getElementById("order-toast");
    var text = document.getElementById("order-toast-text");
    if (!toast || !text) return;
    text.textContent = message;
    toast.hidden = false;
    if (showToast._timer) clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.hidden = true;
    }, 2400);
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyFilters();

    var input = document.getElementById("search-input");
    var clearBtn = document.getElementById("search-clear");
    if (input) {
      input.addEventListener("input", function () {
        activeQuery = String(input.value || "").trim().toLowerCase();
        if (clearBtn) {
          clearBtn.setAttribute("data-visible", input.value ? "true" : "false");
        }
        applyFilters();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!input) return;
        input.value = "";
        activeQuery = "";
        clearBtn.setAttribute("data-visible", "false");
        applyFilters();
        input.focus();
      });
    }

    var chipBar = document.getElementById("filter-chips");
    if (chipBar) {
      chipBar.addEventListener("click", function (e) {
        var target = e.target;
        if (!target || target.tagName !== "BUTTON") return;
        var value = target.getAttribute("data-filter");
        if (!value) return;
        activeFilter = value;
        setActiveChip(value);
        applyFilters();
      });
    }

    var tbody = document.getElementById("results-body");
    if (tbody) {
      tbody.addEventListener("click", function (e) {
        var target = e.target;
        if (!target || target.tagName !== "BUTTON") return;
        var partId = target.getAttribute("data-part-id");
        var partName = target.getAttribute("data-part-name");
        if (!partId) return;
        showToast(partId + " — " + partName + " added to order");
      });
    }
  });
})();
