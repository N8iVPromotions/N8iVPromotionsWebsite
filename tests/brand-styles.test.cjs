const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Checking every declaration also catches gradient variables used by buttons.
test('brand styles use flat fills; gradients are limited to functional masks', () => {
  const root = path.join(__dirname, '..');
  const files = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css'));
  const sources = files.map(f => [f, fs.readFileSync(path.join(root, 'css', f), 'utf8')]);
  for (const dir of ['', 'blog']) {
    for (const file of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(root, dir, file), 'utf8');
      for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) sources.push([file, match[1]]);
    }
  }
  for (const [file, source] of sources) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /ai-drift|ai-glow/, file);
    for (const declaration of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)) {
      if (/gradient\s*\(/i.test(declaration[2])) {
        assert.match(declaration[1], /^(?:-webkit-)?mask-image$/, `${file}: ${declaration[0]}`);
      }
    }
  }
});
