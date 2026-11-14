#!/usr/bin/env node
'use strict';
// Publish only the static runtime. Source SQL, tests, audit evidence, and
// file:// compatibility bundles stay versioned in Git but are not Pages assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const spec = require('./page-scripts.json');
const output = path.join(root, '.pages-dist');

function checkPath(rel) {
  if (typeof rel !== 'string' || rel.includes('\0') ||
      rel.startsWith('/') || rel.split('/').includes('..') ||
      rel.split('/').includes('.') || rel.includes('\\')) {
    throw new Error('Unsafe Pages asset path: ' + String(rel));
  }
  return rel;
}
function collectSiteFiles() {
  const files = new Set();
  function add(rel) {
    rel = checkPath(rel);
    const absolute = path.join(root, rel);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error('Symlink is not a Pages asset: ' + rel);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute)) add(rel + '/' + name);
    } else if (stat.isFile()) files.add(rel);
    else throw new Error('Unexpected Pages asset type: ' + rel);
  }
  for (const rel of ['.nojekyll','index.html','404.html','pages','css','fonts','images','js','data/api']) add(rel);
  for (const rel of [
    'data/core/db-loader.js',
    'data/core/data-config-bundle.js',
    'data/core/railway_data.compact.json',
    'data/core/station_i18n.compact.json',
    'data/core/tourism_data.compact.json',
    'data/runinfo-web-snapshot.json'
  ]) add(rel);
  function expand(items, active = []) {
    for (const item of items) {
      if (item[0] !== '@') { add(item); continue; }
      const name = item.slice(1);
      if (active.includes(name) || !Array.isArray(spec.groups[name]))
        throw new Error('Invalid Pages script group: ' + name);
      expand(spec.groups[name], [...active,name]);
    }
  }
  expand(spec.head);
  for (const entries of Object.values(spec.pages)) expand(entries);
  for (const entries of Object.values(spec.lazy || {})) expand(entries);
  return files;
}
function build() {
  const files = collectSiteFiles();
  fs.rmSync(output, { recursive:true, force:true });
  let bytes = 0;
  for (const rel of [...files].sort()) {
    const src = path.join(root, rel), dst = path.join(output, rel);
    fs.mkdirSync(path.dirname(dst), {recursive:true});
    fs.copyFileSync(src, dst);
    bytes += fs.statSync(src).size;
  }
  console.log('Pages runtime artifact:', files.size, 'files,', (bytes/1048576).toFixed(2), 'MiB');
}
if (require.main === module) build();
module.exports = {collectSiteFiles, build};
