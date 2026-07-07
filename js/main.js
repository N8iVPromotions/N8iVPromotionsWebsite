/* ================================================================
   N8iV Promotions — main.js
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

// ── 6. PARALLAX (scroll depth) ─────────────────────────────────
(function initParallax() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  // Auto-assign depth to the decorative hero orbs (different rates +
  // opposite directions reads as parallax). Anything with an explicit
  // [data-parallax] speed is honoured too.
  document.querySelectorAll('.hero-glow-1').forEach(el => { if (!el.dataset.parallax) el.dataset.parallax = '0.22'; });
  document.querySelectorAll('.hero-glow-2').forEach(el => { if (!el.dataset.parallax) el.dataset.parallax = '-0.16'; });

  const items = [...document.querySelectorAll('[data-parallax]')]
    .map(el => ({ el, speed: parseFloat(el.dataset.parallax) || 0, base: 0, h: 0 }))
    .filter(i => i.speed);
  if (!items.length) return;

  // Cache each element's document position WITHOUT any transform applied,
  // so the scroll math never feeds back on itself.
  function measure() {
    const y = window.scrollY;
    for (const it of items) {
      it.el.style.transform = '';
      const r = it.el.getBoundingClientRect();
      it.base = r.top + y;
      it.h = r.height;
    }
    update();
  }

  let ticking = false;
  function update() {
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    for (const it of items) {
      const elementCenter = it.base + it.h / 2;
      const offset = (elementCenter - viewportCenter) * it.speed;
      it.el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    }
    ticking = false;
  }
  function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  measure();

  // Honour a runtime switch to reduced motion: stop and reset transforms.
  reduce.addEventListener?.('change', e => {
    if (e.matches) {
      window.removeEventListener('scroll', onScroll);
      items.forEach(i => { i.el.style.transform = ''; });
    }
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

// ── 7. AUDIT REQUEST FORM ─────────────────────────────────────
(function initAuditRequestForm() {
  const form = document.querySelector('[data-audit-request-form]');
  if (!form) return;

  const status = document.getElementById('audit-form-status');
  const button = form.querySelector('button[type="submit"]');
  const buttonHtml = button?.innerHTML || '';

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.className = 'form-status' + (type ? ' ' + type : '');
  }

  function setPending(pending) {
    if (!button) return;
    button.disabled = pending;
    button.style.opacity = pending ? '0.75' : '';
    button.innerHTML = pending ? 'Sending...' : buttonHtml;
  }

  function buildFallbackMailto(data) {
    const subject = encodeURIComponent('Revenue Intelligence Audit Request');
    const body = encodeURIComponent([
      `Name: ${data.firstName} ${data.lastName}`,
      `Email: ${data.email}`,
      `Company: ${data.company}`,
      `Role: ${data.role}`,
      `Monthly Marketing Investment: ${data.investment}`,
      `CRM Platform: ${data.crm}`,
      '',
      'Biggest Marketing Visibility Challenge:',
      data.challenge,
    ].join('\n'));
    return `mailto:zajen@n8ivpromotions.com?subject=${subject}&body=${body}`;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    setStatus('Sending your audit request...', '');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'The request could not be sent.');
      }

      form.reset();
      setStatus('Your audit request was sent to zajen@n8ivpromotions.com. We will follow up within 1 business day.', 'success');
    } catch (error) {
      console.error(error);
      const fallback = buildFallbackMailto(data);
      setStatus('Something blocked the automatic email. Please email the request directly to zajen@n8ivpromotions.com.', 'error');
      window.location.href = fallback;
    } finally {
      setPending(false);
    }
  });
})();

// ── 8. PROBLEM CARD HOVER PARALLAX ────────────────────────────
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
