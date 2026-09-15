/* 暗房 DARKROOM V2 — app.js 命名空间 / 全局状态 / 初始化 */
window.DR = (function () {
  "use strict";

  var DB = window.DARKROOM_DB || { meta: { media: [], darkroomAs: [] }, entries: [] };
  var byId = {};
  DB.entries.forEach(function (e) { byId[e.id] = e; });

  /* 全局筛选状态（打开/关闭详情不改变，保证返回时保持筛选） */
  var state = { media: "ALL", as: "ALL" };

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
    DR.sidebar.render();
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

  function init() {
    DR.filterbar.init();
    DR.sidebar.init();
    DR.wall.init();
    DR.split.init();
    DR.detail.init();
    render();
  }

  return {
    db: DB, state: state, byId: byId,
    filtered: filtered, countFor: countFor,
    setFilter: setFilter, render: render, init: init,
  };
})();
