// Bufab NCR Log — minimal client logic.
// Persists submissions to localStorage so the demo works fully offline.
// In a real deployment, the form would POST to an internal API behind
// Managed Identity → Cosmos / SQL.

(function () {
  "use strict";

  var STORAGE_KEY = "bufab.ncr.entries.v1";

  function loadEntries() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // Storage may be disabled. Demo continues; nothing persists.
    }
  }

  function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRecent() {
    var list = document.getElementById("recent-list");
    if (!list) return;
    var entries = loadEntries();
    if (entries.length === 0) {
      list.innerHTML =
        '<li class="recent-empty">Nothing logged yet — submit the form above and your entry will appear here.</li>';
      return;
    }
    var rows = entries
      .slice()
      .reverse()
      .slice(0, 10)
      .map(function (e) {
        var sevClass = "recent-item__severity recent-item__severity--" + e.severity;
        return (
          '<li>' +
          '<div class="recent-item__row">' +
          '<span class="recent-item__id">' +
          escapeHtml(e.ncrId) +
          "</span>" +
          '<span class="recent-item__supplier">' +
          escapeHtml(e.supplier) +
          " · " +
          escapeHtml(e.partNumber) +
          "</span>" +
          '<span class="' +
          sevClass +
          '">' +
          escapeHtml(e.severity) +
          "</span>" +
          "</div>" +
          '<p class="recent-item__desc">' +
          escapeHtml(e.description) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
    list.innerHTML = rows;
  }

  function handleSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var data = new FormData(form);
    var photoFiles = form.querySelector("#photos");
    var entry = {
      ncrId: String(data.get("ncrId") || "").trim(),
      supplier: String(data.get("supplier") || "").trim(),
      partNumber: String(data.get("partNumber") || "").trim(),
      severity: String(data.get("severity") || "").trim(),
      customerImpact: String(data.get("customerImpact") || "").trim(),
      description: String(data.get("description") || "").trim(),
      photoCount: photoFiles && photoFiles.files ? photoFiles.files.length : 0,
      submittedAt: new Date().toISOString(),
    };
    if (
      !entry.ncrId ||
      !entry.supplier ||
      !entry.partNumber ||
      !entry.severity ||
      !entry.customerImpact ||
      !entry.description
    ) {
      window.alert("Please fill in every required field.");
      return;
    }
    var entries = loadEntries();
    entries.push(entry);
    saveEntries(entries);
    form.reset();
    renderRecent();
    var recent = document.getElementById("recent");
    if (recent && typeof recent.scrollIntoView === "function") {
      recent.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("ncr-form");
    if (form) form.addEventListener("submit", handleSubmit);
    renderRecent();
  });
})();
