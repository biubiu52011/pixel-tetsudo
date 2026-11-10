'use strict';

/**
 * Audit gallery hygiene without guessing rolling-stock identity from filenames.
 * Usage: node tools/gallery-integrity-audit.cjs [--strict]
 * --strict fails on identical image bytes stored under different operators.
 * Duplicate images within one operator are reported for manual review.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const galleryRoot = path.join(root, 'images', '列车');
const errors = [];
const byHash = new Map();
const files = [];
const imageTypes = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) walk(absolute);
    else if (item.isFile() && imageTypes.has(path.extname(item.name).toLowerCase())) {
      const relative = path.relative(galleryRoot, absolute).split(path.sep).join('/');
      const operator = relative.split('/')[0];
      const bytes = fs.readFileSync(absolute);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');
      if (!operator || relative.split('/').length !== 2) errors.push({ type: 'invalid-directory-depth', path: relative });
      const record = { path: relative, operator, bytes: bytes.length };
      files.push(record);
      if (!byHash.has(digest)) byHash.set(digest, []);
      byHash.get(digest).push(record);
    }
  }
}

walk(galleryRoot);
const duplicates = [...byHash.values()].filter(group => group.length > 1).map(group => ({
  type: new Set(group.map(item => item.operator)).size > 1
    ? 'cross-operator-identical-bytes' : 'same-operator-identical-bytes',
  paths: group.map(item => item.path)
}));
const result = {
  totalImageFiles: files.length,
  identicalByteGroups: duplicates.length,
  crossOperatorGroups: duplicates.filter(item => item.type === 'cross-operator-identical-bytes').length,
  duplicates,
  errors
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
if (errors.length || (process.argv.includes('--strict') && result.crossOperatorGroups)) {
  process.exitCode = 1;
}
