'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

const railway = JSON.parse(fs.readFileSync(
  path.join(root, 'data/core/railway_data.compact.json'), 'utf8'
));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(
  path.join(root, 'js/translations.js'), 'utf8'
), context, { timeout: 5000 });

for (const lang of ['en', 'zh', 'ja', 'ko']) {
  const labels = context.window.translations[lang];
  assert.ok(labels, lang + ': translation dictionary missing');
  for (const operator of new Set(Object.values(railway.lines)
    .map(line => line.operator).filter(Boolean))) {
    const key = 'op.' + operator;
    assert.ok(labels[key] && labels[key] !== key,
      lang + ': operator key leaked into the filter: ' + operator);
  }
}

console.log('Operator filter labels: PASS');
