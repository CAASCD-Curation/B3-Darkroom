/* 暗房 DARKROOM V2 — filterbar.js 顶部 MEDIA 一级筛选 */
DR.filterbar = (function () {
  "use strict";
  var bar;

  function label(cat) { return cat.en + " · " + cat.zh; }

  function render() {
    var items = [{ key: "ALL", en: "ALL MEDIA", zh: "" }].concat(DR.db.meta.media);
    bar.innerHTML = "";
    items.forEach(function (cat) {
      var n = DR.countFor("media", cat.key);
      var b = document.createElement("button");
      b.type = "button";
      b.className = DR.state.media === cat.key ? "active" : "";
      b.textContent = cat.zh ? label(cat) : cat.en;
      var s = document.createElement("span");
      s.className = "n";
      s.textContent = n;
      b.appendChild(s);
      b.addEventListener("click", function () { DR.setFilter("media", cat.key); });
      bar.appendChild(b);
    });
  }

  function init() { bar = document.getElementById("mediaBar"); }

  return { init: init, render: render };
})();
