/* ================================================================
   N8iV Promotions — editorial.js
   Dark-chapter chrome, chapter rail, and the motion toggle for pages with <body class="editorial">.
   ================================================================ */
(function () {
  const root = document.documentElement;
  root.classList.add('ed-js');

  // ── Motion preference ──────────────────────────────────────────
  const MOTION_KEY = 'n8iv_motion';
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function readMotion() {
    try {
      const saved = localStorage.getItem(MOTION_KEY);
      if (saved === 'on' || saved === 'off') return saved === 'on';
    } catch (e) {}
    return !reduceQuery.matches;
  }
  let motionOn = readMotion();
  const motionListeners = [];
  function applyMotion() {
    root.classList.toggle('motion-off', !motionOn);
    document.querySelectorAll('[data-motion-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(motionOn));
      btn.textContent = motionOn ? 'Motion on' : 'Motion off';
    });
    motionListeners.forEach(fn => fn(motionOn));
  }
  document.querySelectorAll('[data-motion-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      motionOn = !motionOn;
      try { localStorage.setItem(MOTION_KEY, motionOn ? 'on' : 'off'); } catch (e) {}
      applyMotion();
    });
  });
  applyMotion();

  // ── Header and chapter rail follow the dark chapter ─────────────
  (function initDarkChrome() {
    const nav = document.querySelector('.nav');
    const bar = document.querySelector('[data-chapter-rail]');
    const darks = [...document.querySelectorAll('.ed-dark')];
    if (!darks.length) return;
    const over = y => darks.some(sec => { const r = sec.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    let ticking = false;
    function update() {
      ticking = false;
      if (nav) nav.classList.toggle('ed-nav-dark', over(nav.getBoundingClientRect().bottom - 1));
      if (bar && bar.offsetHeight) bar.classList.toggle('ed-rail-dark', over(window.innerHeight - bar.offsetHeight + 1));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  // ── Chapter rail: highlight the chapter in view ────────────────
  (function initRail() {
    const rail = document.querySelector('[data-chapter-rail]');
    const chapters = [...document.querySelectorAll('[data-chapter]')];
    if (!rail || !chapters.length) return;
    const links = [...rail.querySelectorAll('a')];
    function pick() {
      const line = window.innerHeight * 0.45;
      let index = -1;
      chapters.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) index = i; });
      links.forEach((a, i) => {
        if (i === index) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); }
    }, { passive: true });
    window.addEventListener('resize', pick, { passive: true });
    pick();
  })();
})();
