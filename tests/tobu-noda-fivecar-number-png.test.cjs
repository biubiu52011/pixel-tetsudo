'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = {};
const sandbox = vm.createContext({ window: root });
for (const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 8000 });
}
const R = root.TrainNumberPngRanges;
const png60000 = '../images/列车/東武鉄道/東武鉄道_60000系.png';
const png80000 = '../images/列车/東武鉄道/東武鉄道_80000系.png';
const sourceRailway = 'odpt.Railway:Tobu.TobuUrbanPark';
function publishedNumber(number, other = {}) {
  return {
    positionSource: 'supabase-train-run',
    positionLineId: 'Noda',
    displayLineId: 'Noda',
    estimated: true,
    serviceDate: '2026-11-04',
    calendarType: 'weekday',
    sourceRailway,
    trainOperator: 'Tobu',
    trainType: 'odpt.TrainType:Tobu.Local',
    railDirection: 'odpt.RailDirection:Outbound',
    officialNumberVerified: true,
    timetableDateVerified: true,
    timetableValidity: 'date_verified',
    trainNumber: number,
    ...other
  };
}
test('Noda official November 4 has precisely 76 five-car public A train numbers', () => {
  const officialDown = '101A 105A 107A 111A 401A 119A 121A 123A 125A 133A 135A 2103A 413A 145A 419A 147A 2105A 423A 149A 427A 2107A 433A 805A 159A 161A 437A 439A 441A 169A 445A 171A 447A 813A 173A 453A 821A 463A 825A'.split(' ');
  const officialUp = '806A 404A 706A 104A 406A 108A 110A 818A 710A 822A 116A 118A 122A 418A 2102A 128A 130A 424A 830A 132A 428A 432A 140A 142A 144A 438A 3402A 442A 152A 444A 154A 156A 448A 3404A 158A 164A 2110A 168A'.split(' ');
  assert.equal(new Set([...officialDown, ...officialUp]).size, 76);
  for (const number of officialDown) {
    const proof = R.verifyNodaFiveCar20261104(number, publishedNumber(number));
    assert.ok(proof, number);
    assert.equal(proof.carComposition, 5);
    assert.equal(proof.authorizesPNG, false);
    assert.deepEqual(Array.from(proof.candidateModels), ['東武60000系','東武80000系']);
  }
  for (const number of officialUp) {
    const proof = R.verifyNodaFiveCar20261104(number, publishedNumber(number, {
      railDirection:'odpt.RailDirection:Inbound'
    }));
    assert.ok(proof, number);
    assert.equal(proof.carComposition, 5);
  }
});
test('five-car roster alone never guesses 60000 or 80000 PNG', () => {
  const number = '419A';
  const noModel = publishedNumber(number);
  assert.equal(R.match(number, 'Noda', noModel), null);
  assert.equal(R.match(number, 'Noda', publishedNumber(number, {
    realtimeVehicleType:'東武60000系'
  })), null);
  assert.equal(R.match(number, 'Noda', publishedNumber(number, {
    vehiclePlan: {confirmed:true,models:['東武60000系','東武80000系']}
  })), null);
});
test('dated confirmed SINGLE model selects its approved gallery PNG only', () => {
  for (const [model,png] of [
    ['東武60000系',png60000],
    ['東武80000系',png80000],
    ['東武80050型',png80000]
  ]) {
    assert.ok(root.VehicleGaragePngMap.matchModelPath(
      model==='東武80050型'?'東武80000系':model, png, 'Noda'));
    const row = R.match('419A', 'Noda', publishedNumber('419A', {
      vehiclePlan: {confirmed:true,models:[model]}
    }));
    assert.ok(row, model);
    assert.equal(row.pngPath, png);
    assert.equal(row.planned, true);
    assert.equal(row.actualVehicleConfirmed, false);
  }
});
test('Noda roster does not leak across direction, other date/line/railway or unverified numbers', () => {
  const base = publishedNumber('419A', {
    vehiclePlan: { confirmed:true, models:['東武60000系'] }
  });
  for(const [number, lineId, overrides] of [
    ['420A','Noda',{}],
    ['419A','Tojo',{}],
    ['419A','Noda',{serviceDate:'2026-11-13'}],
    ['419A','Noda',{serviceDate:'2026-11-21'}],
    ['419A','Noda',{sourceRailway:'odpt.Railway:Tobu.Tojo'}],
    ['419A','Noda',{railDirection:'odpt.RailDirection:Inbound'}],
    ['419A','Noda',{trainOperator:'JR-East'}],
    ['419A','Noda',{officialNumberVerified:false}],
    ['419A','Noda',{vehiclePlan:{confirmed:false,models:['東武60000系']}}],
    ['419A','Noda',{vehiclePlan:{confirmed:true,models:['東武8000系']}}],
    ['419A','Noda',{timetableDateVerified:false}]
  ]) {
    assert.equal(R.match(number,lineId,{...base,...overrides}),null,
      number+'/'+lineId+'/'+JSON.stringify(overrides));
  }
});
