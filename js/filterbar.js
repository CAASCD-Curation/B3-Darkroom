/* 暗房 DARKROOM V2 — filterbar.js
   MEDIA 顶部导航已按需求移除：本模块的 UI 渲染在元素不存在时自动跳过，
   但 media 筛选逻辑（DR.state.media / countFor / setFilter）与
   顶栏高度同步（侧边栏 sticky 依赖）继续保留。 */
DR.filterbar = (function () {
  "use strict";
  var catsEl, resetEl;

  /* 长英文自动缩字号：保证完整显示，不截断、不滚动 */
  function fitText() {
    if (!catsEl) return;
    catsEl.querySelectorAll("button").forEach(function (b) {
      [".e", ".z"].forEach(function (sel) {
        var el = b.querySelector(sel);
        el.style.fontSize = "";
        var fs = parseFloat(getComputedStyle(el).fontSize);
        var maxW = b.clientWidth - 10;
        var guard = 24;
        while (el.scrollWidth > maxW && fs > 5 && guard--) {
          fs -= 0.5;
          el.style.fontSize = fs + "px";
        }
      });
    });
  }

  function render() {
    if (!catsEl) return; /* MEDIA 行已移除：不渲染导航，状态逻辑不受影响 */
    catsEl.innerHTML = "";
    DR.db.meta.media.forEach(function (cat) {
      var n = DR.countFor("media", cat.key);
      var b = document.createElement("button");
      b.type = "button";
      b.className = DR.state.media === cat.key ? "active" : "";
      var z = document.createElement("span");
      z.className = "z";
      z.textContent = cat.zh || cat.en;
      var s = document.createElement("span");
      s.className = "n";
      s.textContent = n;
      z.appendChild(s);
      var en = document.createElement("span");
      en.className = "e";
      en.textContent = cat.en;
      b.appendChild(z);
      b.appendChild(en);
      b.addEventListener("click", function () {
        DR.setFilter("media", DR.state.media === cat.key ? "ALL" : cat.key);
      });
      catsEl.appendChild(b);
    });
    resetEl.hidden = DR.state.media === "ALL";
    requestAnimationFrame(fitText);
  }

  function init() {
    catsEl = document.getElementById("mediaCats");
    resetEl = document.getElementById("mediaReset");
    /* 顶栏高度变化时同步侧边栏吸附位置（无论 MEDIA 行是否存在都要执行） */
    var topbar = document.getElementById("topbar");
    function syncTopbarH() {
      document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
    }
    if (window.ResizeObserver) {
      new ResizeObserver(syncTopbarH).observe(topbar);
    }
    syncTopbarH();
    if (!catsEl || !resetEl) return; /* MEDIA 顶部导航已移除 */
    resetEl.addEventListener("click", function () { DR.setFilter("media", "ALL"); });
    if (window.ResizeObserver) {
      var rT = null;
      new ResizeObserver(function () {
        clearTimeout(rT);
        rT = setTimeout(fitText, 120);
      }).observe(catsEl);
    }
  }

  return { init: init, render: render };
})();
