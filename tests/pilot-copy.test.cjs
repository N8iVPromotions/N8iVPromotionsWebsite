const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../b2b-attribution-pilot.html'), 'utf8');

test('pilot copy excludes unsupported deliverable promises', () => {
  for (const phrase of [
    'confidence range', 'stress test', 'budget split', 'designed test',
    'test design', 'scale, test, repair', 'each channel actually produced', 'how sure',
  ]) {
    assert.ok(!html.toLowerCase().includes(phrase), `Unexpected phrase: ${phrase}`);
  }
});

test('pilot meta description promises a Revenue Receipt without em or en dashes', () => {
  const description = html.match(/<meta name="description" content="([^"]*)"/);
  assert.ok(description, 'Meta description exists');
  assert.match(description[1], /Revenue Receipt/);
  assert.doesNotMatch(description[1], /[—–]/);
});

test('price card limits attributed revenue to payments linked to a tracked ad source', () => {
  const card = html.match(/<aside class="pilot-ticket">([\s\S]*?)<\/aside>/);
  assert.ok(card, 'Price card exists');
  assert.match(card[1], /<li>Attributed revenue only where a payment links to a tracked ad source<\/li>/);
});

const visibleText = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('pilot hero uses approved platform-neutral copy', () => {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  const lede = html.match(/<p class="pilot-lead">([\s\S]*?)<\/p>/);
  assert.ok(h1 && lede, 'Hero heading and lede exist');
  assert.equal(visibleText(h1[1]), 'Match your ad spend to real deals and payments.');
  assert.equal(visibleText(lede[1]), 'We review your ad, CRM, and payment records by hand. You see which revenue ties to a tracked ad source, which money is unresolved, and what to fix in your tracking.');
  for (const text of [h1[1], lede[1]]) assert.doesNotMatch(text, /Meta|HubSpot/);
});

test('data safety FAQ precedes readiness FAQ and explains access and retention', () => {
  const faq = html.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/);
  assert.ok(faq, 'FAQ exists');
  const answer = '<details><summary>Is my data safe?</summary><p>N8iV uses read-only access to your ad and CRM accounts and never changes your records, campaigns, or settings. Bank account numbers are cut to the last 4 digits, and original bank files are deleted 30 days after you accept your Receipt.</p></details>';
  assert.ok(faq[0].includes(answer));
  assert.ok(faq[0].indexOf(answer) < faq[0].indexOf("Will you tell us if we're not ready?"));
});

test('sample Receipt is illustrative and distinguishes matched from attributed revenue', () => {
  const receive = html.match(/<section[^>]*id="receive"[\s\S]*?<\/section>/);
  assert.ok(receive);
  assert.match(receive[0], /<\/ul>\s*<figure class="receipt-sample">/);
  const sample = receive[0].match(/<figure class="receipt-sample">([\s\S]*?)<\/figure>/);
  assert.ok(sample);
  assert.match(sample[1], /Illustrative sample, not client data/);
  assert.match(sample[1], /Revenue Receipt, sample month/);
  const rows = [...sample[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(row =>
    [...row[1].matchAll(/<t[hd]\b[^>]*>(.*?)<\/t[hd]>/g)].map(cell => cell[1]));
  assert.deepEqual(rows, [
    ['Payment', 'Amount', 'Status', 'Reason'],
    ['Invoice 1042, bank transfer', '$4,800', 'Matched', 'Linked to deal Brand refresh. Source: tracked paid social campaign.'],
    ['Invoice 1047, card', '$1,250', 'Matched', 'Linked to deal Q4 retainer. Source: organic search, not paid.'],
    ['Bank deposit, no reference', '$2,000', 'Unresolved', 'No invoice or deal number. Payer needs confirming.'],
    ['Owner transfer', '$5,000', 'Excluded', 'Not a customer payment.'],
  ]);
  assert.ok(sample[1].includes('Matched $6,050. Unresolved $2,000. Excluded $5,000. Attributed to a tracked ad source: $4,800.'));
  assert.ok(sample[1].includes('<figcaption>A real Receipt lists every payment in the month, with the evidence behind each status.</figcaption>'));
  assert.doesNotMatch(sample[1], /ed-accent/);
});

test('pilot and supporting pages use a complete month instead of a 30-day window', () => {
  for (const file of ['b2b-attribution-pilot.html', 'index.html', 'about.html', 'contact.html']) {
    const page = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(page, /30-day/i, file);
    assert.match(page, /your last complete month of ad spend/i, file);
  }
});

test('changed pilot visible copy contains no em or en dashes', () => {
  const regions = [
    /<header class="pilot-hero[\s\S]*?<\/header>/,
    /<section[^>]*id="receive"[\s\S]*?<\/section>/,
    /<section[^>]*id="how-it-works"[\s\S]*?<\/section>/,
    /<section[^>]*id="faq"[\s\S]*?<\/section>/,
    /<section class="pilot-cta">[\s\S]*?<\/section>/,
  ];
  for (const pattern of regions) {
    const region = html.match(pattern);
    assert.ok(region, `Changed region exists: ${pattern}`);
    assert.doesNotMatch(visibleText(region[0]), /[—–]|&(?:mdash|ndash|#(?:8211|8212)|#x201[34]);/i);
  }
});
