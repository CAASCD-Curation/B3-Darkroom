/* 暗房 DARKROOM V2 — sidebar.js 左侧 DARKROOM AS ? 二级筛选 */
DR.sidebar = (function () {
  "use strict";
  var bar;

  function render() {
    var items = [{ key: "ALL", en: "ALL", zh: "全部" }].concat(DR.db.meta.darkroomAs);
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
  }

  function init() { bar = document.getElementById("asBar"); }

  return { init: init, render: render };
})();
