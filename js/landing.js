/* ================================================================
   N8iV Promotions — landing.js
   Cold-traffic landing page (/start). The hero question is the first
   self-audit question: picking an answer saves it to the self-audit
   draft and opens the audit already in progress.
   ================================================================ */
(function () {
  const AUDIT_URL = '/revenue-self-audit?start=1';
  const DRAFT_KEY = 'n8iv_self_audit_draft';
  const track = (name, data) => window.N8iVAttribution?.track?.(name, data);

  document.querySelectorAll('[data-lp-question] [data-answer]').forEach(button => {
    button.addEventListener('click', () => {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        draft.q0 = button.dataset.answer;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {}
      button.setAttribute('aria-pressed', 'true');
      track('lp_first_answer', { answer: button.textContent.trim() });
      window.location.href = AUDIT_URL;
    });
  });

  document.querySelectorAll('[data-lp-cta]').forEach(link => {
    link.addEventListener('click', () => track('lp_cta_click', { location: link.dataset.lpCta }));
  });

  // Mobile sticky bar: only once the hero question has scrolled away,
  // and hidden again over the final call to action.
  const sticky = document.querySelector('[data-lp-sticky]');
  const hero = document.querySelector('[data-lp-hero]');
  const final = document.querySelector('.lp-final');
  if (sticky && hero && 'IntersectionObserver' in window) {
    let heroVisible = true, finalVisible = false;
    const update = () => sticky.classList.toggle('is-visible', !heroVisible && !finalVisible);
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
    if (final) new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; update(); }).observe(final);
  }
})();
