/* Shared navigation, campaign links and conversion events.
   Static-site event shape follows the Vercel Web Analytics client API.
   https://vercel.com/docs/analytics/custom-events */
(function () {
  'use strict';
  if (window.N8iVConversion) return;

  const config = window.N8iVConversionConfig || {};
  const campaignKeys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term',
    'utm_content', 'utm_source_platform', 'gclid', 'gbraid', 'wbraid',
    'fbclid', 'msclkid', 'li_fat_id', 'ttclid', 'twclid', 'sccid'
  ];
  const campaignStorageKey = 'n8iv_conversion_campaign_v1';
  const reviewCalendarUrl = 'https://calendar.app.google/oahGzxrEsXUGS6oBA';

  // Install the documented queue before a deferred analytics module loads.
  // A blocked or unavailable analytics script never blocks navigation.
  try {
    window.va = window.va || function () {
      if (!Array.isArray(window.vaq)) window.vaq = [];
      window.vaq.push(arguments);
    };
  } catch (_) {}

  function track(name, values) {
    try {
      if (!['cta_click', 'audit_link_click', 'audit_complete'].includes(name)) return;
      const data = {};
      if ((name === 'cta_click' || name === 'audit_link_click') && typeof values?.location === 'string') {
        data.location = values.location.slice(0, 80);
      }
      if (name === 'audit_complete' && typeof values?.score_band === 'string') {
        data.score_band = values.score_band.slice(0, 80);
      }
      if (typeof window.va !== 'function') return;
      const event = Object.keys(data).length ? { name, data } : { name };
      window.va('event', event);
    } catch (_) { /* Measurement must never interrupt the visitor. */ }
  }

  function currentCampaign() {
    const params = new URLSearchParams(window.location.search);
    const current = {};
    campaignKeys.forEach(key => {
      const value = params.get(key);
      if (value) current[key] = value.slice(0, 500);
    });
    if (Object.keys(current).length) {
      try { sessionStorage.setItem(campaignStorageKey, JSON.stringify(current)); } catch (_) {}
      return current;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(campaignStorageKey) || '{}');
      return Object.fromEntries(campaignKeys
        .filter(key => typeof saved?.[key] === 'string')
        .map(key => [key, saved[key].slice(0, 500)]));
    } catch (_) { return {}; }
  }
  const campaign = currentCampaign();

  function pathOf(url) {
    return url.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  }
  function isPrivatePreviewParameter(key) {
    return /^_vercel_/i.test(key);
  }
  function preserveBookingQuery(link) {
    try {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || pathOf(url) !== '/book') return;
      const params = new URLSearchParams();
      Object.entries(campaign).forEach(([key, value]) => params.set(key, value));
      // The paid landing page carries its complete campaign query into /book.
      // Vercel access parameters are not campaign data and must stay private.
      if (pathOf(new URL(window.location.href)) === '/pilot') {
        const incoming = new URLSearchParams(window.location.search);
        Array.from(new Set(incoming.keys())).forEach(key => {
          if (isPrivatePreviewParameter(key)) return;
          params.delete(key);
          incoming.getAll(key).forEach(value => params.append(key, value));
        });
      }
      Array.from(new Set(params.keys())).forEach(key => {
        if (!url.searchParams.has(key)) params.getAll(key).forEach(value => url.searchParams.append(key, value));
      });
      link.setAttribute('href', url.pathname + url.search + url.hash);
    } catch (_) { /* The original native link remains usable. */ }
  }
  document.querySelectorAll('a[href]').forEach(preserveBookingQuery);
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.getAttribute('href').startsWith('#')) return;
    preserveBookingQuery(link);
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      if (link.matches('[data-meetings-direct]') && url.href === reviewCalendarUrl) {
        track('cta_click', { location: 'book_calendar' });
        return;
      }
      if (url.origin !== window.location.origin) return;
      const location = link.dataset.location || (link.closest('header') ? 'header' : 'page');
      if (pathOf(url) === '/book') track('cta_click', { location });
      else if (pathOf(url) === '/revenue-self-audit') track('audit_link_click', { location });
    } catch (_) {}
  });

  const toggle = document.querySelector('.conversion-menu-toggle');
  const navigation = document.getElementById('conversion-navigation');
  const header = document.querySelector('.conversion-header');
  if (toggle && navigation && header) {
    function setMenuOpen(open, restoreFocus) {
      navigation.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      header.toggleAttribute('data-conversion-menu-open', open);
      if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true', false));
    navigation.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false, false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) setMenuOpen(false, false);
    });
    const desktop = window.matchMedia('(min-width: 861px)');
    desktop.addEventListener?.('change', event => { if (event.matches) setMenuOpen(false, false); });
    setMenuOpen(false, false);
    header.classList.add('is-enhanced');
  }

  document.querySelectorAll('[data-fit-quote]').forEach(section => {
    const quote = typeof config.quote === 'string' ? config.quote.trim() : '';
    const attribution = typeof config.quoteAttribution === 'string' ? config.quoteAttribution.trim() : '';
    if (!quote || /^\[TODO\b/i.test(quote)) { section.hidden = true; return; }
    const inner = document.createElement('div');
    inner.className = 'fit-quote-inner';
    const blockquote = document.createElement('blockquote');
    blockquote.textContent = quote;
    inner.appendChild(blockquote);
    if (attribution) {
      const cite = document.createElement('cite');
      cite.textContent = attribution;
      inner.appendChild(cite);
    }
    section.replaceChildren(inner);
    section.hidden = false;
  });

  window.N8iVConversion = Object.freeze({ track });
})();
