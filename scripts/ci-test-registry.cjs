#!/usr/bin/env node
'use strict';
// New .test files that are not explicitly referenced by a workflow are run
// automatically. Pre-existing coverage gaps stay explicit and auditable.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = require('./ci-test-legacy.json');
if (baseline.version !== 1 || !Array.isArray(baseline.legacyUngated)) {
  throw new Error('Unsupported CI test inventory');
}
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = dir + '/' + entry.name;
    if (entry.isDirectory()) return walk(rel);
    return /[.]test[.](?:cjs|js|mjs)$/.test(rel) ? [rel] : [];
  });
}
const tests = [...walk('tests'), ...walk('tools')].sort();
const yaml = fs.readdirSync(path.join(root, '.github/workflows'))
  .filter(n => /[.]ya?ml$/.test(n))
  .map(n => fs.readFileSync(path.join(root, '.github/workflows', n), 'utf8'))
  .join('\n');
const references = [...yaml.matchAll(/\b(?:tests|tools)\/[A-Za-z0-9._*/-]+\.test\.(?:cjs|js|mjs)\b/g)]
  .map(m => m[0]);
function covered(file) {
  return references.some(p => p === file ||
    (p.includes('*') && new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(file)));
}
const legacy = new Set(baseline.legacyUngated);
if (legacy.size !== baseline.legacyUngated.length) throw new Error('Repeated legacy test');
const stale = [...legacy].filter(file => !tests.includes(file) || covered(file));
if (stale.length) {
  console.error('Prune resolved legacy test exclusions:\n' + stale.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--legacy-sweep')) {
  console.log('Running historical CI coverage gaps:', baseline.legacyUngated.length);
  const child = spawnSync(process.execPath,
    ['--test', '--test-concurrency=3', ...baseline.legacyUngated],
    { cwd: root, stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exit(child.status || 0);
}
const newTests = tests.filter(file => !legacy.has(file) && !covered(file));
console.log('Test inventory:', tests.length, 'files;', tests.length - legacy.size - newTests.length,
  'declared;', legacy.size, 'legacy gaps;', newTests.length, 'new auto-discovered tests.');
if (newTests.length) {
  console.log('Automatically running:\n' + newTests.join('\n'));
  const child = spawnSync(process.execPath,
    ['--test', '--test-concurrency=3', ...newTests], { cwd: root, stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exit(child.status || 0);
}
