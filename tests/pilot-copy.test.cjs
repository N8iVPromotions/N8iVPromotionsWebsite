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

test('price card limits attributed revenue to payments linked to tracked deals', () => {
  const card = html.match(/<aside class="pilot-ticket">([\s\S]*?)<\/aside>/);
  assert.ok(card, 'Price card exists');
  assert.match(card[1], /<li>Attributed revenue where payments link to tracked deals<\/li>/);
});
