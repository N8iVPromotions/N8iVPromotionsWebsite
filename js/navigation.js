(() => {
  const header = document.querySelector('.n8iv-header');
  if (!header) return;
  const toggle = header.querySelector('.n8iv-menu-toggle');
  const nav = header.querySelector('#n8iv-navigation');
  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach(link => {
    if (link.getAttribute('href') === '/insights' && location.pathname.startsWith('/insights')) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!header.contains(event.target)) setOpen(false); });
  matchMedia('(max-width:1000px)').addEventListener('change', () => setOpen(false));
})();
