/* ============================================================
   N8iV Promotions — main.js
   1. Nav scroll effect
   2. Fade-up on scroll  (IntersectionObserver)
   3. Parallax backgrounds
   4. Word-by-word text animation
   5. Counter animation (stats)
   ============================================================ */

/* ─── 1. NAV SCROLL EFFECT ────────────────────────────────── */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── 2. FADE-UP ON SCROLL ────────────────────────────────── */
(function initFadeUp() {
  const targets = document.querySelectorAll('[data-animate]');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
})();

/* ─── 3. PARALLAX BACKGROUNDS ─────────────────────────────── */
(function initParallax() {
  const layers = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!layers.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  let ticking = false;

  const update = () => {
    const scrollY = window.scrollY;

    layers.forEach(el => {
      const speed  = parseFloat(el.dataset.parallax) || 0.3;
      const rect   = el.closest('.parallax-section, .showcase, .cta-banner')?.getBoundingClientRect();
      if (!rect) return;

      // Only update when the section is visible in the viewport
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;

      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift  = center * speed;
      el.style.transform = `translateY(${shift}px)`;
    });

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

/* ─── 4. WORD-BY-WORD TEXT ANIMATION ──────────────────────── */
(function initWordAnimation() {
  const elements = document.querySelectorAll('[data-word-animate]');
  if (!elements.length) return;

  elements.forEach(el => {
    const blurMode = el.dataset.wordAnimate === 'blur';
    if (blurMode) el.classList.add('text-animate-blur');
    else          el.classList.add('text-animate');

    // Split text into word spans
    const rawText = el.textContent.trim();
    const words   = rawText.split(/\s+/);

    el.innerHTML = words
      .map((word, i) =>
        `<span class="word-wrap"><span class="word" style="--word-index:${i}" aria-hidden="false">${word}</span></span>`
      )
      .join(' ');

    // Trigger when visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(el);
  });
})();

/* ─── 5. COUNTER ANIMATION ────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.count, 10);
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;
    const start    = performance.now();

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = Math.round(easeOut(progress) * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();
