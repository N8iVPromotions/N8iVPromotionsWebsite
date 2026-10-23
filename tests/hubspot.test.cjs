const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const { submitToHubSpot } = require('../api/_lib/hubspot');
const handlers = { audit: require('../api/audit-request'), self: require('../api/self-audit') };
const hutk = 'abcdef0123456789ABCDEF0123456789';
let ip = 0;
function setup(t, { failHubspot, failOwner, failNotice, failVisitor, verified = true } = {}) {
  const calls = [], logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  for (const key of ['RESEND_API_KEY', 'TURNSTILE_SECRET_KEY', 'HUBSPOT_FAILURE_NOTIFY', 'HUBSPOT_PORTAL_ID', 'HUBSPOT_FORM_GUID']) {
    const old = process.env[key];
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  process.env.RESEND_API_KEY = 'test-only'; process.env.TURNSTILE_SECRET_KEY = 'test-only';
  delete process.env.HUBSPOT_FAILURE_NOTIFY; delete process.env.HUBSPOT_PORTAL_ID; delete process.env.HUBSPOT_FORM_GUID;
  t.mock.method(global, 'fetch', async (url, options) => {
    const body = url.includes('siteverify') ? null : JSON.parse(options.body);
    calls.push({ url, options, body });
    if (url.includes('siteverify')) return { ok: true, json: async () => ({ success: verified }) };
    if (url.includes('api.hsforms.com')) {
      if (failHubspot === 'timeout') {
        // Exercise the actual abort signal, shortening only its timer in this test.
        return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
      }
      return { ok: !failHubspot, status: failHubspot ? 500 : 200 };
    }
    assert.equal(url, 'https://api.resend.com/emails');
    const failed = body.subject === 'HubSpot handoff failed' ? failNotice : body.subject.startsWith('Your Revenue') ? failVisitor : failOwner;
    return { ok: !failed, status: failed ? 500 : 200, text: async () => 'provider failure' };
  });
  return { calls, logs };
}
async function invoke(kind, extra = {}) {
  const body = { firstName: 'Jane', lastName: 'Doe', name: 'Jane Doe', email: 'jane@example.invalid', company: 'Example', challenge: 'Help with attribution', answers: Array(15).fill(2), followUpConsent: true, 'cf-turnstile-response': 'verified', hutk, pageUri: 'https://example.invalid/contact', pageName: 'Contact', ...extra };
  const res = { status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, setHeader() {}, end() {} };
  await handlers[kind]({ method: 'POST', headers: { 'x-real-ip': `192.0.2.${++ip}` }, body }, res);
  return res;
}
for (const value of [hutk, 'bad', 'a'.repeat(33), undefined]) test(`hutk validation: ${value}`, async t => {
  const { calls } = setup(t);
  assert.equal((await submitToHubSpot({ fields: { email: 'test@example.invalid' }, hutk: value })).ok, true);
  assert.equal(calls[0].body.context.hutk, value === hutk ? hutk : undefined);
});
for (const kind of ['audit', 'self']) {
  test(`${kind}: handoff fields, context, and ordering`, async t => {
    const { calls } = setup(t); const res = await invoke(kind);
    assert.equal(res.code, 200);
    const hs = calls.find(c => c.url.includes('api.hsforms.com'));
    assert.equal(hs.url, 'https://api.hsforms.com/submissions/v3/integration/submit/245566926/49fb0c89-a865-4f99-85bf-91de60556c61');
    const expected = kind === 'audit' ? { email: 'jane@example.invalid', firstname: 'Jane', lastname: 'Doe', company: 'Example', message: 'Help with attribution' } : { email: 'jane@example.invalid', firstname: 'Jane Doe', company: 'Example', message: 'Revenue Self-Audit score 67/100' };
    assert.deepEqual(hs.body.fields, Object.entries(expected).map(([name, value]) => ({ objectTypeId: '0-1', name, value })));
    assert.deepEqual(hs.body.context, { hutk, pageUri: 'https://example.invalid/contact', pageName: 'Contact', ipAddress: `192.0.2.${ip}` });
    assert.ok(calls.indexOf(hs) > calls.findIndex(c => c.url.includes('resend')));
  });
  test(`${kind}: opt-out skips handoff`, async t => {
    const { calls } = setup(t); assert.equal((await invoke(kind, { hubspotOptOut: true })).code, 200);
    assert.equal(calls.some(c => c.url.includes('hsforms')), false);
  });
  for (const failure of ['500', 'timeout']) test(`${kind}: ${failure} still succeeds and notifies without visitor details`, async t => {
    const { calls, logs } = setup(t, { failHubspot: failure });
    if (failure === 'timeout') t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 2500); const controller = new AbortController(); setTimeout(() => controller.abort(), 5); return controller.signal; });
    assert.equal((await invoke(kind)).code, 200);
    const notice = calls.find(c => c.body?.subject === 'HubSpot handoff failed');
    assert.ok(notice); assert.match(notice.body.text, /Example/);
    assert.doesNotMatch(JSON.stringify(notice.body), /jane@example|Jane|Help with attribution|abcdef/);
    assert.doesNotMatch(logs.join('\n'), /jane@example|Jane|Example|abcdef/);
  });
  test(`${kind}: operator failure remains 500 without handoff`, async t => {
    const { calls } = setup(t, { failOwner: true }); assert.equal((await invoke(kind)).code, 500);
    assert.equal(calls.some(c => c.url.includes('hsforms')), false);
  });
  test(`${kind}: failed Turnstile prevents email and handoff`, async t => {
    const { calls } = setup(t, { verified: false }); assert.equal((await invoke(kind)).code, 400); assert.equal(calls.length, 1);
  });
}
test('self-audit without consent never hands off', async t => {
  const { calls } = setup(t); assert.equal((await invoke('self', { followUpConsent: false })).code, 200);
  assert.equal(calls.some(c => c.url.includes('hsforms')), false);
});
test('visitor email failure still hands off after owner delivery', async t => {
  const { calls } = setup(t, { failVisitor: true }); const res = await invoke('self');
  assert.equal(res.code, 200); assert.equal(res.body.emailDelivered, false); assert.ok(calls.some(c => c.url.includes('hsforms')));
});
test('notification failure cannot fail a visitor request', async t => {
  setup(t, { failHubspot: '500', failNotice: true }); assert.equal((await invoke('audit')).code, 200);
});
test('failure notification can be disabled', async t => {
  const { calls } = setup(t, { failHubspot: '500' }); process.env.HUBSPOT_FAILURE_NOTIFY = 'false';
  assert.equal((await invoke('audit')).code, 200); assert.equal(calls.filter(c => c.url.includes('resend')).length, 1);
});
for (const optOut of [true, false, 'blocked']) test(`loader opt-out=${optOut}`, () => {
  const scripts = [], window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/hubspot-init.js'), 'utf8'), { window, localStorage: { getItem() { if (optOut === 'blocked') throw Error(); return optOut === true ? '1' : null; } }, document: { getElementById: () => null, createElement: () => ({}), head: { appendChild: s => scripts.push(s) } } });
  if (optOut === true) { assert.equal(scripts.length, 0); assert.equal(JSON.stringify(window._hsq), '[["doNotTrack"]]'); }
  else assert.deepEqual(scripts[0], { id: 'hs-script-loader', src: 'https://js-na2.hs-scripts.com/245566926.js', async: true, defer: true });
});
test('every public HTML includes the loader after existing opt-out initialization', () => {
  for (const dir of ['', 'blog']) for (const name of fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, dir, name), 'utf8'); assert.equal((html.match(/src="\/js\/hubspot-init.js"/g) || []).length, 1, name);
    if (html.includes('ga-init.js')) assert.ok(html.indexOf('ga-init.js') < html.indexOf('hubspot-init.js'));
  }
});

