/* ================================================================
   N8iV Intelligence — main.js
   Scroll reveals, counter animation, bar chart animation,
   nav scroll behavior, attribution flow
   ================================================================ */

// ── 1. NAV: switch to light style over light sections ──────────
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const lightSections = document.querySelectorAll('.bg-surface, .bg-page');

  function update() {
    let overLight = false;
    const navBottom = nav.getBoundingClientRect().bottom;
    lightSections.forEach(sec => {
      const r = sec.getBoundingClientRect();
      if (r.top <= navBottom && r.bottom >= navBottom) overLight = true;
    });
    nav.classList.toggle('light', overLight);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── 2. REVEAL ON SCROLL ────────────────────────────────────────
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();

// ── 3. COUNTER ANIMATION ───────────────────────────────────────
(function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  const ease = t => 1 - Math.pow(1 - t, 3);

  function run(el) {
    const target   = parseFloat(el.dataset.count);
    const prefix   = el.dataset.prefix   || '';
    const suffix   = el.dataset.suffix   || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const dur      = 1600;
    const start    = performance.now();

    function step(now) {
      const t   = Math.min((now - start) / dur, 1);
      const val = target * ease(t);
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
})();

// ── 4. BAR CHART ANIMATION ─────────────────────────────────────
(function initBars() {
  const bars = document.querySelectorAll('[data-bar]');
  if (!bars.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const pct = parseFloat(e.target.dataset.bar) || 0;
        e.target.style.transform = 'scaleX(' + (pct / 100) + ')';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  // GPU-friendly fill: full width, animate horizontal scale from 0
  bars.forEach(el => {
    el.style.width = '100%';
    el.style.transformOrigin = 'left';
    el.style.transform = 'scaleX(0)';
    io.observe(el);
  });
})();

// ── 5. MOBILE MENU ────────────────────────────────────────────
(function initMobileMenu() {
  const toggle = document.querySelector('.nav-mobile-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// ── 6. ACTIVE NAV LINK ──────────────────────────────────────────
(function initActiveNav() {
  const path = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

// ── 7. PROBLEM CARD HOVER PARALLAX ────────────────────────────
(function initCardTilt() {
  document.querySelectorAll('.problem-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 6;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 6;
      card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();
