/* Meta Pixel base code. Honors the same opt-out flag as Google Analytics. */
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
try { if (localStorage.getItem('n8iv_ga_opt_out') === '1') { fbq('consent', 'revoke'); } } catch (e) {}
fbq('init', '1752381592484843');
fbq('track', 'PageView');
