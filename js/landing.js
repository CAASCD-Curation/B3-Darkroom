/* ============================================================
   开屏 LANDING — 一室万象 / ONE ROOM, ENDLESS VISIONS
   SVG 与 CSS 完成绘制、遮罩及打字动画；点击任意处进入网站。
   开屏保留在 DOM 中，点击顶栏品牌区可返回完整静态构图。
   ============================================================ */
(function () {
  var landing = document.getElementById('landing');
  if (!landing) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hideTimer = null;

  /* ---------- 进入网站：开屏淡出后隐藏（保留在 DOM，可再次返回） ---------- */
  function dismiss() {
    if (landing.classList.contains('gone') ||
        landing.classList.contains('leaving')) return;
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
  }

  /* 开屏期间锁定底层页面滚动 */
  document.body.classList.add('landing-open');

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
