'use strict';
// A read-only integrity gate for the existing, single PNG number-band inventory
// and its evidence-triage derivative. Never infers train numbers from car or
// formation identifiers and never changes runtime selection priority.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const INVENTORY = 'data/audits/png-first-number-band-inventory-20261117.csv';
const TRIAGE = 'data/audits/png-unmapped-source-triage-20261118.csv';

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some(x => x !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  assert.equal(quoted, false, 'unfinished CSV quoted field');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const inventory = parseCsv(fs.readFileSync(INVENTORY, 'utf8'));
const triage = parseCsv(fs.readFileSync(TRIAGE, 'utf8'));
const inventoryRows = inventory.slice(1);
const triageRows = triage.slice(1);
const missingRows = inventoryRows.filter(row => row[8] === '无号段');
const groupedMissing = new Map(missingRows.map(row => [row[2], row]));
const groupedTriage = new Map(triageRows.map(row => [row[2], row]));

function tally(rows, index) {
  const result = {};
  for (const row of rows) result[row[index]] = (result[row[index]] || 0) + 1;
  return result;
}

// JR51/JR54/Private23 add dated available/R3 references;
// JR52/JR53/JR55/JR56/JR57 add reviewed/R0 official-number sources.
// None establishes a real-day consist or auto-image release.
test('triage covers exactly every unmapped gallery PNG, with no invented band', () => {
  assert.equal(inventory[0].length, 9);
  assert.equal(triage[0].length, 13);
  assert.ok(inventoryRows.every(row => row.length === 9));
  assert.ok(triageRows.every(row => row.length === 13));
  assert.equal(new Set(inventoryRows.map(row => row[2])).size, 601);
  assert.equal(missingRows.length, triageRows.length);
  assert.equal(groupedMissing.size, missingRows.length);
  assert.equal(groupedTriage.size, triageRows.length);
  assert.deepEqual([...groupedTriage.keys()].sort(), [...groupedMissing.keys()].sort());
  for (const [path, row] of groupedTriage) {
    const source = groupedMissing.get(path);
    assert.equal(row[0], source[0], path + ': category drift');
    assert.equal(row[1], source[1], path + ': operator drift');
    assert.ok(source.slice(3, 8).every(value => value === ''),
      path + ': unresolved PNG must have no speculative number interval');
    assert.ok(path.startsWith('images/列车/') && path.endsWith('.png'));
  }
});

test('unmapped evidence groups remain qualified and never become proof of a PNG mapping', () => {
  assert.deepEqual(tally(triageRows, 0), tally(missingRows, 0),
    'unmapped operator categories must equal the current gallery inventory');
  const assetCounts = tally(triageRows, 3);
  assert.equal((assetCounts.available || 0) + (assetCounts.review || 0), triageRows.length);
  const groups = tally(triageRows, 9);
  assert.equal(Object.keys(groups).length, 5);
  const reviewGroups = (groups['R0_先验PNG文件与实车状态'] || 0) +
    (groups['R0_先核实未来/历史运营资格'] || 0);
  assert.equal(reviewGroups, assetCounts.review || 0,
    'all review assets must retain their required image/operating-era triage');
  assert.equal(Object.values(groups).reduce((sum, count) => sum + count, 0), triageRows.length);
  for (const row of triageRows) {
    assert.ok(['available', 'review'].includes(row[3]));
    assert.ok(['是', '否'].includes(row[6]));
    assert.ok(row[10], row[2] + ': missing required evidence description');
    if (row[3] === 'review') {
      assert.ok(row[9].startsWith('R0_'),
        row[2] + ': review-only image must first pass material/service review');
    }
    if (row[9].startsWith('R2_')) {
      assert.ok(row[7] || row[8], row[2] + ': roster evidence group lacks car/formation');
    }
  }
});
