'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const d = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const names = JSON.parse(fs.readFileSync('data/core/station_i18n.json', 'utf8'));
const loc = d.lines.Ikebukuro;
const subset = ['Hanno','Higashi-Hanno','Koma-Seibu','Musashi-Yokote','Higashi-Agano','Agano'];
const w = { window:{} };
vm.runInNewContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),w);
const presets = w.window.MajorVehicleFleetPresets;
const local = 'odpt.TrainType:Seibu.Local';
const lookup = (line,day,stationKeys=[]) => presets.lookup(line,'Seibu',local,{serviceDate:day,stationKeys});

test('Ikebukuro geographic track reaches Agano at the Chichibu boundary',()=>{
  assert.equal(loc.stations.length,31);
  assert.deepEqual(loc.stations.slice(-6),subset);
  assert.equal(loc.durations.length,30);
  assert.equal(new Set(loc.stations).size,31);
  for (let n=0;n<loc.stations.length;n++) {
    const k=loc.stations[n];
    assert.equal(d.lineStationOrder.Ikebukuro[k],n,k);
    assert.ok(d.stationLines[k].includes('Ikebukuro'),k);
    assert.ok(Number.isFinite(d.stations[k].lat),k+' lat');
    assert.ok(Number.isFinite(d.stations[k].lng),k+' lng');
  }
  assert.ok(loc.throughServices.includes('SeibuChichibu'));
  assert.ok(d.lines.SeibuChichibu.throughServices.includes('Ikebukuro'));
  assert.ok(loc.serviceBoundaries.some(x=>x.lineId==='SeibuChichibu'&&x.handoverStations.includes('Agano')));
  assert.ok(d.lines.SeibuChichibu.serviceBoundaries.some(x=>x.lineId==='Ikebukuro'&&x.handoverStations.includes('Agano')));
  assert.ok(d.stationLines.Agano.includes('SeibuChichibu'));
  assert.equal(d.name_map['高麗'],'Koma-Seibu');
  assert.equal(names['Koma-Seibu'].ja,'高麗');
  assert.equal(d.stations.Koma,undefined,'Koma is used by JR Hanawa: do not merge');
  assert.ok(Math.abs(d.stations.Hanno.lng-139.31906)<0.0001);
  assert.ok(d.stationLines['Higashi-Hanno'].includes('Hachiko'));
});

test('seibu 2026 active fleet is a reference, never train-level PNG or formation',()=>{
  for(const line of ['Ikebukuro','SeibuToshima','Seibu_Sayama']){
    const row=lookup(line,'2026-11-16');
    assert.ok(row&&row._fleetReferenceOnly,line);
    assert.equal(row.planOverride,false,line);
    assert.equal(row.illustrationPng,undefined,line);
    assert.ok(!row.vehicleCandidates.includes('西武2000系'),line);
  }
  assert.ok(!lookup('Ikebukuro','2026-11-16',['Ikebukuro','Nerima']).vehicleCandidates.includes('西武7000系'));
  const western=lookup('Ikebukuro','2026-11-16',subset);
  assert.equal(western.presetId,'seibu-ikebukuro-western-local');
  assert.ok(western.vehicleCandidates.includes('西武7000系'));
  assert.ok(western.vehicleCandidates.includes('西武4000系'));
  assert.ok(!lookup('Ikebukuro','2026-09-11',subset).vehicleCandidates.includes('西武7000系'));
  assert.ok(!lookup('SeibuChichibu','2026-09-11').vehicleCandidates.includes('西武7000系'));
  assert.ok(lookup('SeibuChichibu','2026-09-12').vehicleCandidates.includes('西武7000系'));
  assert.ok(!lookup('Seibu_Sayama','2026-06-26').vehicleCandidates.includes('西武7000系'));
  assert.ok(lookup('Seibu_Sayama','2026-06-27').vehicleCandidates.includes('西武7000系'));
  assert.equal(lookup('Ikebukuro','2026-11-16',subset).actualVehicleConfirmed,undefined);
});
test('no retired Seibu 2000 or 9000 Ikebukuro PNG alias survives',()=>{
 const vehicles=fs.readFileSync('js/train-vehicle.js','utf8');
 const gallery=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
 assert.match(vehicles,/"seibu-9000": \["SeibuTamako"\]/);
 assert.match(vehicles,/"remaining-fleet-extra-0": \["SeibuShinjuku"\]/);
 assert.doesNotMatch(gallery,/"seibu-9000","西武9000系"[^\]]*Ikebukuro/);
 assert.doesNotMatch(gallery,/"remaining-fleet-extra-0","西武2000系"[^\]]*Ikebukuro/);
 for (const suffix of ['001系_Laview','40000系_青帯','7000系_サステナ車両','20000系_標準塗装']){
   assert.ok(fs.existsSync('images/列车/西武鉄道/西武鉄道_'+suffix+'.png'),suffix);
 }
 const num=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
 assert.doesNotMatch(num,/lineId:\s*["']Ikebukuro["']/,'no invented train number -> PNG ranges');
});


