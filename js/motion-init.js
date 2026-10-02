/* Runs in <head> before first paint so editorial animations start in the right state. */
(function(){var d=document.documentElement;d.classList.add('ed-js');try{var m=localStorage.getItem('n8iv_motion');if(m==='off'||(m!=='on'&&matchMedia('(prefers-reduced-motion: reduce)').matches))d.classList.add('motion-off');}catch(e){}})();
