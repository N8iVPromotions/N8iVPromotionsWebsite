/* Google Analytics 4 bootstrap. Loaded synchronously in <head> so the
   opt-out flag (/privacy?ga_optout=1) is set before the config call. */
(function () {
  try {
    var params = new URLSearchParams(location.search);
    if (params.get('ga_optout') === '1') { localStorage.setItem('n8iv_ga_opt_out', '1'); }
    else if (params.get('ga_optout') === '0') { localStorage.removeItem('n8iv_ga_opt_out'); }
    if (localStorage.getItem('n8iv_ga_opt_out') === '1') { window['ga-disable-G-HXEBK6Y9LJ'] = true; }
  } catch (e) {}
})();

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-HXEBK6Y9LJ');
