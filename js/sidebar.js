/* 暗房 DARKROOM V2 — sidebar.js 左侧 DARKROOM AS ? 二级筛选 */
DR.sidebar = (function () {
  "use strict";
  var bar;

  function render() {
    var items = DR.db.meta.darkroomAs;
    bar.innerHTML = "";
    items.forEach(function (cat) {
      var n = DR.countFor("as", cat.key);
      var b = document.createElement("button");
      b.type = "button";
      b.className = DR.state.as === cat.key ? "active" : "";
      var en = document.createElement("span");
      en.textContent = cat.en;
      var zh = document.createElement("span");
      zh.className = "zh";
      zh.textContent = cat.zh + " " + n;
      b.appendChild(en);
      b.appendChild(zh);
      b.addEventListener("click", function () { DR.setFilter("as", cat.key); });
      bar.appendChild(b);
    });
    /* 侧边栏 RESET：只重置 DARKROOM AS 这一条筛选线 */
    var r = document.createElement("button");
    r.type = "button";
    r.className = "side-reset";
    r.textContent = "RESET";
    r.hidden = DR.state.as === "ALL";
    r.addEventListener("click", function () { DR.setFilter("as", "ALL"); });
    bar.appendChild(r);
  }

  function init() { bar = document.getElementById("asBar"); }

  return { init: init, render: render };
})();
