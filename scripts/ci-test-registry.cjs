#!/usr/bin/env node
'use strict';
// A coverage inventory guarantees new test files cannot silently disappear.
// Historical unlisted tests are either mandatory verified tests or explicitly
// quarantined with a reason. Quarantine never authorizes guessed railway data.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const inventory = require('./ci-test-legacy.json');
if (inventory.version !== 2 || !Array.isArray(inventory.verified) ||
    !inventory.quarantined || typeof inventory.quarantined !== 'object') {
  throw new Error('Unsupported CI test inventory');
}
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = dir + '/' + entry.name;
    return entry.isDirectory() ? walk(rel) :
      /[.]test[.](?:cjs|js|mjs)$/.test(rel) ? [rel] : [];
  });
}
const tests = [...walk('tests'), ...walk('tools')].sort();
const yaml = fs.readdirSync(path.join(root, '.github/workflows'))
  .filter(n => /[.]ya?ml$/.test(n))
  .map(n => fs.readFileSync(path.join(root, '.github/workflows', n), 'utf8'))
  .join('\n');
const refs = [...yaml.matchAll(/\b(?:tests|tools)\/[A-Za-z0-9._*/-]+\.test\.(?:cjs|js|mjs)\b/g)]
  .map(m => m[0]);
function covered(file) {
  return refs.some(p => p === file ||
    (p.includes('*') && new RegExp('^' +
      p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(file)));
}
const quarantined = Object.keys(inventory.quarantined);
const owned = [...inventory.verified, ...quarantined];
if (new Set(owned).size !== owned.length)
  throw new Error('Duplicate test ownership in inventory');
const obsolete = owned.filter(file => !tests.includes(file) || covered(file));
if (obsolete.length) {
  console.error('Remove stale/duplicate CI test ownership:\n' + obsolete.join('\n'));
  process.exit(1);
}
for (const file of quarantined) {
  if (typeof inventory.quarantined[file] !== 'string' ||
      !inventory.quarantined[file].trim()) throw new Error('Missing quarantine reason: ' + file);
}
const newTests = tests.filter(file => !covered(file) && !owned.includes(file));
console.log('CI test inventory:', tests.length,
  'files;', inventory.verified.length, 'verified historic tests;',
  quarantined.length, 'quarantined;', newTests.length, 'new auto-discovered.');
function execute(paths) {
  if (!paths.length) return;
  const result = spawnSync(process.execPath,
    ['--test', '--test-concurrency=3', ...paths],
    { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status == null ? 1 : result.status);
}
if (process.argv.includes('--quarantine-sweep')) {
  console.log('Known quarantined tests (must not silently count as passing):');
  for (const file of quarantined) {
    console.log(' - ' + file + ': ' + inventory.quarantined[file]);
  }
  execute(quarantined);
} else {
  // A failure in ANY verified or newly created test blocks Pages publication.
  execute([...inventory.verified, ...newTests]);
}
