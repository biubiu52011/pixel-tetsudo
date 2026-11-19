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
// JR-06 is blocked on train-number-to-unique-artwork evidence, NOT PNG bytes.
// Keep the original source tables and inventories as the only mapping truth.
const JR06_NAMES = [
 '223系_H2','223系_H6','223系_KAH','223系_KIL','223系_MORI',
 '225系_V1','225系','227系_WK','271系','281系','283系_K',
 '287系_K','287系_KRM','287系_SKR','287系_V1'
];
const JR06_PATHS = JR06_NAMES.map(n =>
 'images/列车/JR西日本/JR西日本_' + n + '.png');

function crc32(bytes,from,to) {
 let crc = 0xffffffff;
 for(let i=from;i<to;i++) {
   crc ^= bytes[i];
   for(let j=0;j<8;j++)
     crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
 }
 return (crc ^ 0xffffffff) >>> 0;
}
test('JR-06 all 15 review PNG byte streams stay valid and remain numberless', () => {
 assert.equal(new Set(JR06_PATHS).size,15);
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 for(const path of JR06_PATHS) {
   const inventory=groupedMissing.get(path),source=groupedTriage.get(path);
   assert.ok(inventory,path+': was accidentally promoted to pure-number PNG');
   assert.ok(source,path+': missing review triage record');
   assert.equal(inventory[8],'无号段');
   assert.equal(source[3],'review',path+': vehicle/paint is NOT approved');
   assert.equal(source[4],'native_png',path+': byte verification regressed');
   assert.equal(source[5],'review');
   assert.equal(source[6],'否');
   assert.equal(source[7],'');
   assert.equal(source[8],'');
   assert.ok(source[9].startsWith('R0_'),path+': still requires vehicle evidence');
   const bytes=fs.readFileSync(path);
   assert.ok(bytes.subarray(0,8).equals(signature),path+': bad PNG signature');
   assert.equal(bytes.readUInt32BE(8),13,path+': non-standard IHDR');
   assert.equal(bytes.toString('ascii',12,16),'IHDR',path+': no IHDR');
   assert.equal(bytes.readUInt32BE(16),82,path+': unexpected width');
   assert.equal(bytes.readUInt32BE(20),98,path+': unexpected height');
   let pos=8,last='';
   while(pos<bytes.length) {
     assert.ok(pos+12<=bytes.length,path+': truncated chunk header');
     const size=bytes.readUInt32BE(pos),end=pos+size+12;
     assert.ok(size<=bytes.length&&end<=bytes.length,path+': truncated PNG chunk');
     const checksum=bytes.readUInt32BE(end-4);
     assert.equal(crc32(bytes,pos+4,end-4),checksum,path+': invalid CRC');
     last=bytes.toString('ascii',pos+4,pos+8);
     pos=end;
   }
   assert.equal(last,'IEND',path+': missing IEND');
   assert.equal(pos,bytes.length,path+': trailing bytes');
 }
});

test('JR-06 287 anniversary 2069M conflict stays a historical review, not a static PNG choice', () => {
 const names=['287系_KRM','287系_SKR'];
 const no='2069M';
 const candidates=names.map(n=>'images/列车/JR西日本/JR西日本_'+n+'.png');
 for(const p of candidates) {
   const row=groupedTriage.get(p);
   assert.ok(row&&row[9].startsWith('R0_'));
   assert.equal(groupedMissing.get(p)[8],'无号段',
     p+': a dated observation cannot become all-date train-number mapping');
 }
 const source=fs.readFileSync(
   'supabase/migrations/20261119220000_jr06_287_wrap_candidates_2069m_conflict_notes_only.sql',
   'utf8');
 assert.match(source,/2026-08-22\s+HC603/);
 assert.match(source,/2026-08-30\s+HC602/);
 assert.match(source,/2069M/);
 assert.doesNotMatch(source,/INSERT\s+INTO\s+public\.published_train_png_number_ranges/i);
 const frontend=require('../tools/build-train-number-png-catalog.cjs').getRows();
 assert.ok(frontend.every(x=>!candidates.some(p=>
   String(x.pngPath||'').endsWith(p))), 'frontend number rules must not claim either review PNG');
 // In particular, the generic 287 gallery and these two liveries are
 // different assets; a single public service number is not a stable carset.
 assert.equal(no,'2069M');
});
