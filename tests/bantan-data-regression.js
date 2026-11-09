// Bantan Line canonical data regression. Run: node tests/bantan-data-regression.js
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '..', 'data', 'core');
const data = require(path.join(base, 'railway_data.json'));
const i18n = require(path.join(base, 'station_i18n.json'));
const l = data.lines.Bantan;
const ids = l.stations;
const expected = ['Himeji','Kyou-Kuchi','Nozato','To-Hori','Inpun-No','Kaori-Ro',
  'Mizoguchi','Fukuzaki','Kan-Chi','Tsurui','Shinno','Teramae','Hase',
  'Ikuno','Arai','Ao-Kura','Takeda','Wadayama'];
assert.deepEqual(ids, expected, 'Official 18-station order must stay intact');
assert.equal(l.presentation.code, 'J');
assert.equal(l.color, '#b1184b');
assert.equal(l.presentation.color, l.color);
assert.equal(l.durations.length, ids.length-1);
assert.equal(l.durationTotalMin, l.durations.reduce((a,b)=>a+b,0));
assert.equal(i18n['To-Hori'].en, 'Tohori');
assert.equal(i18n['Kan-Chi'].en, 'Amaji');
assert(l.transferStations.some(t => t.station==='Wadayama'&&t.lineId==='SaninMain'));
assert(l.transferStations.some(t => t.station==='Himeji'&&t.lineId==='HimejiLine'));
assert.deepEqual(l.serviceBoundaries, [], 'Electrification split is NOT a cross-line handover');
const corrected = {
  'Kyou-Kuchi':[34.834765,134.70544],
  'Nozato':[34.8561509,134.7113322],
  'Shinno':[35.0501972,134.7524889],
  'Hase':[35.116917,134.747944],
  'Arai':[35.2365007,134.7949974]
};
for(const [id,[lat,lng]] of Object.entries(corrected)) {
  assert.equal(data.stations[id].lat,lat,id+' latitude');
  assert.equal(data.stations[id].lng,lng,id+' longitude');
}
const rad = Math.PI/180;
function distance(a,b) {
 const x=data.stations[a],y=data.stations[b];
 const da=(y.lat-x.lat)*rad,do_=(y.lng-x.lng)*rad;
 const h=Math.sin(da/2)**2+Math.cos(x.lat*rad)*Math.cos(y.lat*rad)*Math.sin(do_/2)**2;
 return 6371*2*Math.asin(Math.sqrt(h));
}
const segments=ids.slice(1).map((id,i)=>distance(ids[i],id));
const sum=segments.reduce((a,b)=>a+b,0);
assert(segments.every(n=>n>0.3&&n<12), 'A non-local or duplicate station coordinate was introduced');
assert(sum>55&&sum<65.7, 'Straight-line segment total must be plausible against 65.7km rail length');
console.log('Bantan PASS: 18 stations, maps, J wine-red, EN, transfer, '+sum.toFixed(2)+'km straight-line total');

// Asterisks on the shared date-verification gate are intentional: unlike
// 2026-11-only Kakogawa, Bantan's imported sources are undated in every month.
// No timetable source authorizes a current train position solely by its number.
const fs = require('node:fs');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const runtimeSource = fs.readFileSync(path.join(root, 'data/core/runtime-config.js'), 'utf8');
const window = {};
vm.runInNewContext(runtimeSource, { window, console });
assert.deepEqual(Array.from(window.RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.Bantan), ['*']);
assert.deepEqual(Array.from(window.RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.KakogawaLine), ['2026-11']);
const estimator = fs.readFileSync(path.join(root, 'js/train-position-estimator.js'), 'utf8');
assert.ok(estimator.includes('verifiedSqlMonths.indexOf("*")>=0'));
assert.ok(estimator.includes('requireSqlDateProof && tt._timetableDateVerified!==true'));
const page = fs.readFileSync(path.join(root, 'js/trains-page.js'), 'utf8');
for (const link of [
  'https://www.train-guide.westjr.co.jp/bantan.html',
  'https://timetable.jr-odekake.net/line-timetable/2443',
  'https://timetable.jr-odekake.net/line-timetable/2442'
]) assert.ok(page.includes(link), 'Missing official Bantan link: '+link);
for (const key of ['ja:', 'zh:', 'en:', 'ko:'])
  assert.ok(page.includes(key), 'Bantan official-source notice must be multilingual');
console.log('Bantan timetable-source PASS: archived SQL is not current-position evidence; official source links exist');