test('CSP preserves original directives and adds only specified hosts', () => {
  const original = "default-src 'self'; script-src 'self' https://*.googletagmanager.com https://challenges.cloudflare.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.facebook.com https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://challenges.cloudflare.com https://www.facebook.com https://connect.facebook.net; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
  const additions = {
    'script-src': 'https://*.hs-scripts.com https://*.hs-analytics.net https://*.hs-banner.com https://*.hscollectedforms.net https://*.hsadspixel.net',
    'connect-src': 'https://*.hubspot.com https://*.hs-banner.com https://*.hscollectedforms.net https://*.hs-analytics.net https://*.hsforms.com',
    'img-src': 'https://*.hubspot.com https://track.hubspot.com https://*.hsforms.com',
    'frame-src': 'https://*.hubspot.com',
  };
  const actual = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  const withoutOpenAI = actual.replace(' https://bzrcdn.openai.com', '').replace(' https://bzr.openai.com', '');
  assert.equal(withoutOpenAI, original.split('; ').map(d => d + (additions[d.split(' ')[0]] ? ' ' + additions[d.split(' ')[0]] : '')).join('; '));
});
for (const file of ['js/main.js', 'js/self-audit.js']) {
  for (const optOut of [true, false]) test(`${file}: browser cookie and page context, opt-out=${optOut}`, () => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const start = source.indexOf('    let hubspotOptOut = false;');
    const end = source.indexOf('\n    }', source.indexOf('    } else {', start)) + 6;
    const data = {};
    vm.runInNewContext(source.slice(start, end), { data, localStorage: { getItem: () => optOut ? '1' : null }, document: { cookie: `other=value; hubspotutk=${hutk}; next=value`, title: 'Page title' }, location: { href: 'https://example.invalid/page' } });
    assert.deepEqual(data, optOut ? { hubspotOptOut: true } : { hutk, pageUri: 'https://example.invalid/page', pageName: 'Page title' });
  });
}
