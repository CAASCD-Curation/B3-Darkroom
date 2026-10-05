/* ============================================================
   开屏 LANDING — 黑场 + 红色 DARKROOM 剪切蒙版标题
   字形内部黑白图片缓慢轮播；点击任意处进入照片墙。
   开屏进入后保留在 DOM 中（.gone 隐藏），
   点击顶栏左上角「暗房 DARKROOM」可随时返回开屏。
   ============================================================ */
(function () {
  var landing = document.getElementById('landing');
  if (!landing) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 字形内部黑白图片轮播（交叉淡入，图片始终被 clipPath 限制在字形内） ---------- */
  var PHOTOS = [
    'images/A/A-01.png',
    'images/C/C-34.jpg',
    'images/D/D-22.jpg',
    'images/B/B-03.webp'
  ];
  var imgA = document.getElementById('drImgA');
  var imgB = document.getElementById('drImgB');
  var idx = 0;          // 当前显示的图片下标（初始 = PHOTOS[0]，已写在 HTML 里）
  var showingA = true;  // 当前可见的是哪一层 <image>
  var timer = null;
  var hideTimer = null;

  function setHref(el, src) { el.setAttribute('href', src); }

  function startCarousel() {
    if (reduce || timer || !imgA || !imgB) return;
    PHOTOS.forEach(function (s) { var im = new Image(); im.src = s; });  /* 预载 */
    timer = setInterval(function () {
      idx = (idx + 1) % PHOTOS.length;
      var inEl = showingA ? imgB : imgA;
      var outEl = showingA ? imgA : imgB;
      setHref(inEl, PHOTOS[idx]);
      inEl.classList.remove('dr-off');   /* 淡入新图 */
      outEl.classList.add('dr-off');     /* 同时淡出旧图 */
      showingA = !showingA;
    }, 4500);
  }
  function stopCarousel() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* ---------- 进入照片墙：开屏淡出后隐藏（保留在 DOM，可再次返回） ---------- */
  function dismiss() {
    if (landing.classList.contains('gone') ||
        landing.classList.contains('leaving')) return;
    stopCarousel();
    document.body.classList.remove('landing-open');
    if (reduce) { landing.classList.add('gone'); return; }
    landing.classList.add('leaving');
    hideTimer = setTimeout(function () {
      landing.classList.add('gone');     /* 不 remove()，返回开屏时直接复用 */
    }, 650);
  }

  /* ---------- 返回开屏：顶栏「暗房 DARKROOM」 ---------- */
  function show() {
    if (!landing.classList.contains('gone') &&
        !landing.classList.contains('leaving')) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    landing.classList.remove('gone');
    void landing.offsetWidth;            /* 强制重排，让 opacity 过渡重新播放 */
    landing.classList.remove('leaving');
    document.body.classList.add('landing-open');
    startCarousel();
  }

  /* 开屏期间锁定底层页面滚动 */
  document.body.classList.add('landing-open');
  startCarousel();

  landing.addEventListener('click', dismiss);
  landing.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); }
  });

  /* 顶栏品牌区：点击 / 键盘 返回开屏首页 */
  var brand = document.getElementById('brandHome');
  if (brand) {
    brand.addEventListener('click', show);
    brand.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
    });
  }
})();
