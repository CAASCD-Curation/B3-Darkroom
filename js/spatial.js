/* 暗房 DARKROOM — SPATIAL / 空间导航
   轴测总地图 → 建筑剖面 → 楼层 → 现有展品瀑布流。
   视觉、建筑数据与照片筛选在此独立管理；原 database.js 与其他观看模式不变。 */
DR.spatial = (function () {
  "use strict";
  var root, section, counter;
  var currentBuilding = null;
  var currentFloor = null;
  var currentList = [];
  var resizeTimer = null;
  var model = window.DR_SPATIAL;
  var byBuilding = {};

  model.map.buildings.forEach(function (b) { byBuilding[b.id] = b; });

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pointsAttr(points) {
    return points.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
  }

  function clipPolygon(points, viewBox) {
    return "polygon(" + points.map(function (p) {
      return (p[0] / viewBox[0] * 100).toFixed(3) + "% " +
             (p[1] / viewBox[1] * 100).toFixed(3) + "%";
    }).join(",") + ")";
  }

  function entriesFor(building, floor) {
    var floors = floor ? [floor] : building.floors;
    var keys = {};
    floors.forEach(function (f) { keys[f.subKey] = true; });
    return DR.db.entries.filter(function (e) { return !!keys[e.exSub]; });
  }

  function buildingCount(building) { return entriesFor(building, null).length; }

  /* 同一份灰度线稿叠两层：选中多边形内的上层反色 = 黑底白线。 */
  function drawing(opts) {
    var html = '<div class="spatial-drawing ' + esc(opts.className || "") +
      '" style="aspect-ratio:' + opts.viewBox[0] + "/" + opts.viewBox[1] + '">';
    html += '<img class="spatial-lines" src="' + esc(opts.src) + '" alt="' + esc(opts.alt) + '" draggable="false">';
    if (opts.selected) {
      html += '<img class="spatial-lines spatial-invert" src="' + esc(opts.src) +
        '" alt="" aria-hidden="true" draggable="false" style="clip-path:' +
        clipPolygon(opts.selected.polygon, opts.viewBox) + '">';
    }
    html += '<svg class="spatial-hotzones" viewBox="0 0 ' + opts.viewBox.join(" ") +
      '" preserveAspectRatio="none" aria-label="' + esc(opts.alt) + '">';
    opts.items.forEach(function (item) {
      var selected = opts.selected && opts.selected.id === item.id;
      var attr = opts.kind === "floor" ? 'data-floor="' + esc(item.id) + '"' : 'data-building="' + esc(item.id) + '"';
      var label = opts.kind === "floor" ? item.label + " " + item.zh : item.id + " " + item.name;
      html += '<polygon points="' + pointsAttr(item.polygon) + '" class="spatial-hotspot' +
        (selected ? " selected" : "") + '" ' + attr + ' role="button" tabindex="0" aria-label="' +
        esc(label) + '" aria-pressed="' + String(!!selected) + '"><title>' + esc(label) + '</title></polygon>';
    });
    html += '</svg></div>';
    return html;
  }

  function mapDrawing(selectedBuilding, className) {
    return drawing({
      src: model.map.src,
      viewBox: model.map.viewBox,
      items: model.map.buildings,
      selected: selectedBuilding || null,
      kind: "building",
      alt: "三栋建筑轴测总地图",
      className: className || ""
    });
  }

  function miniMap(building) {
    return '<aside class="spatial-minimap" aria-label="全局建筑导航">' +
      '<div class="spatial-mini-head"><span>LOCATION / 当前位置</span>' +
      '<button type="button" data-overview>← OVERVIEW</button></div>' +
      mapDrawing(building, "spatial-mini-drawing") +
      '<div class="spatial-mini-current">' + esc(building.id) + ' · ' + esc(building.name) + '</div>' +
      '</aside>';
  }

  function setCounter(html) { counter.innerHTML = html; }

  function renderOverview() {
    currentBuilding = null;
    currentFloor = null;
    currentList = [];
    DR.navList = null;
    section.dataset.view = "overview";
    var total = model.map.buildings.reduce(function (n, b) { return n + buildingCount(b); }, 0);
    var html = '<div class="spatial-overview">' +
      '<header class="spatial-overview-head">' +
      '<div><p class="spatial-kicker">SPATIAL NAVIGATION / 空间导航</p>' +
      '<h2>THREE BUILDINGS<br>EIGHT FLOORS</h2></div>' +
      '<p class="spatial-intro">从建筑进入策展结构。选择一栋建筑，查看剖面与楼层；选择楼层，浏览对应展品。</p>' +
      '</header>' +
      '<div class="spatial-overview-map">' + mapDrawing(null, "spatial-main-map") + '</div>' +
      '<div class="spatial-building-index">';
    model.map.buildings.forEach(function (b) {
      html += '<button type="button" class="spatial-building-card" data-building="' + esc(b.id) + '">' +
        '<span class="spatial-building-no">' + esc(b.id) + '</span>' +
        '<span class="spatial-building-name">' + esc(b.name) + '<small>' + esc(b.en) + '</small></span>' +
        '<span class="spatial-building-sub">' + esc(b.subtitle) + '</span>' +
        '<span class="spatial-building-count">' + b.floors.length + ' FLOORS · ' + buildingCount(b) + ' ENTRIES →</span>' +
        '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;
    setCounter('<b>3</b> BUILDINGS · <b>8</b> FLOORS · <b>' + total + '</b> ENTRIES');
  }

  function floorNav(building, floor) {
    var html = '<nav class="spatial-floor-nav" aria-label="楼层选择">';
    html += '<button type="button" class="spatial-all-floors' + (!floor ? " active" : "") +
      '" data-all-floors><span>ALL FLOORS</span><b>' + buildingCount(building) + '</b></button>';
    building.floors.forEach(function (f) {
      html += '<button type="button" data-floor="' + esc(f.id) + '" class="' +
        (floor && floor.id === f.id ? "active" : "") + '"><span>' + esc(f.label) + ' · ' + esc(f.zh) +
        '</span><b>' + entriesFor(building, f).length + '</b></button>';
    });
    return html + '</nav>';
  }

  function renderBuilding() {
    var b = currentBuilding;
    var f = currentFloor;
    if (!b) { renderOverview(); return; }
    currentList = entriesFor(b, f);
    DR.navList = currentList;
    section.dataset.view = "building";
    section.dataset.building = b.id;
    var title = f ? f.label + " · " + f.zh : "建筑全部展品";
    var keywords = f ? f.keywords.join(" / ") : b.floors.map(function (floor) { return floor.zh; }).join(" / ");

    var html = '<div class="spatial-building-layout">' +
      '<aside class="spatial-section-pane">' +
      '<div class="spatial-section-inner">' +
      '<header class="spatial-section-head">' +
      '<button type="button" class="spatial-back" data-overview>← AXONOMETRIC MAP / 返回总览</button>' +
      '<p class="spatial-kicker">' + esc(b.id) + ' / ' + esc(b.en) + '</p>' +
      '<h2>' + esc(b.name) + '</h2><p class="spatial-subtitle">' + esc(b.subtitle) + '</p>' +
      '</header>' + floorNav(b, f) +
      '<div class="spatial-section-drawing">' + drawing({
        src: b.section, viewBox: b.sectionViewBox, items: b.floors,
        selected: f || null, kind: "floor", alt: b.name + "建筑剖面图",
        className: "spatial-section-lines"
      }) + '</div>' +
      '<p class="spatial-drawing-note">SELECT A FLOOR / 点击剖面楼层筛选展品</p>' +
      '</div></aside>' +
      '<main class="spatial-exhibits">' +
      '<header class="spatial-exhibits-head"><div><p class="spatial-kicker">EXHIBITS / 展品</p>' +
      '<h3>' + esc(title) + '</h3></div><span class="spatial-exhibit-count">' + currentList.length + ' ENTRIES</span>' +
      '<p class="spatial-keywords">' + esc(keywords) + '</p></header>' +
      '<div id="spatialWall" class="spatial-wall" aria-label="当前建筑或楼层的展品照片"></div>' +
      '</main></div>' + miniMap(b);
    root.innerHTML = html;
    DR.wall.renderInto(document.getElementById("spatialWall"), currentList);
    setCounter('<b>' + currentList.length + '</b> ENTRIES · ' + esc(b.id) + (f ? " / " + esc(f.label) : ""));
  }

  function openBuilding(id) {
    var b = byBuilding[id];
    if (!b) return;
    if (currentBuilding && currentBuilding.id === id && section.dataset.view === "building") return;
    currentBuilding = b;
    currentFloor = null; /* 切楼后默认全部展品，不保留上一栋的楼层状态 */
    renderBuilding();
    window.scrollTo(0, 0);
  }

  function selectFloor(id) {
    if (!currentBuilding) return;
    if (currentFloor && currentFloor.id === id) return;
    var floor = null;
    currentBuilding.floors.forEach(function (f) { if (f.id === id) floor = f; });
    if (!floor) return;
    currentFloor = floor;
    renderBuilding();
    window.scrollTo(0, 0);
  }

  function enter() { renderOverview(); }
  function leave() { DR.navList = null; }

  function init() {
    section = document.getElementById("spatial");
    root = document.getElementById("spatialRoot");
    counter = document.getElementById("counter");
    section.addEventListener("click", function (ev) {
      var overview = ev.target.closest("[data-overview]");
      var allFloors = ev.target.closest("[data-all-floors]");
      var building = ev.target.closest("[data-building]");
      var floor = ev.target.closest("[data-floor]");
      if (overview) renderOverview();
      else if (allFloors) {
        if (currentFloor) { currentFloor = null; renderBuilding(); }
      } else if (floor) selectFloor(floor.getAttribute("data-floor"));
      else if (building) openBuilding(building.getAttribute("data-building"));
    });
    section.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var target = ev.target.closest("[data-building],[data-floor],[data-overview],[data-all-floors]");
      if (!target) return;
      ev.preventDefault();
      target.click();
    });
    window.addEventListener("resize", function () {
      if (DR.state.mode !== "spatial" || !currentBuilding) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var wall = document.getElementById("spatialWall");
        if (wall) DR.wall.renderInto(wall, currentList);
      }, 180);
    });
  }

  return {
    init: init, enter: enter, leave: leave,
    renderOverview: renderOverview,
    getState: function () {
      return {
        building: currentBuilding && currentBuilding.id,
        floor: currentFloor && currentFloor.id,
        count: currentList.length,
        ids: currentList.map(function (e) { return e.id; })
      };
    }
  };
})();
