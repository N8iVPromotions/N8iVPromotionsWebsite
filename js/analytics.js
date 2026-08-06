/* ================================================================
   N8iV analytics and campaign attribution
   ================================================================ */

const ATTRIBUTION_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term',
  'utm_content', 'utm_source_platform', 'gclid', 'gbraid', 'wbraid',
  'fbclid', 'msclkid', 'li_fat_id', 'ttclid', 'twclid', 'sccid'
];
const STORAGE_KEY = 'n8iv_attribution_v1';

function readStoredAttribution() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function writeStoredAttribution(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
  catch { /* Attribution still works for the current page if storage is unavailable. */ }
}

function cleanValue(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function getCurrentTouch() {
  const params = new URLSearchParams(location.search);
  const campaign = Object.fromEntries(
    ATTRIBUTION_KEYS.map(key => [key, cleanValue(params.get(key))]).filter(([, value]) => value)
  );
  const referrer = cleanValue(document.referrer, 1000);
  const internalReferrer = referrer && new URL(referrer).hostname === location.hostname;
  const hasCampaign = Object.keys(campaign).length > 0;

  if (!hasCampaign && (!referrer || internalReferrer)) return null;

  return {
    ...campaign,
    landing_page: `${location.pathname}${location.search}`.slice(0, 1500),
    referrer: internalReferrer ? '' : referrer,
    captured_at: new Date().toISOString()
  };
}

const stored = readStoredAttribution();
const currentTouch = getCurrentTouch();
const attribution = {
  first_touch: stored.first_touch || currentTouch || {
    utm_source: 'direct',
    utm_medium: 'none',
    landing_page: `${location.pathname}${location.search}`.slice(0, 1500),
    referrer: '',
    captured_at: new Date().toISOString()
  },
  latest_touch: currentTouch || stored.latest_touch || stored.first_touch || null
};
writeStoredAttribution(attribution);

window.N8iVAttribution = {
  getPayload() {
    return {
      attribution,
      conversion_page: `${location.pathname}${location.search}`.slice(0, 1500)
    };
  },
  track(name, data = {}) {
    window.va?.('event', { name, data });
  }
};

// Vercel Web Analytics queue and production script for a static site.
window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
const script = document.createElement('script');
script.defer = true;
script.src = '/_vercel/insights/script.js';
document.head.appendChild(script);
