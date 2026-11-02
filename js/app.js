/* 暗房 DARKROOM V2 — app.js 命名空间 / 全局状态 / 初始化 */
window.DR = (function () {
  "use strict";

  var DB = window.DARKROOM_DB || { meta: { media: [], darkroomAs: [] }, entries: [] };
  var byId = {};
  DB.entries.forEach(function (e) { byId[e.id] = e; });

  /* 三大章节 × 八个小结构（chapters.js）：启动时注入每条词条 */
  var CH = window.DR_CHAPTERS || [];
  var SUB_MAP = window.DR_SUB_MAP || {};
  var chapterByKey = {}, subByKey = {};
  CH.forEach(function (c) {
    chapterByKey[c.key] = c;
    c.subs.forEach(function (s) { subByKey[s.key] = s; s.chapter = c.key; });
  });
  DB.entries.forEach(function (e) {
    var sk = SUB_MAP[e.id];
    e.exSub = sk || null;                          /* 小结构 key，如 "bw-1" */
    e.exSubInfo = sk ? subByKey[sk] : null;        /* { key, no, zh } */
    e.exChapter = sk ? subByKey[sk].chapter : null;/* 章节 key：bw / cn / rv */
    e.exChapterInfo = sk ? chapterByKey[e.exChapter] : null;
  });
  /* 章节即胶片工艺 → 照片色调：黑白负片反色 / 彩色负片反色 / 反转片原彩 */
  function toneOf(e) { return e.exChapter ? "tone-" + e.exChapter : ""; }

  /* 全局筛选状态（打开/关闭详情不改变，保证返回时保持筛选）
     mode：wall = 照片墙 / organize = TAG·ORGANIZE，两种平行观看方式 */
  var state = { media: "ALL", as: "ALL", mode: "wall" };

  function filtered() {
    return DB.entries.filter(function (e) {
      if (state.media !== "ALL" && e.media !== state.media) return false;
      if (state.as !== "ALL" && e.darkroomAs !== state.as) return false;
      return true;
    });
  }

  /* 交叉计数：media 计数尊重 as 筛选，反之亦然 */
  function countFor(axis, key) {
    return DB.entries.filter(function (e) {
      var v = axis === "media" ? e.media : e.darkroomAs;
      var other = axis === "media" ? state.as : state.media;
      var ev = axis === "media" ? e.darkroomAs : e.media;
      if (other !== "ALL" && ev !== other) return false;
      if (key === "ALL") return true;
      return v === key;
    }).length;
  }

  function render() {
    DR.filterbar.render();
    DR.wall.render();
    if (DR.split) DR.split.render(); /* 二分模式：右侧 LIGHT 同步筛选结果 */
    var n = filtered().length;
    document.getElementById("counter").innerHTML =
      "<b>" + n + "</b> / " + DB.entries.length + " ENTRIES";
  }

  function setFilter(axis, key) {
    state[axis] = key;
    render();
    window.scrollTo(0, 0);
  }

  /* 观看模式切换：PHOTO WALL / ORGANIZE / SPATIAL，不重新加载页面 */
  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    var isWall = mode === "wall";
    var isOrg = mode === "organize";
    var isSpatial = mode === "spatial";
    document.body.classList.toggle("mode-organize", isOrg);
    document.body.classList.toggle("mode-spatial", isSpatial);
    [
      ["modeWall", isWall],
      ["modeOrganize", isOrg],
      ["modeSpatial", isSpatial]
    ].forEach(function (item) {
      var button = document.getElementById(item[0]);
      button.classList.toggle("active", item[1]);
      button.setAttribute("aria-selected", String(item[1]));
    });
    document.getElementById("layout").hidden = !isWall;
    document.getElementById("organize").hidden = !isOrg;
    document.getElementById("spatial").hidden = !isSpatial;
    if (!isWall && DR.split && DR.split.active()) document.getElementById("safelightBtn").click();
    if (!isSpatial && DR.spatial) { DR.spatial.leave(); DR.navList = null; }
    if (isSpatial) {
      DR.organize.leave();
      DR.spatial.enter(); /* 每次进入空间导航首先显示三栋楼总览 */
    } else if (isOrg) {
      DR.organize.render();
    } else {
      DR.organize.leave();
      render(); /* 回到照片墙：恢复墙面与计数 */
    }
    window.scrollTo(0, 0);
  }

  function init() {
    DR.filterbar.init();
    DR.wall.init();
    DR.split.init();
    DR.detail.init();
    DR.organize.init();
    DR.spatial.init();
    document.getElementById("modeWall").addEventListener("click", function () { setMode("wall"); });
    document.getElementById("modeOrganize").addEventListener("click", function () { setMode("organize"); });
    document.getElementById("modeSpatial").addEventListener("click", function () { setMode("spatial"); });
    render();
  }

  return {
    db: DB, state: state, byId: byId,
    chapters: CH, chapterByKey: chapterByKey, subByKey: subByKey,
    toneOf: toneOf,
    filtered: filtered, countFor: countFor,
    setFilter: setFilter, setMode: setMode, render: render, init: init,
  };
})();
