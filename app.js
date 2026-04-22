/* ═══════════════════════════════════════════════
   DSA Revision Tracker – Application Logic
   File-based DB via Express REST API
   ═══════════════════════════════════════════════ */

(() => {
  "use strict";

  const API = "/api/questions";

  // ── In-memory cache (synced with server) ──
  let questionsCache = [];

  // ── DOM References ──
  const $tableBody    = document.getElementById("table-body");
  const $emptyState   = document.getElementById("empty-state");
  const $modalOverlay = document.getElementById("modal-overlay");
  const $modalTitle   = document.getElementById("modal-title");
  const $form         = document.getElementById("question-form");
  const $toast        = document.getElementById("toast");
  const $search       = document.getElementById("search-input");
  const $filterTopic  = document.getElementById("filter-topic");
  const $filterDiff   = document.getElementById("filter-difficulty");
  const $filterImp    = document.getElementById("filter-importance");
  const $filterStatus = document.getElementById("filter-status");
  const $progressFill = document.getElementById("progress-fill");
  const $progressLbl  = document.getElementById("progress-label");
  const $topicGrid    = document.getElementById("topic-progress-grid");
  const $topicSection = document.getElementById("topic-progress-section");
  const $starRating   = document.getElementById("star-rating");
  const $formImportance = document.getElementById("form-importance");

  // Form fields
  const $fId         = document.getElementById("form-id");
  const $fTopic      = document.getElementById("form-topic");
  const $fName       = document.getElementById("form-name");
  const $fLink       = document.getElementById("form-link");
  const $fDifficulty = document.getElementById("form-difficulty");
  const $fStatus     = document.getElementById("form-status");
  const $fTrick      = document.getElementById("form-trick");
  const $fTags       = document.getElementById("form-tags");

  // Sorting state
  let sortKey = "topic";
  let sortDir = "asc";

  // ══════════════════════════════════════
  //  API Layer
  // ══════════════════════════════════════
  async function fetchAll() {
    try {
      const res = await fetch(API);
      questionsCache = await res.json();
    } catch (err) {
      console.error("Failed to fetch questions:", err);
      toast("Server unreachable — is it running?");
    }
    return questionsCache;
  }

  async function apiCreate(question) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    });
    return res.json();
  }

  async function apiUpdate(id, question) {
    const res = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    });
    return res.json();
  }

  async function apiDelete(id) {
    await fetch(`${API}/${id}`, { method: "DELETE" });
  }

  async function apiImport(data) {
    const res = await fetch(`${API}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // ══════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════
  function uuid() {
    return "xxxxxxxx-xxxx-4xxx".replace(/[x]/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.remove("hidden");
    $toast.classList.add("show");
    clearTimeout($toast._t);
    $toast._t = setTimeout(() => {
      $toast.classList.remove("show");
      setTimeout(() => $toast.classList.add("hidden"), 350);
    }, 2500);
  }

  function statusLabel(s) {
    return { Todo: "To Do", Solved: "Solved", Revision: "Revision" }[s] || s;
  }

  // ══════════════════════════════════════
  //  Render
  // ══════════════════════════════════════
  function renderUI() {
    const all = questionsCache;
    const filtered = applyFilters(all);
    const sorted = applySort(filtered);

    renderStats(all);
    renderTopicProgress(all);
    renderTopicFilter(all);
    renderTopicSuggestions(all);
    renderTable(sorted);
  }

  function renderStats(data) {
    const total    = data.length;
    const solved   = data.filter(q => q.status === "Solved").length;
    const revision = data.filter(q => q.status === "Revision").length;
    const todo     = data.filter(q => q.status === "Todo").length;
    const pct      = total ? Math.round((solved / total) * 100) : 0;

    document.querySelector("#stat-total .stat-value").textContent   = total;
    document.querySelector("#stat-solved .stat-value").textContent  = solved;
    document.querySelector("#stat-revision .stat-value").textContent = revision;
    document.querySelector("#stat-todo .stat-value").textContent    = todo;
    $progressFill.style.width = pct + "%";
    $progressLbl.textContent  = pct + " % complete";
  }

  function renderTopicProgress(data) {
    const topics = {};
    data.forEach(q => {
      if (!topics[q.topic]) topics[q.topic] = { total: 0, solved: 0 };
      topics[q.topic].total++;
      if (q.status === "Solved") topics[q.topic].solved++;
    });

    const keys = Object.keys(topics).sort();
    if (keys.length === 0) {
      $topicSection.classList.add("hidden");
      return;
    }
    $topicSection.classList.remove("hidden");

    $topicGrid.innerHTML = keys.map(t => {
      const pct = Math.round((topics[t].solved / topics[t].total) * 100);
      return `
        <div class="topic-progress-card">
          <div class="topic-progress-header">
            <span class="topic-progress-name">${esc(t)}</span>
            <span class="topic-progress-count">${topics[t].solved}/${topics[t].total}</span>
          </div>
          <div class="topic-bar-bg">
            <div class="topic-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join("");
  }

  function renderTopicFilter(data) {
    const topics = [...new Set(data.map(q => q.topic))].sort();
    const current = $filterTopic.value;
    $filterTopic.innerHTML = `<option value="">All Topics</option>` +
      topics.map(t => `<option value="${esc(t)}"${t === current ? " selected" : ""}>${esc(t)}</option>`).join("");
  }

  function renderTopicSuggestions(data) {
    const topics = [...new Set(data.map(q => q.topic))].sort();
    document.getElementById("topic-suggestions").innerHTML =
      topics.map(t => `<option value="${esc(t)}">`).join("");
  }

  function renderTable(data) {
    if (data.length === 0) {
      $tableBody.innerHTML = "";
      $emptyState.classList.remove("hidden");
      return;
    }
    $emptyState.classList.add("hidden");

    $tableBody.innerHTML = data.map((q, i) => {
      const stars = "★".repeat(q.importance) + "☆".repeat(5 - q.importance);
      const diffClass = q.difficulty.toLowerCase();
      const statusClass = q.status.toLowerCase();
      const nameCell = q.link
        ? `<a class="question-link" href="${esc(q.link)}" target="_blank" rel="noopener">${esc(q.name)}</a>`
        : esc(q.name);
      const tagsHtml = (q.tags || []).length
        ? `<div class="tags-row">${q.tags.map(t => `<span class="tag-chip">${esc(t)}</span>`).join("")}</div>`
        : "";
      const lastRev = q.lastRevised
        ? new Date(q.lastRevised).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

      return `
      <tr style="animation-delay:${i * 30}ms">
        <td>${esc(q.topic)}</td>
        <td>${nameCell}${tagsHtml}</td>
        <td><span class="badge badge-${diffClass}">${q.difficulty}</span></td>
        <td><span class="stars">${stars}</span></td>
        <td><span class="badge badge-${statusClass}">${statusLabel(q.status)}</span></td>
        <td><div class="trick-text">${esc(q.trick || "—")}</div></td>
        <td>${lastRev}</td>
        <td>
          <div class="action-btns">
            <button title="Edit" onclick="APP.edit('${q.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button title="Toggle Status" onclick="APP.toggleRevise('${q.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
            <button class="btn-delete" title="Delete" onclick="APP.remove('${q.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  // ══════════════════════════════════════
  //  Filtering & Sorting
  // ══════════════════════════════════════
  function applyFilters(data) {
    const search = $search.value.toLowerCase().trim();
    const topic  = $filterTopic.value;
    const diff   = $filterDiff.value;
    const imp    = $filterImp.value;
    const status = $filterStatus.value;

    return data.filter(q => {
      if (topic && q.topic !== topic) return false;
      if (diff && q.difficulty !== diff) return false;
      if (imp && q.importance !== +imp) return false;
      if (status && q.status !== status) return false;
      if (search) {
        const hay = `${q.topic} ${q.name} ${q.trick || ""} ${(q.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  function applySort(data) {
    return [...data].sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (sortKey === "importance") { va = +va; vb = +vb; }
      if (sortKey === "lastRevised") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  // ══════════════════════════════════════
  //  Modal
  // ══════════════════════════════════════
  function openModal(title = "Add Question") {
    $modalTitle.textContent = title;
    $modalOverlay.classList.remove("hidden");
    setTimeout(() => $fTopic.focus(), 100);
  }

  function closeModal() {
    $modalOverlay.classList.add("hidden");
    $form.reset();
    $fId.value = "";
    setStarRating(3);
  }

  function setStarRating(val) {
    $formImportance.value = val;
    $starRating.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("active", +s.dataset.val <= val);
    });
  }

  // ══════════════════════════════════════
  //  CRUD (async, server-backed)
  // ══════════════════════════════════════
  async function addOrUpdate(e) {
    e.preventDefault();
    const id = $fId.value || uuid();
    const isEdit = !!$fId.value;
    const tagsRaw = $fTags.value.trim();
    const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

    const existing = isEdit ? questionsCache.find(q => q.id === id) : null;

    const question = {
      id,
      topic: $fTopic.value.trim(),
      name: $fName.value.trim(),
      link: $fLink.value.trim(),
      difficulty: $fDifficulty.value,
      importance: +$formImportance.value,
      status: $fStatus.value,
      trick: $fTrick.value.trim(),
      tags,
      lastRevised: $fStatus.value === "Solved" ? new Date().toISOString() : (existing?.lastRevised || null),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    try {
      if (isEdit) {
        await apiUpdate(id, question);
      } else {
        await apiCreate(question);
      }
      await fetchAll();
      closeModal();
      renderUI();
      toast(isEdit ? "Question updated!" : "Question added!");
    } catch (err) {
      toast("Failed to save — check server.");
    }
  }

  function editQuestion(id) {
    const q = questionsCache.find(q => q.id === id);
    if (!q) return;
    $fId.value         = q.id;
    $fTopic.value      = q.topic;
    $fName.value       = q.name;
    $fLink.value       = q.link || "";
    $fDifficulty.value = q.difficulty;
    $fStatus.value     = q.status;
    $fTrick.value      = q.trick || "";
    $fTags.value       = (q.tags || []).join(", ");
    setStarRating(q.importance);
    openModal("Edit Question");
  }

  async function removeQuestion(id) {
    if (!confirm("Delete this question?")) return;
    try {
      await apiDelete(id);
      await fetchAll();
      renderUI();
      toast("Question deleted.");
    } catch (err) {
      toast("Failed to delete.");
    }
  }

  async function toggleRevise(id) {
    const q = questionsCache.find(q => q.id === id);
    if (!q) return;
    const cycle = { Todo: "Solved", Solved: "Revision", Revision: "Todo" };
    const newStatus = cycle[q.status] || "Todo";
    const update = { status: newStatus };
    if (newStatus === "Solved") update.lastRevised = new Date().toISOString();
    try {
      await apiUpdate(id, update);
      await fetchAll();
      renderUI();
      toast(`Status → ${statusLabel(newStatus)}`);
    } catch (err) {
      toast("Failed to update.");
    }
  }

  // ══════════════════════════════════════
  //  Import / Export
  // ══════════════════════════════════════
  function exportData() {
    const blob = new Blob([JSON.stringify(questionsCache, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsa-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported successfully!");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        const result = await apiImport(imported);
        await fetchAll();
        renderUI();
        toast(`Imported ${result.added} new question(s)!`);
      } catch (err) {
        toast("Import failed: invalid JSON.");
      }
    };
    reader.readAsText(file);
  }

  // ══════════════════════════════════════
  //  Event Listeners
  // ══════════════════════════════════════
  document.getElementById("btn-add").addEventListener("click", () => {
    closeModal();
    openModal("Add Question");
  });

  document.getElementById("btn-cancel").addEventListener("click", closeModal);

  $modalOverlay.addEventListener("click", (e) => {
    if (e.target === $modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$modalOverlay.classList.contains("hidden")) closeModal();
  });

  $form.addEventListener("submit", addOrUpdate);

  $starRating.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", () => setStarRating(+star.dataset.val));
  });

  // Filters — client-side only, no server roundtrip needed
  [$search, $filterTopic, $filterDiff, $filterImp, $filterStatus].forEach(el => {
    el.addEventListener("input", renderUI);
    el.addEventListener("change", renderUI);
  });

  // Sort
  document.querySelectorAll("#questions-table thead th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      document.querySelectorAll(".sort-arrow").forEach(a => a.textContent = "");
      th.querySelector(".sort-arrow").textContent = sortDir === "asc" ? " ↑" : " ↓";
      renderUI();
    });
  });

  document.getElementById("btn-export").addEventListener("click", exportData);

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", (e) => {
    if (e.target.files[0]) {
      importData(e.target.files[0]);
      e.target.value = "";
    }
  });

  // ══════════════════════════════════════
  //  Public API (for inline onclick)
  // ══════════════════════════════════════
  window.APP = {
    edit: editQuestion,
    remove: removeQuestion,
    toggleRevise
  };

  // ── Initial Load ──
  setStarRating(3);
  fetchAll().then(renderUI);
})();
