/* 暗房 DARKROOM V2 — detail.js 详情态：点击显影（黑红 → 原彩） */
DR.detail = (function () {
  "use strict";
  var overlay, backBtn;
  var MEDIA_ZH = {}, AS_ZH = {};

  function catText(map, key) {
    return key + " · " + (map[key] || "");
  }

  function setField(name, value, isDim) {
    var dd = overlay.querySelector('[data-f="' + name + '"]');
    dd.textContent = value || "—";
    dd.classList.toggle("dim", !value || !!isDim);
  }

  function open(id) {
    var e = DR.byId[id];
    if (!e) return;

    /* 图片：duo 黑红层 + color 原彩层，进入后渐显（显影） */
    var stack = overlay.querySelector(".develop-stack");
    var duo = stack.querySelector(".duo");
    var color = stack.querySelector(".color");
    var thumbs = overlay.querySelector(".detail-thumbs");
    thumbs.innerHTML = "";
    if (e.images.length) {
      duo.style.display = "";
      duo.src = encodeURI(e.images[0].src);
      color.src = encodeURI(e.images[0].src);
      duo.alt = color.alt = e.id + " " + e.title;
      e.images.slice(1).forEach(function (img) {
        var im = document.createElement("img");
        im.src = encodeURI(img.src);
        im.alt = e.id;
        thumbs.appendChild(im);
      });
    } else {
      duo.style.display = "none";
      color.removeAttribute("src");
      color.alt = e.id + "（图片待补充）";
    }

    /* 信息字段 */
    setField("id", e.id);
    setField("title", e.title);
    setField("source", e.source);
    setField("year", e.year);
    /* TAGS：分类标签（MEDIA / DARKROOM AS）在前，# 标签在后 */
    var tagDD = overlay.querySelector('[data-f="tags"]');
    tagDD.innerHTML = "";
    tagDD.classList.remove("dim");
    var tagCount = 0;
    function addCatTag(map, key) {
      if (!key) return;
      var s = document.createElement("span");
      s.className = "tag cat";
      s.textContent = catText(map, key);
      tagDD.appendChild(s);
      tagCount++;
    }
    addCatTag(MEDIA_ZH, e.media);
    addCatTag(AS_ZH, e.darkroomAs);
    if (e.tags && e.tags.length) {
      e.tags.forEach(function (t) {
        var s = document.createElement("span");
        s.className = "tag";
        s.textContent = "#" + t;
        tagDD.appendChild(s);
        tagCount++;
      });
    }
    if (!tagCount) {
      tagDD.textContent = "—";
      tagDD.classList.add("dim");
    }
    setField("description", e.description);

    /* 打开并触发显影转场；不改变任何筛选状态 */
    overlay.hidden = false;
    overlay.classList.remove("developed");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add("developed"); });
    });
  }

  function close() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    /* 不重置筛选：返回照片墙时 MEDIA / DARKROOM AS 保持原状 */
  }

  function init() {
    overlay = document.getElementById("detail");
    backBtn = document.getElementById("detailBack");
    DR.db.meta.media.forEach(function (c) { MEDIA_ZH[c.key] = c.zh; });
    DR.db.meta.darkroomAs.forEach(function (c) { AS_ZH[c.key] = c.zh; });
    backBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !overlay.hidden) close();
    });
  }

  return { init: init, open: open, close: close };
})();
