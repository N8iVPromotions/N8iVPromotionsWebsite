/* HubSpot tracking; ga-init runs first to apply the privacy-page opt-out. */
(function () {
  window._hsq = window._hsq || [];
  try {
    if (localStorage.getItem('n8iv_ga_opt_out') === '1') {
      window._hsq.push(['doNotTrack']);
      return;
    }
  } catch (e) {}
  if (document.getElementById('hs-script-loader')) return;
  var script = document.createElement('script');
  script.id = 'hs-script-loader';
  script.src = 'https://js-na2.hs-scripts.com/245566926.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
})();
