'use strict';

// 校验共享车型目录中的 PNG 路径实际存在且文件头有效。
// 不按文件名判定车型、批次、涂装或具体编组。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogFile = path.join(root, 'js', 'train-vehicle.js');
const source = fs.readFileSync(catalogFile, 'utf8');
const references = [...new Set(
  [...source.matchAll(/(?:\.\.\/|\/)?images\/列车\/[^"'\r\n]+?\.png/g)]
    .map(match => match[0].replace(/^(?:\.\.\/|\/)/, ''))
)];
assert.ok(references.length >= 500,
  'canonical artwork inventory unexpectedly shrank; review intended asset removals');

const missing = [];
const invalid = [];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const relative of references) {
  const segments = relative.split('/');
  if (segments.length !== 4 || segments.some(segment => segment === '..' || segment === '.')) {
    invalid.push(relative + ': invalid relative path');
    continue;
  }
  const abs = path.join(root, ...segments);
  if (!fs.existsSync(abs)) {
    missing.push(relative);
    continue;
  }
  const fd = fs.openSync(abs, 'r');
  const header = Buffer.alloc(24);
  try {
    if (fs.readSync(fd, header, 0, header.length, 0) !== header.length ||
        !header.subarray(0, 8).equals(pngSignature)) {
      invalid.push(relative + ': invalid PNG signature');
      continue;
    }
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    if (!width || !height || width > 10000 || height > 10000)
      invalid.push(relative + ': invalid PNG dimensions');
  } finally {
    fs.closeSync(fd);
  }
}

assert.deepEqual(missing, [], 'registered PNG missing from repository');
assert.deepEqual(invalid, [], 'registered PNG failed format/path checks');
console.log('train vehicle asset integrity: PASS (' + references.length + ' unique registered PNG paths)');
