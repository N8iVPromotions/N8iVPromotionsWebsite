const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/oai-pixel.js'), 'utf8');

for (const optOut of [false, true, 'blocked']) {
  test(`OpenAI pixel respects browser opt-out: ${optOut}`, () => {
    const scripts = [];
    const window = {};
    const context = vm.createContext({ window,
      localStorage: { getItem() { if (optOut === 'blocked') throw Error('Unavailable'); return optOut ? '1' : null; } },
      document: { createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore: s => scripts.push(s) } }] }
    });
    vm.runInContext(source, context);
    vm.runInContext(source, context);
    if (optOut === true) {
      assert.equal(scripts.length, 0);
      assert.equal(window.oaiq, undefined);
    } else {
      assert.equal(scripts.length, 1);
      assert.equal(scripts[0].src, 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
      assert.equal(scripts[0].async, 1);
      assert.equal(window.oaiq.q.length, 1);
      assert.equal(window.oaiq.q[0][0], 'init');
      assert.equal(window.oaiq.q[0][1].pixelId, '4iyfuQf433Lh2FDov5EPDM');
      assert.equal(window.oaiq.q[0][1].debug, true);
    }
  });
}

test('every public page loads the pixel once, after opt-out initialization', () => {
  for (const dir of ['', 'blog']) for (const name of fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, dir, name), 'utf8');
    assert.equal((html.match(/src="\/js\/oai-pixel.js"/g) || []).length, 1, name);
    if (html.includes('ga-init.js')) assert.ok(html.indexOf('ga-init.js') < html.indexOf('oai-pixel.js'), name);
  }
});

test('CSP permits the exact SDK and reporting hosts without inline script permissions', () => {
  const csp = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(csp.split('; ').map(d => { const [key, ...values] = d.split(' '); return [key, values]; }));
  assert.ok(directives['script-src'].includes('https://bzrcdn.openai.com'));
  assert.ok(directives['connect-src'].includes('https://bzr.openai.com'));
  assert.ok(directives['connect-src'].includes('https://bzrcdn.openai.com'));
  assert.ok(directives['img-src'].includes('https://bzr.openai.com'));
  assert.ok(!directives['script-src'].includes("'unsafe-inline'"));
});

test('CSP permits the hosts gtag.js sends GA4 and Google Ads hits to', () => {
  const csp = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(csp.split('; ').map(d => { const [key, ...values] = d.split(' '); return [key, values]; }));
  // *.analytics.google.com does not cover the bare host gtag.js posts to.
  for (const host of ['https://analytics.google.com', 'https://www.google.com', 'https://stats.g.doubleclick.net']) {
    assert.ok(directives['connect-src'].includes(host), host);
  }
  for (const host of ['https://www.google.com', 'https://stats.g.doubleclick.net']) assert.ok(directives['img-src'].includes(host), host);
});
