const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const railway = JSON.parse(fs.readFileSync(path.join(root, 'data/core/railway_data.json'), 'utf8'));
const iconRelativePath = railway.lines.Fujikyu.presentation.icon;
const iconPath = path.resolve(root, iconRelativePath.replace(/^\.\.\//, ''));

test('Fujikyu uses the supplied dedicated railway symbol', () => {
  assert.equal(iconRelativePath, '../images/鉄道/富士急行/Fujikyu_Railway_Symbol.png');
  assert.ok(fs.existsSync(iconPath), `missing Fujikyu icon: ${iconPath}`);
  const png = fs.readFileSync(iconPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 600);
  assert.equal(png.readUInt32BE(20), 600);
  assert.equal(png[25], 6, 'the supplied asset should retain RGBA transparency');
});
