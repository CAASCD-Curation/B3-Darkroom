/* ============================================================
   暗房 / VISUAL DATABASE — app.js
   数据来源: data.js (window.DARKROOM_DATA, 由 build_data.py 生成)
   分组数据: localStorage ("darkroom.groups.v1")
   ============================================================ */

(function () {
  "use strict";

  var DATA = window.DARKROOM_DATA || { meta: { categories: {} }, entries: [] };
  var ENTRIES = DATA.entries;
  var CATS = DATA.meta.categories || {};

  var LS_KEY = "darkroom.groups.v1";

  var state = { cat: "ALL", q: "", tag: null, groupView: null };
  var groups = loadGroups();

  /* ---------------- storage ---------------- */

  function loadGroups() {
    try {
      var g = JSON.parse(localStorage.getItem(LS_KEY));
      return g && typeof g === "object" && !Array.isArray(g) ? g : {};
    } catch (e) { return {}; }
  }
  function saveGroups() {
    localStorage.setItem(LS_KEY, JSON.stringify(groups));
    updateGroupCount();
  }
  function groupNames() { return Object.keys(groups); }
  function inGroup(name, id) { return (groups[name] || []).indexOf(id) !== -1; }

  function createGroup(name) {
    name = (name || "").trim();
    if (!name || groups[name]) return false;
    groups[name] = [];
    saveGroups();
    return true;
  }
  function deleteGroup(name) {
    if (!groups[name]) return;
    delete groups[name];
    if (state.groupView === name) state.groupView = null;
    saveGroups();
  }
  function setMembership(name, id, on) {
    if (!groups[name]) return;
    var arr = groups[name];
    var i = arr.indexOf(id);
    if (on && i === -1) arr.push(id);
    if (!on && i !== -1) arr.splice(i, 1);
    saveGroups();
  }

  /* ---------------- helpers ---------------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function entryById(id) {
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].id === id) return ENTRIES[i];
    return null;
  }
  function catLabel(c) {
    var m = CATS[c];
    return m ? m.en : c;
  }

  /* ---------------- filtering ---------------- */

  function haystack(e) {
    return (e.id + " " + e.title + " " + e.source + " " + e.year + " " +
            (e.tagsRaw || "") + " " + (e.tags || []).join(" ") + " " + e.note).toLowerCase();
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return ENTRIES.filter(function (e) {
      if (state.cat !== "ALL" && e.category !== state.cat) return false;
      if (state.groupView && !inGroup(state.groupView, e.id)) return false;
      if (state.tag && (e.tags || []).indexOf(state.tag) === -1) return false;
      if (q && haystack(e).indexOf(q) === -1) return false;
      return true;
    });
  }

  /* ---------------- card ---------------- */

  function buildCard(e) {
    var card = el("article", "card");
    card.dataset.id = e.id;

    var inner = el("div", "card-inner");

    /* front */
    var front = el("div", "card-face card-front");
    var thumb = el("div", "thumb");
    if (e.images && e.images.length) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = encodeURI(e.images[0]);
      img.alt = e.id + " " + e.title;
      thumb.appendChild(img);
      if (e.images.length > 1) {
        front.appendChild(el("span", "more-badge", "+" + (e.images.length - 1)));
      }
    } else {
      var miss = el("div", "thumb-missing");
      miss.appendChild(el("div", null, e.id));
      miss.appendChild(el("div", null, "IMAGE 缺失"));
      thumb.appendChild(miss);
    }
    front.appendChild(thumb);

    var fm = el("div", "front-meta");
    fm.appendChild(el("span", "fcat", catLabel(e.category)));
    fm.appendChild(el("span", "fid", e.id));
    fm.appendChild(el("h3", "ftitle", e.title));
    front.appendChild(fm);

    /* back */
    var back = el("div", "card-face card-back");
    var bh = document.createElement("header");
    bh.appendChild(el("span", "fid", e.id + " · " + catLabel(e.category)));
    bh.appendChild(el("h3", null, e.title));
    back.appendChild(bh);

    var dl = document.createElement("dl");
    function field(label, valueNode) {
      var div = document.createElement("div");
      div.appendChild(el("dt", null, label));
      var dd = document.createElement("dd");
      if (typeof valueNode === "string") dd.textContent = valueNode || "—";
      else dd.appendChild(valueNode);
      div.appendChild(dd);
      dl.appendChild(div);
      return dd;
    }
    field("出处 / SOURCE", e.source);
    field("年代 / YEAR", e.year);

    var tagWrap = document.createElement("span");
    if (e.tags && e.tags.length) {
      e.tags.forEach(function (t) {
        var b = el("button", "mini-tag", t);
        b.type = "button";
        b.dataset.tag = t;
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          applyTagFilter(t);
        });
        tagWrap.appendChild(b);
      });
    } else {
      tagWrap.textContent = "—";
    }
    var tagDD = field("标签 / TAGS", tagWrap);
    tagDD.parentNode.classList.add("tags");

    field("备注说明 / NOTE", e.note);

    var matWrap = document.createElement("span");
    if (e.materials && e.materials.length) {
      e.materials.forEach(function (m) {
        var a = document.createElement("a");
        a.href = encodeURI(m);
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = m.split("/").pop();
        matWrap.appendChild(a);
        matWrap.appendChild(document.createTextNode(" "));
      });
    } else {
      matWrap.textContent = "—";
    }
    field("材料 / FILES", matWrap);

    back.appendChild(dl);

    /* 加入组 */
    var bg = el("div", "back-groups");
    bg.appendChild(el("span", null, "加入组 / ADD TO GROUP"));
    var checks = el("div", "group-checks");
    bg.appendChild(checks);
    var inline = el("div", "new-group-inline");
    var ni = document.createElement("input");
    ni.type = "text";
    ni.placeholder = "新组名";
    ni.maxLength = 24;
    var nb = el("button", null, "＋ 建组并加入");
    nb.type = "button";
    inline.appendChild(ni);
    inline.appendChild(nb);
    bg.appendChild(inline);
    back.appendChild(bg);

    nb.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var name = ni.value.trim();
      if (!name) return;
      if (createGroup(name)) {
        renderGroupPanel();
        refreshAllGroupChecks();
      }
      setMembership(name, e.id, true);
      refreshAllGroupChecks();
      renderGroupPanel();
      ni.value = "";
    });

    /* stop flip when interacting with back */
    back.addEventListener("click", function (ev) { ev.stopPropagation(); });

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    inner.addEventListener("click", function () {
      card.classList.toggle("flipped");
      if (card.classList.contains("flipped")) renderGroupChecks(checks, e.id);
    });

    return card;
  }

  function renderGroupChecks(container, id) {
    container.innerHTML = "";
    var names = groupNames();
    if (!names.length) {
      container.appendChild(el("span", "gp-empty", "尚未创建任何组"));
      return;
    }
    names.forEach(function (name) {
      var lab = el("label", "group-check");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = inGroup(name, id);
      cb.addEventListener("change", function () {
        setMembership(name, id, cb.checked);
        renderGroupPanel();
        if (state.groupView === name && !cb.checked) renderGrid();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(name));
      container.appendChild(lab);
    });
  }

  function refreshAllGroupChecks() {
    var cards = document.querySelectorAll(".card.flipped");
    cards.forEach(function (card) {
      var c = card.querySelector(".group-checks");
      if (c) renderGroupChecks(c, card.dataset.id);
    });
  }

  /* ---------------- render ---------------- */

  var grid = document.getElementById("grid");
  var emptyState = document.getElementById("emptyState");
  var entryCount = document.getElementById("entryCount");
  var footerCount = document.getElementById("footerCount");
  var statusLine = document.getElementById("statusLine");

  function renderGrid() {
    var list = filtered();
    grid.innerHTML = "";
    var frag = document.createDocumentFragment();
    list.forEach(function (e) { frag.appendChild(buildCard(e)); });
    grid.appendChild(frag);
    emptyState.hidden = list.length > 0;
    var n = list.length;
    entryCount.textContent = n + " ENTRIES";
    footerCount.textContent = "SHOWING " + n + " / " + ENTRIES.length;

    if (state.groupView || state.tag) {
      statusLine.hidden = false;
      statusLine.innerHTML = "";
      var parts = [];
      if (state.groupView) parts.push("GROUP: " + state.groupView);
      if (state.tag) parts.push("TAG: " + state.tag);
      statusLine.appendChild(el("span", null, parts.join(" · ") + " · " + n + " ENTRIES"));
      var quit = el("button", "quit", "清除条件 ×");
      quit.type = "button";
      quit.addEventListener("click", function () {
        state.groupView = null;
        state.tag = null;
        renderTagbar();
        renderGrid();
      });
      statusLine.appendChild(quit);
    } else {
      statusLine.hidden = true;
    }
  }

  /* tag bar */
  var tagbar = document.getElementById("tagbar");
  function allTags() {
    var map = {};
    ENTRIES.forEach(function (e) {
      (e.tags || []).forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; })
      .map(function (t) { return { tag: t, n: map[t] }; });
  }
  function renderTagbar() {
    tagbar.innerHTML = "";
    allTags().forEach(function (item) {
      var b = el("button", "tag-chip" + (state.tag === item.tag ? " active" : ""));
      b.type = "button";
      b.appendChild(document.createTextNode(item.tag));
      b.appendChild(el("span", "n", String(item.n)));
      b.addEventListener("click", function () {
        state.tag = state.tag === item.tag ? null : item.tag;
        renderTagbar();
        renderGrid();
      });
      tagbar.appendChild(b);
    });
  }

  /* group panel */
  var panel = document.getElementById("groupPanel");
  var groupList = document.getElementById("groupList");

  function updateGroupCount() {
    document.getElementById("groupCount").textContent = String(groupNames().length);
  }

  function renderGroupPanel() {
    groupList.innerHTML = "";
    var names = groupNames();
    if (!names.length) {
      groupList.appendChild(el("li", "gp-empty", "暂无分组"));
      return;
    }
    names.forEach(function (name) {
      var li = document.createElement("li");
      var nm = el("span", "gname", name);
      nm.addEventListener("click", function () {
        state.groupView = name;
        panel.hidden = true;
        renderGrid();
      });
      li.appendChild(nm);
      li.appendChild(el("span", "gcount", String(groups[name].length)));
      var del = el("button", "gdel", "删除");
      del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("删除分组「" + name + "」？（不会删除词条本身）")) return;
        deleteGroup(name);
        renderGroupPanel();
        refreshAllGroupChecks();
        renderGrid();
      });
      li.appendChild(del);
      groupList.appendChild(li);
    });
  }

  /* ---------------- events ---------------- */

  document.getElementById("catTabs").addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-cat]");
    if (!btn) return;
    state.cat = btn.dataset.cat;
    this.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderGrid();
  });

  var searchInput = document.getElementById("searchInput");
  var debounce = null;
  searchInput.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.q = searchInput.value;
      renderGrid();
    }, 120);
  });

  document.getElementById("groupToggle").addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderGroupPanel();
  });
  document.getElementById("groupClose").addEventListener("click", function () {
    panel.hidden = true;
  });

  document.getElementById("groupCreateForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = document.getElementById("groupNameInput");
    if (createGroup(input.value)) {
      input.value = "";
      renderGroupPanel();
      refreshAllGroupChecks();
    }
  });

  /* 卡片背面 mini-tag 点击 → 设置标签筛选（直接绑定，见 buildCard） */
  function applyTagFilter(tag) {
    state.tag = tag;
    renderTagbar();
    renderGrid();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      document.querySelectorAll(".card.flipped").forEach(function (c) {
        c.classList.remove("flipped");
      });
      panel.hidden = true;
    }
  });

  /* ---------------- init ---------------- */

  updateGroupCount();
  renderTagbar();
  renderGrid();
})();
