const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const pilot = read('pilot.html');
const homepage = read('index.html');
const booking = read('book.html');
const routes = JSON.parse(read('vercel.json'));

test('paid visitors see the price and booking action before the receipt', () => {
  assert.match(pilot, /Find out which ads actually paid off\./);
  assert.match(pilot, /noindex,\s*follow/i);
  const firstBook = pilot.indexOf('href="/book"');
  assert.ok(firstBook > pilot.indexOf('$750'));
  assert.ok(pilot.indexOf('$750') > 0);
  assert.ok(firstBook < pilot.indexOf('$18,400'));
  const header = pilot.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(header, 'The pilot has a logo header');
  assert.doesNotMatch(header[1], /<nav\b|<a\b/i);
  assert.doesNotMatch(pilot, /href="\/revenue-self-audit"/i);
  const footer = pilot.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  assert.ok(footer, 'The pilot has a legal footer');
  assert.deepEqual(Array.from(footer[1].matchAll(/href="([^"]+)"/g), m => m[1]), ['/privacy', '/terms']);
  assert.match(pilot, /data-location="pilot_sticky"/);
});

test('both receipts clearly identify the illustrative data and optional quote', () => {
  for (const page of [homepage, pilot]) {
    assert.match(page, /Illustrative sample, not client data\./i);
    for (const figure of ['$18,400', '$41,250', '2.2x']) assert.ok(page.includes(figure));
    assert.match(page, /data-fit-quote/);
    assert.doesNotMatch(page, /\[TODO: real client quote\]/);
    assert.match(page, /\[TODO: X\]/);
  }
});

test('the three primary routes use the booking destination and sentence punctuation', () => {
  for (const page of [homepage, pilot, booking]) {
    assert.match(page, /<main\b[^>]*\bid="main"/);
    assert.doesNotMatch(page, /href="\/contact(?:[?#"]|\.html)/);
    const visible = page.replace(/<!--[\s\S]*?-->|<[^>]+>/g, ' ');
    assert.doesNotMatch(visible, /[—–]|&(?:mdash|ndash|#(?:8211|8212));/i);
  }
  assert.match(booking, /Book your fit call/);
});

test('legacy routes use HTTP 301 and only indexable pages appear in the sitemap', () => {
  for (const [source, destination] of Object.entries({
    '/b2b-attribution-pilot': '/pilot', '/services': '/', '/use-cases': '/',
    '/about': '/', '/contact': '/book', '/blog/:slug': '/insights/:slug'
  })) {
    assert.ok(routes.redirects.some(r => r.source === source && r.destination === destination && r.statusCode === 301), source);
  }
  const locations = Array.from(read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g), m => new URL(m[1]).pathname);
  assert.ok(locations.includes('/book'));
  assert.ok(locations.includes('/revenue-self-audit'));
  for (const old of ['/services', '/use-cases', '/about', '/contact', '/b2b-attribution-pilot', '/pilot']) {
    assert.ok(!locations.includes(old), old);
  }
});
