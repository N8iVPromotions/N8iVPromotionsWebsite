/* ================================================================
   N8iV Promotions — editorial.js
   Evidence surface, Scale / Test / Repair slider, chapter bar,
   and the motion toggle for pages with <body class="editorial">.
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

  // ── Evidence surface ───────────────────────────────────────────
  // A sheet of thin lines (the noise of platform data) with one purple
  // path running through it (the evidence) and a translucent band
  // around the path (the confidence range). `mode` runs 0 → 2:
  // 0 Scale (narrow band), 1 Test (wide band), 2 Repair (broken path).
  const surface = (function initSurface() {
    const canvas = document.querySelector('[data-surface]');
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    const ROWS = 84, COLS = 140;
    let w = 0, h = 0, dpr = 1, t = 0, visible = true, raf = 0;
    let mode = 0, target = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width); h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    const smooth = x => x * x * (3 - 2 * x);
    const clamp01 = x => Math.max(0, Math.min(1, x));

    function point(u, v) {
      const z = 0.20 * Math.sin(Math.PI * (u * 1.35 + v * 0.55) + t * 0.55)
              + 0.07 * Math.sin(2 * Math.PI * (v * 0.9 - u * 0.45) + t * 0.35);
      const x = w * (0.08 + 0.66 * u + 0.18 * v);
      const y = h * (0.20 + 0.46 * v + 0.12 * u) - z * h * 0.62;
      return [x, y];
    }
    function pathV(u) { return 0.42 + 0.20 * Math.sin(u * 3.1 + 0.6) + 0.04 * Math.sin(u * 9 + t * 0.4); }

    function draw() {
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const test = 1 - Math.abs(mode - 1);          // peaks at Test
      const repair = clamp01(mode - 1);             // grows toward Repair
      const band = 0.03 + 0.11 * smooth(clamp01(test)) + 0.035 * repair;

      // The sheet: dense rows of thin lines
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = 'rgba(28,28,28,0.62)';
      for (let j = 0; j < ROWS; j++) {
        const v = j / (ROWS - 1);
        ctx.beginPath();
        for (let i = 0; i < COLS; i++) {
          const [x, y] = point(i / (COLS - 1), v);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }

      // Confidence range: translucent purple over the rows near the path
      ctx.strokeStyle = 'rgba(120,96,252,0.34)';
      ctx.lineWidth = 1.1;
      for (let j = 0; j < ROWS; j++) {
        const v = j / (ROWS - 1);
        let open = false;
        ctx.beginPath();
        for (let i = 0; i < COLS; i++) {
          const u = i / (COLS - 1);
          const inside = Math.abs(v - pathV(u)) <= band;
          const [x, y] = point(u, v);
          if (inside) { open ? ctx.lineTo(x, y) : ctx.moveTo(x, y); open = true; } else open = false;
        }
        ctx.stroke();
      }

      // The evidence path: one continuous line, broken in Repair
      ctx.strokeStyle = '#7860FC';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i <= COLS * 2; i++) {
        const u = i / (COLS * 2);
        const gap = repair > 0 && Math.sin(u * 26) > 1 - 1.7 * repair;
        const [x, y] = point(u, pathV(u));
        if (gap) { drawing = false; continue; }
        drawing ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        drawing = true;
      }
      ctx.stroke();
    }

    function frame() {
      raf = 0;
      if (motionOn) t += 0.012;
      mode += (target - mode) * (motionOn ? 0.12 : 1);
      if (Math.abs(target - mode) < 0.001) mode = target;
      draw();
      if (visible && (motionOn || mode !== target)) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) kick();
    }).observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    motionListeners.push(kick);
    resize(); kick();

    return { setMode(m) { target = m; kick(); } };
  })();

  // ── Scale / Test / Repair slider ───────────────────────────────
  (function initDecide() {
    const wrap = document.querySelector('[data-decide]');
    if (!wrap) return;
    const range = wrap.querySelector('[data-decide-range]');
    const caption = wrap.querySelector('[data-decide-caption]');
    const stops = [...wrap.querySelectorAll('[data-stop]')];
    const labels = ['Scale', 'Test', 'Repair'];
    const captions = [
      'The evidence holds across models and the range is narrow. Move budget here.',
      'The range is wide. A designed test narrows it before a big move.',
      'The path breaks before revenue. Fix the tracking, then decide.'
    ];
    let last = -1;
    function update(value, fromUser) {
      const m = Math.max(0, Math.min(2, value));
      const nearest = Math.round(m);
      range.style.setProperty('--fill', (m / 2 * 100) + '%');
      if (nearest !== last) {
        last = nearest;
        stops.forEach((b, i) => b.setAttribute('aria-pressed', String(i === nearest)));
        caption.textContent = captions[nearest];
        range.setAttribute('aria-valuetext', labels[nearest]);
      }
      surface?.setMode(m);
      if (fromUser) window.N8iVAttribution?.track?.('decision_slider_used', { stop: labels[nearest] });
    }
    range.addEventListener('input', () => update(parseFloat(range.value), false));
    range.addEventListener('change', () => {
      const snapped = Math.round(parseFloat(range.value));
      range.value = snapped; update(snapped, true);
    });
    stops.forEach((b, i) => b.addEventListener('click', () => { range.value = i; update(i, true); }));
    update(parseFloat(range.value) || 0, false);
  })();

  // ── Chapter bar ────────────────────────────────────────────────
  (function initChapters() {
    const bar = document.querySelector('[data-chapter-bar]');
    const chapters = [...document.querySelectorAll('[data-chapter]')];
    if (!bar || !chapters.length) return;
    const ticks = bar.querySelector('.ed-ticks');
    const current = bar.querySelector('[data-chapter-current]');
    const toggle = bar.querySelector('.ed-bar-toggle');
    const list = bar.querySelector('.ed-chapter-list');
    const links = [...list.querySelectorAll('a')];
    const pad = n => String(n).padStart(2, '0');

    ticks.innerHTML = chapters.map(() => '<i></i>').join('');
    const tickEls = [...ticks.children];

    function setCurrent(index) {
      current.textContent = pad(Math.max(index, 0) + 1);
      tickEls.forEach((el, i) => {
        el.classList.toggle('is-current', i === index);
        el.classList.toggle('is-past', i < index);
      });
      links.forEach((a, i) => a.setAttribute('aria-current', String(i === index)));
    }
    function pick() {
      const line = window.innerHeight * 0.45;
      let index = -1;
      chapters.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) index = i; });
      setCurrent(index);
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); }
    }, { passive: true });
    window.addEventListener('resize', pick, { passive: true });
    pick();

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
    }
    toggle.addEventListener('click', () => setOpen(list.hidden));
    links.forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !list.hidden) { setOpen(false); toggle.focus(); } });
    document.addEventListener('click', e => { if (!list.hidden && !bar.contains(e.target)) setOpen(false); });
  })();
})();
