/* 暗房 DARKROOM V2 — organize.js
   MODE 02「TAG / ORGANIZE」：八个小类目竖排导航 → 照片从中央散开 → SHUFFLE / ORGANIZE / DRAG
   三种交互状态：
     STATE 01 NORMAL   散落照片，可拖动 / SHUFFLE / ORGANIZE
     STATE 02 SELECTED 点击照片 → 平滑移至中央聚焦（放大片），其他照片虚化；
                       放大片可在整个展示区域内拖动，下方出现放大镜按钮
     STATE 03 MAGNIFY  点击放大镜 → 镜片跟随鼠标查看原图细节
   退出：点击展示区域空白处 MAGNIFY → SELECTED → NORMAL（无 X 按钮）
   与 MODE 01 照片墙平行共存，互不修改对方的数据与状态。 */
DR.organize = (function () {
  "use strict";
  var area, tagsEl, countEl, dEmpty, dBody, fab, fabMag;
  var MEDIA_ZH = {}, AS_ZH = {};

  /* 观看状态：唯一筛选条件 = 小类目（sub）。大章节只用于索引贴颜色与数据归类，不作筛选 */
  var activeTag = null;        // { group: "sub", key, label } —— 始终指向某一个小类目
  var organized = false;       // false = 散开 / true = 规则矩阵
  var seed = 1;                // SHUFFLE 种子：每次 +1 产生全新散布
  var selectedId = null;
  var zTop = 30;

  /* ---------- 稳定伪随机（同 wall：同 ID + 同种子 = 同位置） ---------- */
  function rnd(id, salt) {
    var h = 2166136261 ^ (salt + seed * 7919);
    var s = id + "|" + salt + "|" + seed;
    for (var i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
    }
    return h / 4294967295;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function aspectOf(e) {
    var d = e.images.length && e.images[0].dim;
    if (d && d.w && d.h) return d.w / d.h;
    return 0.8;
  }

  /* ---------- 标签匹配：唯一条件 = 小类目（activeSubcategory），绝不按大章节过滤 ---------- */
  function matches(e) {
    return activeTag ? e.exSub === activeTag.key : true;
  }
  function currentList() { return DR.db.entries.filter(matches); }

  /* ---------- 右侧索引贴导航：仅八个小类目（平面 index tabs，按章节分色，章节关系保留在数据层） ---------- */
  function subChapter(subKey) {
    var owner = null;
    (DR.chapters || []).forEach(function (c) {
      c.subs.forEach(function (s) { if (s.key === subKey) owner = c.key; });
    });
    return owner;
  }

  function renderTags() {
    tagsEl.innerHTML = "";
    var box = document.createElement("div");
    box.className = "tg-group";
    var activeCh = activeTag && activeTag.group === "sub" ? subChapter(activeTag.key) : null;
    (DR.chapters || []).forEach(function (c, ci, arr) {
      c.subs.forEach(function (s, si) {
        var b = document.createElement("button");
        b.type = "button";
        var on = activeTag && activeTag.group === "sub" && activeTag.key === s.key;
        b.className = "tab-" + c.key + (on ? " active" : "");
        if (activeCh && c.key !== activeCh) b.classList.add("dim");   /* 非当前章节压暗 */
        if (si === c.subs.length - 1 && ci < arr.length - 1) b.classList.add("chapter-end");
        var en = document.createElement("span");
        en.textContent = s.zh;                     /* 只显示小类目标题，无序号 / 无计数 */
        b.appendChild(en);
        b.addEventListener("click", function () {
          /* 直接进入该小类目：只显示这个小类目的照片（不存在章节混合视图）；
             已选中的小类目再点不取消——照片墙始终只对应一个小类目 */
          if (on) return;
          activeTag = { group: "sub", key: s.key, label: s.zh };
          renderTags();
          renderArea(true);
        });
        box.appendChild(b);
      });
    });
    tagsEl.appendChild(box);
  }

  /* ---------- 中央照片：构建 ---------- */
  function buildPin(e) {
    var pin = document.createElement("div");
    pin.className = "opin";
    pin.dataset.id = e.id;
    pin._aspect = aspectOf(e);

    var photo = document.createElement("div");
    photo.className = "photo" + (e.images.length ? "" : " pending");
    if (e.images.length) {
      var wrap = document.createElement("div");
      wrap.className = "imgwrap" + (DR.toneOf(e) ? " " + DR.toneOf(e) : "");
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      img.src = encodeURI(e.images[0].src);
      img.alt = e.id + " " + e.title;
      img.addEventListener("load", function () { wrap.classList.add("on"); });
      if (img.complete && img.naturalWidth > 0) wrap.classList.add("on");
      wrap.appendChild(img);
      photo.appendChild(wrap);
    } else {
      var ph = document.createElement("div");
      ph.className = "ph";
      var pid = document.createElement("span");
      pid.className = "pid";
      pid.textContent = e.id;
      var pt = document.createElement("span");
      pt.className = "pt";
      pt.textContent = "PENDING";
      ph.appendChild(pid);
      ph.appendChild(pt);
      photo.appendChild(ph);
    }
    var cap = document.createElement("div");
    cap.className = "cap";
    cap.textContent = e.id;
    var t = document.createElement("span");
    t.className = "t";
    t.textContent = e.title;
    cap.appendChild(t);
    photo.appendChild(cap);
    pin.appendChild(photo);

    enableDrag(pin, e);
    return pin;
  }

  /* ---------- 布局：散开 / 规则矩阵 ---------- */
  function layoutScatter(pins) {
    var W = area.clientWidth, H = area.clientHeight;
    var n = pins.length || 1;
    var scale = clamp(Math.sqrt(44 / n), 0.42, 1);   /* 照片越多单张越小 */
    pins.forEach(function (pin, i) {
      var e = DR.byId[pin.dataset.id];
      var w = (118 + rnd(e.id, 2) * 72) * scale;
      var pw = w * 1.18, ph = (w / pin._aspect) + w * 0.24;  /* 含相纸边框的近似外框 */
      var x = 6 + rnd(e.id, 5) * Math.max(8, W - pw - 12);
      var y = 6 + rnd(e.id, 6) * Math.max(8, H - ph - 12);
      var rot = (rnd(e.id, 7) - 0.5) * 13;
      pin.style.left = x + "px";
      pin.style.top = y + "px";
      pin.style.width = pw + "px";
      pin.style.transform = "rotate(" + rot.toFixed(2) + "deg)";
      pin.style.zIndex = 1 + Math.floor(rnd(e.id, 8) * 20);
    });
  }

  function layoutGrid(pins) {
    var W = area.clientWidth, H = area.clientHeight;
    var n = pins.length || 1;
    var cols = Math.max(1, Math.round(Math.sqrt(n * (W / Math.max(1, H)))));
    var rows = Math.ceil(n / cols);
    var cw = W / cols, ch = H / rows;
    pins.forEach(function (pin, i) {
      var col = i % cols, row = Math.floor(i / cols);
      var w = Math.min(cw * 0.8, ch * 0.8 * pin._aspect);
      var pw = w * 1.18, ph = (w / pin._aspect) + w * 0.24;
      pin.style.left = (col * cw + (cw - pw) / 2) + "px";
      pin.style.top = (row * ch + (ch - ph) / 2) + "px";
      pin.style.width = pw + "px";
      pin.style.transform = "rotate(0deg)";
      pin.style.zIndex = i + 1;
    });
  }

  function applyLayout() {
    if (selectedId) { focusSelected(); return; }   /* 聚焦状态下窗口变化：保持居中 */
    var pins = Array.prototype.slice.call(area.querySelectorAll(".opin"));
    if (organized) layoutGrid(pins); else layoutScatter(pins);
  }

  /* ---------- 渲染中央区域 ---------- */
  function renderArea(rebuild) {
    clearSelection();                               /* 重排 = 回到 STATE 01 */
    var list = currentList();
    countEl.innerHTML = "<b>" + list.length + "</b> / " + DR.db.entries.length +
      (activeTag ? " · " + activeTag.label : "");
    area.innerHTML = "";
    area.appendChild(fab);                          /* 浮动按钮保持在区域内 */
    fab.hidden = true;
    if (!list.length) {
      var p = document.createElement("p");
      p.className = "org-empty";
      p.textContent = "NO ENTRIES / 没有匹配的词条";
      area.appendChild(p);
      return;
    }
    var frag = document.createDocumentFragment();
    list.forEach(function (e) { frag.appendChild(buildPin(e)); });
    area.appendChild(frag);
    /* 入场：先无过渡落位，再从中央聚集状态向外散开（轻微错位 + 延迟，克制不弹跳） */
    area.classList.add("no-anim");
    applyLayout();
    var pins = Array.prototype.slice.call(area.querySelectorAll(".opin"));
    var cW = area.clientWidth, cH = area.clientHeight;
    pins.forEach(function (pin) {
      var cx = parseFloat(pin.style.left) + pin.offsetWidth / 2;
      var cy = parseFloat(pin.style.top) + pin.offsetHeight / 2;
      var dx = cW / 2 - cx, dy = cH / 2 - cy;
      pin._finalTf = pin.style.transform || "";
      pin.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px) " + pin._finalTf + " scale(0.9)";
      pin.style.opacity = "0";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        area.classList.remove("no-anim");
        pins.forEach(function (pin, i) {
          var d = i * 11 + rnd(pin.dataset.id, 21) * 90;   /* 层次化延迟：有序但不机械 */
          pin.style.transitionDelay = d.toFixed(0) + "ms";
          pin.style.transform = "translate(0px, 0px) " + pin._finalTf + " scale(1)";
          pin.style.opacity = "";
        });
        setTimeout(function () {
          pins.forEach(function (pin) {
            pin.style.transitionDelay = "";
            if (!pin.classList.contains("selected") && !pin.classList.contains("dragging")) {
              pin.style.transform = pin._finalTf;      /* 还原为布局原始 transform */
            }
          });
        }, pins.length * 11 + 720);
      });
    });
  }

  /* ---------- 拖动（放大镜状态下不拖动；选中的放大片可在整个展示区域内拖动） ---------- */
  /* 拖动结束后光标可能停在元素外（钳制在边界），浏览器会对光标下的元素补发 click——
     这个「惯性 click」不能算作退出单击，用 suppressClick 吞掉 */
  var suppressClick = false;
  function swallowNextClick() {
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 350);
  }
  function enableDrag(pin, e) {
    var sx, sy, ox, oy, moved, skipClick;
    pin.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      var isSel = pin.classList.contains("selected");
      /* 有当前照片时：背景虚化照片是完全的背景——不可点击、不可拖动、不发生任何事 */
      var blocked = area.classList.contains("has-selection") && !isSel;
      skipClick = mag.active || isSel || blocked;
      if (mag.active) return;                       /* 放大镜激活时鼠标只控制镜片 */
      if (blocked) return;
      sx = ev.clientX; sy = ev.clientY;
      ox = parseFloat(pin.style.left) || 0;
      oy = parseFloat(pin.style.top) || 0;
      moved = false;
      try { pin.setPointerCapture(ev.pointerId); } catch (err) {}
      pin.classList.add("dragging");
      pin.style.zIndex = ++zTop;                    /* 拖动时置于最上 */
    });
    pin.addEventListener("pointermove", function (ev) {
      if (!pin.classList.contains("dragging")) return;
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      var W = area.clientWidth, H = area.clientHeight;
      var pw = pin.offsetWidth, ph = pin.offsetHeight;
      if (pin.classList.contains("selected")) {
        /* 放大片：覆盖整个照片展示区域，不出边界（不进入详情 / 标签区域） */
        pin.style.left = clamp(ox + dx, 0, Math.max(0, W - pw)) + "px";
        pin.style.top = clamp(oy + dy, 0, Math.max(0, H - ph)) + "px";
        positionFab(pin);                           /* 浮动按钮跟随放大片 */
      } else {
        pin.style.left = clamp(ox + dx, -pw * 0.3, W - pw * 0.7) + "px";
        pin.style.top = clamp(oy + dy, -ph * 0.3, H - ph * 0.7) + "px";
      }
    });
    pin.addEventListener("pointerup", function (ev) {
      pin.classList.remove("dragging");
      try { pin.releasePointerCapture(ev.pointerId); } catch (err) {}
      if (moved) swallowNextClick();                /* 拖动后的惯性 click 不视为退出单击 */
      if (!moved && !skipClick) select(e.id);       /* 未移动 = 点击选中（点击放大片本身不退出） */
      skipClick = false;
    });
    pin.addEventListener("pointercancel", function () {
      pin.classList.remove("dragging");
    });
  }

  /* ---------- STATE 02：选中 → 平滑移至中央聚焦，其他照片虚化（放大片可再拖动） ---------- */
  function positionFab(pin) {
    var H = area.clientHeight;
    var left = parseFloat(pin.style.left) || 0, top = parseFloat(pin.style.top) || 0;
    fab.style.left = left + pin.offsetWidth / 2 + "px";
    fab.style.top = Math.min(H - 46, top + pin.offsetHeight + 12) + "px";
  }

  function focusSelected() {
    var pin = selectedId && area.querySelector('.opin[data-id="' + selectedId + '"]');
    if (!pin) return;
    var W = area.clientWidth, H = area.clientHeight;
    var pw = pin.offsetWidth, ph = pin.offsetHeight;
    pin.style.left = Math.max(4, (W - pw) / 2) + "px";
    pin.style.top = Math.max(4, (H - ph) / 2 - 10) + "px";   /* 略偏上，给下方放大镜按钮留位 */
    pin.style.transform = "rotate(0deg)";
    positionFab(pin);                            /* 浮动按钮随照片定位 */
  }

  function select(id) {
    if (mag.active) return;
    var oldPin = selectedId && area.querySelector('.opin[data-id="' + selectedId + '"]');
    if (oldPin && selectedId !== id && oldPin._home) {
      restoreHome(oldPin);                          /* 上一张回到原位 */
    }
    selectedId = id;
    var pin = area.querySelector('.opin[data-id="' + id + '"]');
    if (pin && !pin._home) {
      pin._home = { left: pin.style.left, top: pin.style.top,
                    transform: pin.style.transform, zIndex: pin.style.zIndex };
    }
    markSelected();
    area.classList.add("has-selection");
    fab.hidden = false;
    fillDetails(id);
    focusSelected();
  }

  function restoreHome(pin) {
    pin.style.left = pin._home.left;
    pin.style.top = pin._home.top;
    pin.style.transform = pin._home.transform;
    pin.style.zIndex = pin._home.zIndex;
    pin._home = null;
  }

  function clearSelection() {
    deactivateMagnifier();
    var pin = selectedId && area && area.querySelector('.opin[data-id="' + selectedId + '"]');
    if (pin && pin._home) restoreHome(pin);
    selectedId = null;
    if (area) {
      area.classList.remove("has-selection");
      area.querySelectorAll(".opin.selected").forEach(function (p) { p.classList.remove("selected"); });
    }
    if (fab) fab.hidden = true;
    fillDetails(null);
  }

  /* ---------- 选中标记 + 左侧 DETAILS ---------- */
  function markSelected() {
    area.querySelectorAll(".opin").forEach(function (p) {
      p.classList.toggle("selected", p.dataset.id === selectedId);
    });
  }

  function catText(map, key) { return key + " · " + (map[key] || ""); }

  function fillDetails(id) {
    var e = id ? DR.byId[id] : null;
    dEmpty.hidden = !!e;
    dBody.hidden = !e;
    if (!e) return;

    function setField(name, value) {
      var dd = dBody.querySelector('[data-f="' + name + '"]');
      dd.textContent = value || "—";
      dd.classList.toggle("dim", !value);
    }
    setField("id", e.id);
    setField("title", e.title);
    setField("source", e.source);
    setField("year", e.year);

    /* TAGS：章节 → 小结构 → MEDIA / DARKROOM AS → # 自由标签 */
    var tagDD = dBody.querySelector('[data-f="tags"]');
    tagDD.innerHTML = "";
    tagDD.classList.remove("dim");
    var tagCount = 0;
    function addTag(text, cls) {
      var s = document.createElement("span");
      s.className = cls || "tag";
      s.textContent = text;
      tagDD.appendChild(s);
      tagCount++;
    }
    if (e.exChapterInfo) addTag(e.exChapterInfo.no + " · " + e.exChapterInfo.zh, "tag cat");
    if (e.exSubInfo) addTag(e.exSubInfo.no + "｜" + e.exSubInfo.zh, "tag cat");
    if (e.media) addTag(catText(MEDIA_ZH, e.media), "tag cat");
    if (e.darkroomAs) addTag(catText(AS_ZH, e.darkroomAs), "tag cat");
    (e.tags || []).forEach(function (t) { addTag("#" + t); });
    if (!tagCount) { tagDD.textContent = "—"; tagDD.classList.add("dim"); }
    setField("description", e.description);
  }

  /* ---------- STATE 03：放大片（圆形镜片，DOM 父级 = #orgArea，可在整个右侧照片墙内自由拖动） ---------- */
  var mag = { active: false, lens: null };
  var LENS_D = 176;      /* 镜片直径 */
  var ZOOM = 3;          /* 放大倍数：足以看清颗粒 / 笔触细节 */

  /* + / − 状态切换图标：关闭 = 圆圈+，开启 = 圆圈− */
  function setFabIcon() {
    var on = mag.active;
    fabMag.classList.toggle("on", on);
    fabMag.title = on ? "关闭放大片" : "打开放大片 · 查看照片细节";
    fabMag.setAttribute("aria-label", on ? "关闭放大片" : "打开放大片");
    fabMag.innerHTML =
      '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">' +
      '<circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
      '<line x1="6" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.3"/>' +
      (on ? "" : '<line x1="10" y1="6" x2="10" y2="14" stroke="currentColor" stroke-width="1.3"/>') +
      "</svg>";
  }

  /* 镜片内容：以镜片中心相对当前照片的位置取样；镜片移出照片 = 空镜片 */
  function updateLensContent() {
    var lens = mag.lens;
    if (!lens) return;
    var pin = selectedId && area.querySelector('.opin[data-id="' + selectedId + '"]');
    var wrap = pin && pin.querySelector(".imgwrap");
    if (!wrap) return;
    var r = wrap.getBoundingClientRect();
    var ar = area.getBoundingClientRect();
    var LD = lens.offsetWidth || LENS_D, R = LD / 2;
    var cx = (parseFloat(lens.style.left) || 0) + R;
    var cy = (parseFloat(lens.style.top) || 0) + R;
    var px = cx - (r.left - ar.left);
    var py = cy - (r.top - ar.top);
    if (px < 0 || py < 0 || px > r.width || py > r.height) {
      lens.classList.add("lens-void");
      return;
    }
    lens.classList.remove("lens-void");
    lens.style.backgroundSize = (r.width * ZOOM) + "px " + (r.height * ZOOM) + "px";
    lens.style.backgroundPosition = (-(px * ZOOM - R)) + "px " + (-(py * ZOOM - R)) + "px";
  }

  function activateMagnifier() {
    var e = selectedId && DR.byId[selectedId];
    if (!e || !e.images.length) return;
    var pin = area.querySelector('.opin[data-id="' + selectedId + '"]');
    if (!pin) return;

    pin.classList.add("magnifying");
    mag.active = true;

    var lens = document.createElement("div");
    lens.className = "lens lens-void";
    lens.style.backgroundImage = 'url("' + encodeURI(e.images[0].src) + '")';
    area.appendChild(lens);                 /* 父级 = 照片墙 container，不受照片 clipping / bounds 限制 */
    mag.lens = lens;

    /* 初始位置：当前照片中心 */
    var LD = lens.offsetWidth || LENS_D;
    var pl = parseFloat(pin.style.left) || 0, pt = parseFloat(pin.style.top) || 0;
    lens.style.left = Math.max(0, pl + pin.offsetWidth / 2 - LD / 2) + "px";
    lens.style.top = Math.max(0, pt + pin.offsetHeight / 2 - LD / 2) + "px";
    updateLensContent();

    /* 拖动：bounds = 整个 #orgArea（area.clientWidth/Height），与照片位置无关 */
    lens.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      var sx = ev.clientX, sy = ev.clientY;
      var ox = parseFloat(lens.style.left) || 0, oy = parseFloat(lens.style.top) || 0;
      var moved = false;
      lens.classList.add("dragging");
      function mv(ev2) {
        var dx = ev2.clientX - sx, dy = ev2.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        var W = area.clientWidth, H = area.clientHeight;
        var w = lens.offsetWidth, h = lens.offsetHeight;
        lens.style.left = clamp(ox + dx, 0, Math.max(0, W - w)) + "px";
        lens.style.top = clamp(oy + dy, 0, Math.max(0, H - h)) + "px";
        updateLensContent();
      }
      function up() {
        lens.classList.remove("dragging");
        if (moved) swallowNextClick();              /* 拖到边界后光标在镜片外，惯性 click 不退出 */
        document.removeEventListener("pointermove", mv);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
      }
      /* 挂在 document：无论指针捕获是否生效、光标是否甩出镜片，移动事件都不会丢 */
      document.addEventListener("pointermove", mv);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
    lens.addEventListener("click", function (ev) { ev.stopPropagation(); });   /* 点击镜片不退出 */

    setFabIcon();
  }

  function deactivateMagnifier() {
    if (!mag.active) return;
    if (mag.lens && mag.lens.parentNode) mag.lens.parentNode.removeChild(mag.lens);
    var pin = area && area.querySelector(".opin.magnifying");
    if (pin) pin.classList.remove("magnifying");
    mag.active = false;
    mag.lens = null;
    setFabIcon();
  }

  /* ---------- 对外 ---------- */
  function render() {
    /* 进入板块：默认激活第一个小类目（实验 · 感光）——绝不出现全部照片混合的散落状态 */
    if (!activeTag) {
      var c0 = (DR.chapters || [])[0];
      if (c0 && c0.subs && c0.subs[0]) {
        activeTag = { group: "sub", key: c0.subs[0].key, label: c0.subs[0].zh };
      }
    }
    renderTags();
    renderArea(true);
  }

  function leave() {
    clearSelection();
  }

  var resizeTimer = null;
  function init() {
    area = document.getElementById("orgArea");
    tagsEl = document.getElementById("orgTags");
    countEl = document.getElementById("orgCount");
    dEmpty = document.getElementById("orgDEmpty");
    dBody = document.getElementById("orgDBody");
    DR.db.meta.media.forEach(function (c) { MEDIA_ZH[c.key] = c.zh; });
    DR.db.meta.darkroomAs.forEach(function (c) { AS_ZH[c.key] = c.zh; });

    /* 聚焦照片下方的浮动操作：放大片开关（随照片定位，+ / − 状态图标） */
    fab = document.createElement("div");
    fab.className = "org-fab";
    fab.hidden = true;
    fabMag = document.createElement("button");
    fabMag.type = "button";
    fab.appendChild(fabMag);
    setFabIcon();                                        /* 初始 = 圆圈 + */
    fabMag.addEventListener("click", function (ev) {
      ev.stopPropagation();                              /* 只切换放大片，绝不触发退出 */
      if (mag.active) deactivateMagnifier(); else activateMagnifier();
    });
    area.appendChild(fab);

    document.getElementById("orgShuffle").addEventListener("click", function () {
      organized = false;
      document.getElementById("orgOrganize").setAttribute("aria-pressed", "false");
      document.getElementById("orgOrganize").classList.remove("on");
      seed++;                                   /* 全新随机位置 / 角度 / 层级 */
      clearSelection();
      applyLayout();
    });
    var orgBtn = document.getElementById("orgOrganize");
    orgBtn.addEventListener("click", function () {
      organized = !organized;
      orgBtn.setAttribute("aria-pressed", String(organized));
      orgBtn.classList.toggle("on", organized);
      clearSelection();
      applyLayout();
    });
    /* 左侧即详情区域：本页不再提供 FULL DETAIL 按钮，也不调用旧详情卡片 */
    /* 退出规则（排除法）：除了「当前选中照片」和「放大片（镜片）」，右侧任何位置单击都退出——
       包括空白、虚化照片、照片间隙、区域边缘；点击虚化照片只退出，绝不切换选中 */
    area.addEventListener("click", function (ev) {
      if (suppressClick) { suppressClick = false; return; }   /* 拖动结束后的惯性 click 不算单击 */
      if (!selectedId) return;
      var pin = area.querySelector('.opin[data-id="' + selectedId + '"]');
      if (pin && pin.contains(ev.target)) return;           /* ① 当前照片不退出 */
      if (mag.lens && mag.lens.contains(ev.target)) return; /* ② 放大片不退出（+ / − 按钮已 stopPropagation） */
      clearSelection();                                     /* 其他一切位置：退出（内部同时关闭放大片） */
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      if (mag.active) deactivateMagnifier();        /* MAGNIFY → SELECTED */
      else if (selectedId) clearSelection();        /* SELECTED → NORMAL */
    });
    window.addEventListener("resize", function () {
      if (DR.state.mode !== "organize") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyLayout, 180);
    });
    /* 竖排标签栏：纵向滚轮 → 横向滚动 */
    tagsEl.addEventListener("wheel", function (ev) {
      if (tagsEl.scrollWidth <= tagsEl.clientWidth) return;
      ev.preventDefault();
      tagsEl.scrollLeft += ev.deltaY;
    }, { passive: false });
  }

  return { init: init, render: render, leave: leave };
})();
