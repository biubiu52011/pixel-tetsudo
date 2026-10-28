// Bundle the static data/core config tables into one file to reduce <script> requests.
// Order follows home.html's existing relative load order. Pure data + small IIFEs,
// so concatenation is safe as long as order is preserved.
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const order = [
  'transfer-hints.js',
  'runtime-config.js',
  'platform-data.js',
  'train-type-defs.js',
];

function buildBundle() {
  let out = '/* Pixel Tetsudo - Data Config Bundle (auto-merged).\n' +
    ' * Merged from: ' + order.join(', ') + '.\n' +
    ' * Do not edit here; edit the source files and re-run node data/core/gen-config-bundle.js\n */\n';
  for (const f of order) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    let src = fs.readFileSync(p, 'utf8');
    // strip BOM
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
    out += '\n// ===== ' + f + ' =====\n' + src + '\n';
  }
  return out;
}

function writeBundle(expected = buildBundle()) {
  const target = path.join(dir, 'data-config-bundle.js');
  fs.writeFileSync(target, expected, 'utf8');
  console.log('wrote data-config-bundle.js (', (expected.length / 1024).toFixed(0), 'KB )');
}

function checkBundle(expected = buildBundle()) {
  const target = path.join(dir, 'data-config-bundle.js');
  const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (actual !== expected) {
    console.error('data-config-bundle.js is stale; run node data/core/generate-all.js');
    return false;
  }
  console.log('data-config-bundle.js is synchronized');
  return true;
}

function main() {
  const expected = buildBundle();
  if (process.argv.includes('--check')) {
    if (!checkBundle(expected)) process.exitCode = 1;
    return;
  }
  writeBundle(expected);
}

if (require.main === module) main();
module.exports = { buildBundle, writeBundle, checkBundle, order };
