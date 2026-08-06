/* ================================================================
   Vercel Web Analytics
   Initializes Vercel Analytics for the site
   ================================================================ */

// Static HTML sites cannot import the package from node_modules in the browser.
// Load Vercel's production analytics endpoint instead.
const script = document.createElement('script');
script.defer = true;
script.src = '/_vercel/insights/script.js';
document.head.appendChild(script);
