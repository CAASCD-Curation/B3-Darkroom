/* 暗房 DARKROOM V2 — filterbar.js 顶部 MEDIA 索引行 + 行尾 RESET
   （DARKROOM AS 维度在左侧边栏，见 sidebar.js） */
DR.filterbar = (function () {
  "use strict";
  var catsEl, resetEl;

  /* 长英文自动缩字号：保证完整显示，不截断、不滚动 */
  function fitText() {
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
    /* 小类按钮：中文在上、英文在下、计数辅助 */
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
        /* 再次点击已选中的小类 = 清除该维度筛选 */
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
    resetEl.addEventListener("click", function () { DR.setFilter("media", "ALL"); });
    /* 顶栏高度变化时同步侧边栏吸附位置；宽度变化时重新适配字号 */
    var topbar = document.getElementById("topbar");
    function syncTopbarH() {
      document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
    }
    if (window.ResizeObserver) {
      new ResizeObserver(syncTopbarH).observe(topbar);
      var rT = null;
      new ResizeObserver(function () {
        clearTimeout(rT);
        rT = setTimeout(fitText, 120);
      }).observe(catsEl);
    }
    syncTopbarH();
  }

  return { init: init, render: render };
})();
