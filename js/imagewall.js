/* 暗房 DARKROOM V2.1 — imagewall.js
   「真实暗房的照片墙」：相纸边框 + 有控制的随机散落布局。
   位置 / 旋转 / 尺寸由 ID 哈希播种，筛选变化时同一张照片的体态保持稳定。 */
DR.wall = (function () {
  "use strict";
  var wall;

  /* 稳定伪随机：同一 ID 永远得到同一组随机数 */
  function rnd(id, salt) {
    var h = 2166136261 ^ salt;
    var s = id + "|" + salt;
    for (var i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
    }
    return h / 4294967295;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function aspectOf(e) {
    var d = e.images.length && e.images[0].dim;
    if (d && d.w && d.h) return d.w / d.h;
    return 0.8; /* 缺图按竖版 4:5 */
  }

  function buildItem(e, geo) {
    var pin = document.createElement("div");
    pin.className = "pin";
    pin.dataset.id = e.id;
    pin.style.left = geo.x + "px";
    pin.style.top = geo.y + "px";
    pin.style.width = geo.w + "px";
    pin.style.zIndex = geo.z;
    pin.style.transform = "rotate(" + geo.rot + "deg)";

    var photo = document.createElement("div");
    photo.className = "photo" + (e.images.length ? "" : " pending");

    if (e.images.length) {
      var wrap = document.createElement("div");
      wrap.className = "imgwrap";
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = encodeURI(e.images[0].src);
      img.alt = e.id + " " + e.title;
      img.addEventListener("load", function () { wrap.classList.add("on"); });
      if (img.complete && img.naturalWidth > 0) wrap.classList.add("on");
      wrap.appendChild(img);
      photo.appendChild(wrap);
    } else {
      var ph = document.createElement("div");
      ph.className = "ph";
      var pid = document.createElement("span");
      pid.className = "pid";
      pid.textContent = e.id;
      var pt = document.createElement("span");
      pt.className = "pt";
      pt.textContent = "PENDING";
      ph.appendChild(pid);
      ph.appendChild(pt);
      photo.appendChild(ph);
    }

    var cap = document.createElement("div");
    cap.className = "cap";
    cap.textContent = e.id;
    var t = document.createElement("span");
    t.className = "t";
    t.textContent = e.title;
    cap.appendChild(t);
    photo.appendChild(cap);

    pin.appendChild(photo);
    pin.addEventListener("click", function () { DR.detail.open(e.id); });
    return pin;
  }

  /* 有控制的随机：行式基线 + 逐张抖动，轻微重叠，行列不完全对齐 */
  function layout(list) {
    var W = wall.clientWidth - 24;
    if (W < 200) W = 200;
    var target = clamp(W * 0.095, 72, 160);   /* 每张约占视口宽 8–15% */
    var margin = 12;
    var x = margin + rnd("origin", 1) * 20;
    var y = margin;
    var rowMaxH = 0;
    var items = [];

    list.forEach(function (e, i) {
      var aspect = aspectOf(e);
      var sizeF = 0.86 + rnd(e.id, 2) * 0.28;           /* 尺寸轻微差异 */
      var imgH = target * 1.12 * sizeF;
      var imgW = imgH * aspect;
      var padW = imgW * 0.09;                            /* 相纸边框宽度 */
      var w = imgW + padW * 2;
      var h = imgH + padW * 2.4;

      if (x + w > W - margin && x > margin + 1) {        /* 换行 */
        y += rowMaxH * (0.86 + rnd("row" + i, 3) * 0.12);/* 行距不一致、轻微重叠 */
        x = margin + rnd("rowx" + i, 4) * 26;            /* 每行起始不对齐 */
        rowMaxH = 0;
      }

      var jx = (rnd(e.id, 5) - 0.5) * 16;                /* 位置抖动 */
      var jy = (rnd(e.id, 6) - 0.5) * 16;
      var rot = (rnd(e.id, 7) - 0.5) * 5.2;              /* 轻微旋转 ±2.6° */
      var z = 1 + Math.floor(rnd(e.id, 8) * 8);

      var fx = clamp(x + jx, 2, Math.max(2, W - w - 2));
      items.push({ e: e, x: fx, y: y + jy, w: w, rot: rot, z: z });

      rowMaxH = Math.max(rowMaxH, h);
      x += w * (0.88 + rnd(e.id, 9) * 0.24);             /* 间距不完全一致，部分重叠 */
    });

    wall.style.height = (y + rowMaxH + 40) + "px";
    return items;
  }

  function render() {
    var list = DR.filtered();
    wall.innerHTML = "";
    if (!list.length) {
      var p = document.createElement("p");
      p.className = "wall-empty";
      p.textContent = "NO ENTRIES / 没有匹配的词条";
      wall.appendChild(p);
      wall.style.height = "40vh";
      return;
    }
    var items = layout(list);
    var frag = document.createDocumentFragment();
    items.forEach(function (it) { frag.appendChild(buildItem(it.e, it)); });
    wall.appendChild(frag);
  }

  var resizeTimer = null;
  function init() {
    wall = document.getElementById("wall");
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 180);
    });
  }

  return { init: init, render: render };
})();