test('all five Ikebukuro-family routes use passenger SI and one orange palette',()=>{
  const ids=['Ikebukuro','SeibuChichibu','Yurakucho_Seibu','SeibuToshima','Seibu_Sayama'];
  const km={Ikebukuro:57.8,SeibuChichibu:19,
    Yurakucho_Seibu:2.6,SeibuToshima:1,Seibu_Sayama:4.2};
  for(const id of ids){
    const l=d.lines[id];
    assert.equal(l.operator,'Seibu',id);
    assert.equal(l.code,'SI',id);
    assert.equal(l.presentation.code,'SI',id);
    assert.equal(l.officialLineSymbol,'SI',id);
    assert.equal(l.color,'#EF7A00',id);
    assert.equal(l.presentation.color,'#EF7A00',id);
    assert.equal(l.routeLengthKm,km[id],id);
    assert.ok(Array.isArray(l.operatingPrefectures)&&l.operatingPrefectures.length,id);
  }
  // The five branches must keep their own canonical identity and source stops.
  assert.equal(new Set(ids).size,5);
  assert.equal(d.lines.Ikebukuro.stations[0],'Ikebukuro');
  assert.equal(d.lines.SeibuChichibu.stations[0],'Agano');
  assert.equal(d.lines.Yurakucho_Seibu.stations[0],'Nerima');
  assert.equal(d.lines.SeibuToshima.stations[0],'Nerima');
  assert.equal(d.lines.Seibu_Sayama.stations[0],'Nishi-Tokorozawa');
});
test('Seibu colors and line symbols match the six official route families',()=>{
  const expected={
    Ikebukuro:'SI',SeibuChichibu:'SI',Yurakucho_Seibu:'SI',
    SeibuToshima:'SI',Seibu_Sayama:'SI',
    SeibuShinjuku:'SS',Haijima:'SS',
    Kokubunji:'SK',SeibuEn:'SK',SeibuTamako:'ST',
    SeibuYamaguchi:'SY',SeibuTamagawa:'SW'
  };
  const lines=Object.entries(d.lines).filter(([,l])=>l.operator==='Seibu');
  assert.equal(lines.length,Object.keys(expected).length);
  for(const [id,l] of lines) {
    assert.equal(l.code,expected[id],id);
    assert.equal(l.presentation.code,expected[id],id);
    assert.equal(l.officialLineSymbol,expected[id],id);
    assert.equal(l.color,l.presentation.color,id);
  }
});
test('Seibu Akitsu and JR-West Kure Akitsu never share a physical identity',()=>{
  assert.equal(d.lines.Ikebukuro.stations[15],'Akitsu');
  assert.equal(d.lines.Kure.stations[8],'Akitsu-Kure');
  assert.equal(d.lineStationOrder.Kure['Akitsu-Kure'],8);
  assert.equal(d.lineStationOrder.Kure.Akitsu,undefined);
  assert.equal(d.name_map['秋津'],'Akitsu');
  assert.equal(d.name_map['安芸津'],'Akitsu-Kure');
  assert.deepEqual(d.stationLines.Akitsu,['Ikebukuro']);
  assert.deepEqual(d.stationLines['Akitsu-Kure'],['Kure']);
  assert.equal(names.Akitsu.ja,'秋津');
  assert.equal(names['Akitsu-Kure'].ja,'安芸津');
  assert.ok(d.stations.Akitsu.lat>35.7 && d.stations.Akitsu.lng>139);
  assert.ok(d.stations['Akitsu-Kure'].lat>34.2 && d.stations['Akitsu-Kure'].lat<34.4);
  assert.ok(d.stations['Akitsu-Kure'].lng>132.7 && d.stations['Akitsu-Kure'].lng<133);
});
test('Akitsu - Shin-Akitsu is an outdoor walking interchange, not shared station',()=>{
  assert.equal(d.stationLines['Shin-Akitsu'].includes('Ikebukuro'),false);
  const check=(src,station,line,to)=>{
    const t=d.lines[src].transferStations.find(t=>t.station===station&&t.lineId===line);
    assert.ok(t,src+' -> '+line);
    assert.equal(t.type,'out');
    assert.equal(t.toStation,to);
    assert.equal(t.walkMinutesApprox,8);
    assert.equal(t.gateDistanceMetersApprox,400);
    assert.match(t.evidenceUrl,/jreast\.co\.jp/);
  };
  check('Ikebukuro','Akitsu','Musashino','Shin-Akitsu');
  check('Musashino','Shin-Akitsu','Ikebukuro','Akitsu');
  for(const [src,target] of [['Ikebukuro','Seibu_Sayama'],['Seibu_Sayama','Ikebukuro']]){
    assert.ok(d.lines[src].transferStations.some(t=>t.station==='Nishi-Tokorozawa'&&t.lineId===target));
  }
});
test('Ikebukuro duration is explicitly schematic and internally additive',()=>{
  assert.equal(loc.durations.length,loc.stations.length-1);
  assert.equal(loc.durationTotalMin,loc.durations.reduce((sum,n)=>sum+n,0));
  assert.equal(loc.durationBasis,'schematic_not_official_timetable');
  assert.deepEqual(loc.operatingPrefectures,['Tokyo','Saitama']);
});
