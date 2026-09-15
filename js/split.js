/* 暗房 DARKROOM V2.2 — split.js
   SAFELIGHT 二分浏览：左侧 DARKROOM 红黑照片墙 = INDEX，
   右侧 LIGHT 原彩内容 = CONTENT，DEVELOPMENT 滑杆控制显影程度。
   左右通过作品 ID 实时对应；二分模式中点击左墙不再打开详情卡片，
   而是联动右侧滚动定位与高亮。 */
DR.split = (function () {
  "use strict";
  var on = false;
  var currentId = null;
  var dev = 50;
  var btn, light, grid, slider, devVal;
  var MEDIA_ZH = {}, AS_ZH = {};

  /* DEVELOPMENT 四个关键节点的空间锚点：
     [slider值, 单元格基准宽px, 展框内留白%] —— 之间线性连续过渡 */
  var ANCHORS = [
    [10, 64, 22],   /* MINIMAL：小图 + 大展柜留白，一行最多 */
    [30, 80, 14],   /* RECOGNITION：图变大 + 编号 */
    [50, 170, 7],   /* TITLE：中图 + 编号 + 词条名 */
    [100, 440, 3.5] /* FULL：大图 + 全部信息，一行最少 */
  ];

  function interp(v) {
    if (v <= ANCHORS[0][0]) return ANCHORS[0].slice(1);
    for (var i = 0; i < ANCHORS.length - 1; i++) {
      var a = ANCHORS[i], b = ANCHORS[i + 1];
      if (v <= b[0]) {
        var t = (v - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      }
    }
    return ANCHORS[ANCHORS.length - 1].slice(1);
  }

  /* 信息显示档位：minimal < 25 < recognition < 45 < title < 75 <= full */
  function bandOf(v) {
    if (v < 25) return "minimal";
    if (v < 45) return "recognition";
    if (v < 75) return "title";
    return "full";
  }

  function applyDev() {
    var c = interp(dev);
    grid.style.setProperty("--cell", c[0].toFixed(0) + "px");
    grid.style.setProperty("--pad", c[1].toFixed(1) + "%");
    grid.dataset.band = bandOf(dev);
    devVal.textContent = dev + "%";
    /* DEVELOPMENT 改变 → grid 列数 / 图片尺寸 / 信息量变化 → 原 scrollTop 失效。
       不信 scrollTop：以 selectedId 为锚点，布局重算后重新定位（即时，避免连续拖动时乱跳），
       高亮状态不被动摇。 */
    if (currentId) {
      cancelScroll();
      var cell = cellById(currentId);
      if (cell) grid.scrollTop = targetScrollTop(cell);
      markRight();
      armAnchor(2500);
    }
  }

  function metaLine(k, v) {
    var d = document.createElement("div");
    d.className = "l-line";
    var key = document.createElement("span");
    key.className = "k";
    key.textContent = k;
    d.appendChild(key);
    d.appendChild(document.createTextNode(v || "—"));
    return d;
  }

  function buildCell(e) {
    var fig = document.createElement("figure");
    fig.className = "lcell";
    fig.dataset.lid = e.id;

    /* 展框：图片居中，四周留白随 DEVELOPMENT 降低而增多 */
    var frame = document.createElement("div");
    frame.className = "lframe";
    if (e.images.length) {
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = encodeURI(e.images[0].src);
      img.alt = e.id + " " + e.title;
      frame.appendChild(img);
    } else {
      var ph = document.createElement("div");
      ph.className = "lph";
      ph.textContent = e.id;
      frame.appendChild(ph);
    }
    fig.appendChild(frame);

    /* 图下信息：编号 → 词条 → 完整 metadata（随档位逐级出现） */
    var cap = document.createElement("figcaption");

    var idEl = document.createElement("div");
    idEl.className = "l-id";
    idEl.textContent = e.id;
    cap.appendChild(idEl);

    var titleEl = document.createElement("div");
    titleEl.className = "l-title";
    titleEl.textContent = e.title || "—";
    cap.appendChild(titleEl);

    var meta = document.createElement("div");
    meta.className = "l-meta";
    meta.appendChild(metaLine("SOURCE / 出处", e.source));
    meta.appendChild(metaLine("YEAR / 年代", e.year));
    var tags = [];
    if (e.media) tags.push(e.media + " · " + (MEDIA_ZH[e.media] || ""));
    if (e.darkroomAs) tags.push(e.darkroomAs + " · " + (AS_ZH[e.darkroomAs] || ""));
    (e.tags || []).forEach(function (t) { tags.push("#" + t); });
    meta.appendChild(metaLine("TAGS / 标签", tags.join("　") || "—"));
    meta.appendChild(metaLine("DESCRIPTION / 备注", e.description));
    cap.appendChild(meta);

    fig.appendChild(cap);
    fig.addEventListener("click", function () { select(e.id); });
    return fig;
  }

  /* ---------------- 滚动定位：selectedId 是唯一锚点 ---------------- */

  var scrollAnim = null;
  var anchorUntil = 0;   /* 程序化定位后的短暂窗口：晚到的布局漂移会被拉回锚点 */
  var reanchorTimer = null;

  function armAnchor(ms) { anchorUntil = performance.now() + (ms || 2500); }

  /* 图片 / 字体晚加载导致 grid 布局漂移时，把当前选中项拉回视口。
     仅在定位窗口内生效，用户手动滚走后不会被拽回。 */
  function scheduleReanchor() {
    if (!on || !currentId) return;
    if (performance.now() > anchorUntil) return;
    clearTimeout(reanchorTimer);
    reanchorTimer = setTimeout(function () {
      if (scrollAnim || !currentId) return;
      var cell = cellById(currentId);
      if (!cell) return;
      var cr = cell.getBoundingClientRect(), gr = grid.getBoundingClientRect();
      var inView = cr.top >= gr.top - 2 && cr.bottom <= gr.bottom + 2;
      if (!inView) grid.scrollTop = targetScrollTop(cell);
    }, 250);
  }

  function cellById(id) {
    return grid.querySelector('.lcell[data-lid="' + id + '"]');
  }

  function cancelScroll() {
    if (scrollAnim) { clearTimeout(scrollAnim); scrollAnim = null; }
    if (scrollWatchdog) { clearTimeout(scrollWatchdog); scrollWatchdog = null; }
  }

  /* 目标滚动位：词条落在视口垂直方向约 40% 处（居中偏上）；
     单元比视口还高时（100% 大图）改为顶部对齐，保证从完整图框顶部开始看 */
  function targetScrollTop(cell) {
    var cellTop = cell.getBoundingClientRect().top - grid.getBoundingClientRect().top + grid.scrollTop;
    var cellH = cell.offsetHeight;
    var viewH = grid.clientHeight;
    var t = cellH >= viewH * 0.9
      ? cellTop - 24
      : cellTop - (viewH - cellH) * 0.4;
    var max = Math.max(0, grid.scrollHeight - viewH);
    return Math.max(0, Math.min(max, t));
  }

  /* 自实现平滑滚动（easeOutCubic）。
     用 setTimeout(16ms) 而非 rAF 驱动：内嵌预览面板会冻结 rAF（实测 500ms 仅 2 帧），
     定时器则正常；完成回调用于「到位后再上白底高亮」。
     另设看门狗兜底，极端环境保证最终到位。 */
  var scrollWatchdog = null;

  function smoothTo(target, done) {
    cancelScroll();
    var start = grid.scrollTop;
    var delta = target - start;
    if (Math.abs(delta) < 2) { if (done) done(); return; }
    var dur = Math.min(720, 260 + Math.abs(delta) * 0.1);
    var t0 = performance.now();
    function finish() {
      scrollAnim = null;
      if (scrollWatchdog) { clearTimeout(scrollWatchdog); scrollWatchdog = null; }
      grid.scrollTop = target;
      if (done) done();
    }
    function step() {
      var p = Math.min(1, (performance.now() - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      grid.scrollTop = start + delta * e;
      if (p < 1) { scrollAnim = setTimeout(step, 16); }
      else { finish(); }
    }
    scrollAnim = setTimeout(step, 16);
    scrollWatchdog = setTimeout(finish, dur + 600);
  }

  function markLeft() {
    var oldPin = document.querySelector("#wall .pin.current");
    if (oldPin) oldPin.classList.remove("current");
    if (!currentId) return;
    var pin = document.querySelector('#wall .pin[data-id="' + currentId + '"]');
    if (pin) pin.classList.add("current");
  }

  function markRight() {
    var oldCell = grid.querySelector(".lcell.current");
    if (oldCell) oldCell.classList.remove("current");
    if (!currentId) return;
    var cell = cellById(currentId);
    if (cell) cell.classList.add("current");
  }

  function markCurrent() {
    markLeft();
    markRight();
  }

  /* 左墙重排（筛选 / resize / 开关切换）后重新挂回选中高亮 */
  function afterWallRender() {
    if (on && currentId) markCurrent();
  }

  function render() {
    if (!on) return;
    cancelScroll();
    var list = DR.filtered();
    grid.innerHTML = "";
    if (!list.length) {
      var p = document.createElement("p");
      p.className = "light-empty";
      p.textContent = "NO ENTRIES / 没有匹配的词条";
      grid.appendChild(p);
    } else {
      var frag = document.createDocumentFragment();
      list.forEach(function (e) { frag.appendChild(buildCell(e)); });
      grid.appendChild(frag);
    }
    /* 当前选中项若仍在筛选结果内则保留，否则清除 */
    var stillThere = false;
    for (var i = 0; i < list.length; i++) if (list[i].id === currentId) { stillThere = true; break; }
    if (!stillThere) currentId = null;
    markCurrent();
    applyDev();
  }

  /* 左侧选择 → 右侧平滑滚动定位
     LEFT 立即 selected；RIGHT 若在视口内则直接高亮，
     否则平滑滑动到「居中偏上」位置，到位后再上白底高亮（显影到位感，避免滚动中闪烁） */
  function select(id) {
    currentId = id;
    markLeft();
    var cell = cellById(id);
    if (!cell) { markRight(); return; }
    var cr = cell.getBoundingClientRect();
    var gr = grid.getBoundingClientRect();
    var inView = cr.top >= gr.top + 8 && cr.bottom <= gr.bottom - 8;
    if (inView) {
      cancelScroll();
      markRight();
      armAnchor(1200);
    } else {
      var oldCell = grid.querySelector(".lcell.current");
      if (oldCell) oldCell.classList.remove("current"); /* 滚动过程中先不亮新框 */
      armAnchor(2500);
      smoothTo(targetScrollTop(cell), function () {
        if (currentId === id) { markRight(); armAnchor(1200); }
      });
    }
    /* 左墙反向定位（即时，不打断右侧主动画） */
    var pin = document.querySelector('#wall .pin[data-id="' + id + '"]');
    if (pin && pin.scrollIntoView) {
      pin.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }

  function syncTopH() {
    var tb = document.getElementById("topbar");
    if (tb) {
      document.documentElement.style.setProperty("--topbar-h", tb.offsetHeight + "px");
    }
  }

  function toggle() {
    on = !on;
    document.body.classList.toggle("split", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.querySelector(".dot").textContent = on ? "●" : "○";
    if (on) {
      syncTopH();
      render();
    } else {
      currentId = null;
    }
    /* 布局宽度变化后让照片墙按新宽度重排 */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { DR.wall.render(); });
    });
  }

  function init() {
    btn = document.getElementById("safelightBtn");
    light = document.getElementById("light");
    grid = document.getElementById("lightGrid");
    slider = document.getElementById("devSlider");
    devVal = document.getElementById("devVal");
    DR.db.meta.media.forEach(function (c) { MEDIA_ZH[c.key] = c.zh; });
    DR.db.meta.darkroomAs.forEach(function (c) { AS_ZH[c.key] = c.zh; });
    btn.addEventListener("click", toggle);
    slider.addEventListener("input", function () {
      dev = +slider.value;
      applyDev();
    });
    window.addEventListener("resize", function () { if (on) { syncTopH(); scheduleReanchor(); } });
    /* 晚加载的图片 / 字体可能撑变 grid 布局：捕获阶段监听 img load，漂移时重锚 */
    grid.addEventListener("load", function (ev) {
      if (ev.target && ev.target.tagName === "IMG") scheduleReanchor();
    }, true);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { scheduleReanchor(); });
    }
  }

  return {
    init: init, render: render, select: select, toggle: toggle,
    afterWallRender: afterWallRender,
    active: function () { return on; }
  };
})();
