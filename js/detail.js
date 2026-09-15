/* 暗房 DARKROOM V2 — detail.js
   详情卡片：从被点击照片的位置展开（FLIP），X 缩回原照片，← → 上一条 / 下一条 */
DR.detail = (function () {
  "use strict";
  var overlay, card, body, backdrop, closeBtn, prevBtn, nextBtn;
  var MEDIA_ZH = {}, AS_ZH = {};
  var currentId = null;

  function catText(map, key) {
    return key + " · " + (map[key] || "");
  }

  function setField(name, value, isDim) {
    var dd = overlay.querySelector('[data-f="' + name + '"]');
    dd.textContent = value || "—";
    dd.classList.toggle("dim", !value || !!isDim);
  }

  /* 被点击照片在视口中的位置（FLIP 的起点 / 终点） */
  function pinRect(id) {
    var pin = document.querySelector('.pin[data-id="' + id + '"]');
    if (!pin) return null;
    var photo = pin.querySelector(".photo") || pin;
    return photo.getBoundingClientRect();
  }

  /* 填充某条目的图片与信息，并更新 ← → 可用状态 */
  function fill(id) {
    var e = DR.byId[id];
    if (!e) return;
    currentId = id;

    /* 图片：duo 黑红层 + color 原彩层，.developed 后渐显（显影） */
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

    /* 上一条 / 下一条（基于当前筛选结果的顺序） */
    var l = DR.filtered();
    var i = -1;
    for (var k = 0; k < l.length; k++) if (l[k].id === id) { i = k; break; }
    prevBtn.disabled = i <= 0;
    nextBtn.disabled = i < 0 || i >= l.length - 1;
  }

  function replayDevelop() {
    overlay.classList.remove("developed");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add("developed"); });
    });
  }

  /* 打开：卡片从原照片的位置 / 尺寸连续放大到最终位置 */
  function open(id) {
    var from = pinRect(id);
    fill(id);
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    overlay.classList.remove("developed");
    requestAnimationFrame(function () {
      if (from && card.animate) {
        var to = card.getBoundingClientRect();
        if (to.width > 0 && from.width > 0) {
          var dx = from.left + from.width / 2 - (to.left + to.width / 2);
          var dy = from.top + from.height / 2 - (to.top + to.height / 2);
          var sx = from.width / to.width;
          var sy = from.height / to.height;
          card.style.transformOrigin = "center center";
          card.animate([
            { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", opacity: 0.3 },
            { transform: "none", opacity: 1 }
          ], { duration: 430, easing: "cubic-bezier(.22,.8,.24,1)" });
        }
      }
      overlay.classList.add("developed");
    });
  }

  /* 关闭：卡片反向缩回当前条目对应照片的原始位置 */
  function close() {
    if (overlay.hidden) return;
    var id = currentId;
    function finish() {
      overlay.hidden = true;
      overlay.classList.remove("developed");
      document.body.style.overflow = "";
      currentId = null;
    }
    var to = id ? pinRect(id) : null;
    overlay.classList.remove("developed"); /* 背板淡出，黑红层随显影反向回归 */
    if (to && card.animate) {
      var from = card.getBoundingClientRect();
      var dx = to.left + to.width / 2 - (from.left + from.width / 2);
      var dy = to.top + to.height / 2 - (from.top + from.height / 2);
      var sx = to.width / from.width;
      var sy = to.height / from.height;
      card.style.transformOrigin = "center center";
      var anim = card.animate([
        { transform: "none", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", opacity: 0.2 }
      ], { duration: 380, easing: "cubic-bezier(.5,0,.75,.4)" });
      anim.onfinish = finish;
    } else {
      finish();
    }
    /* 不重置筛选：返回照片墙时 MEDIA / DARKROOM AS 保持原状 */
  }

  /* 上一条 / 下一条：卡片保持原位，内容平滑更新 */
  function nav(dir) {
    if (overlay.hidden) return;
    var l = DR.filtered();
    var i = -1;
    for (var k = 0; k < l.length; k++) if (l[k].id === currentId) { i = k; break; }
    var n = i + dir;
    if (n < 0 || n >= l.length) return;
    if (body.animate) {
      body.animate([{ opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }],
        { duration: 280, easing: "ease" });
    }
    fill(l[n].id);
    replayDevelop();
  }

  function init() {
    overlay = document.getElementById("detail");
    card = overlay.querySelector(".detail-card");
    body = overlay.querySelector(".detail-body");
    backdrop = overlay.querySelector(".detail-backdrop");
    closeBtn = document.getElementById("detailClose");
    prevBtn = document.getElementById("detailPrev");
    nextBtn = document.getElementById("detailNext");
    DR.db.meta.media.forEach(function (c) { MEDIA_ZH[c.key] = c.zh; });
    DR.db.meta.darkroomAs.forEach(function (c) { AS_ZH[c.key] = c.zh; });
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    prevBtn.addEventListener("click", function () { nav(-1); });
    nextBtn.addEventListener("click", function () { nav(1); });
    document.addEventListener("keydown", function (ev) {
      if (overlay.hidden) return;
      if (ev.key === "Escape") close();
      else if (ev.key === "ArrowLeft") nav(-1);
      else if (ev.key === "ArrowRight") nav(1);
    });
  }

  return { init: init, open: open, close: close };
})();
