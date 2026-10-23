/* ChatGPT conversion pixel. ga-init applies the shared browser opt-out first. */
(function () {
  try {
    if (localStorage.getItem('n8iv_ga_opt_out') === '1') return;
  } catch (e) {}
  if (window.oaiq) return;
  !function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
  window.oaiq("init",{pixelId:"4iyfuQf433Lh2FDov5EPDM",debug:true});
})();
