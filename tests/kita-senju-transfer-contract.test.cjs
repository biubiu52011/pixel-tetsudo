'use strict';
// Kita-Senju is one Chiyoda/Jōban Local passenger service, not two platforms.
// Keep line identities and the real Ayase service boundary intact.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const lines=data.lines;
const expected={
  Chiyoda:['Joban','Hibiya','TobuSkytree','TsukubaExpress'],
  JobanLocal:['Joban','Hibiya','TobuSkytree','TsukubaExpress'],
  Joban:['Chiyoda','Hibiya','TobuSkytree','TsukubaExpress'],
  Hibiya:['Chiyoda','Joban','TobuSkytree','TsukubaExpress'],
  TobuSkytree:['Chiyoda','Joban','Hibiya','TsukubaExpress'],
  TsukubaExpress:['Chiyoda','Joban','Hibiya','TobuSkytree']
};
const window={
  UNIFIED_LINES:lines,
  STATION_COORDS:data.stations,
  currentLang:'ja',
  TrainsActiveSystemLineIds:[],
  RailwayDB:{getAllLines:()=>lines,resolveLineName:id=>lines[id]?.nameJa||id},
  LinePresentationService:{getMapBranchIds:()=>[],isIndependentLine:()=>false}
};
const context=vm.createContext({window});
vm.runInContext(fs.readFileSync('js/trains-data.js','utf8'),context,{timeout:5000});
const transferMap=id=>vm.runInContext('_getTransferMap('+JSON.stringify(id)+')',context,{timeout:5000});

test('Kita-Senju has exactly four unique passenger options in all six line diagrams',()=>{
  for(const [id,targets] of Object.entries(expected)){
    const badges=transferMap(id)['Kita-Senju']||[];
    assert.equal(badges.length,4,id+' has duplicate or missing connections');
    assert.deepEqual(Array.from(badges,t=>t.lineId).sort(),targets.slice().sort(),id);
    assert.equal(badges.some(t=>t.lineId==='JobanLocal'),false,id+' repeats the Chiyoda platform service');
    if(id==='JobanLocal')assert.equal(badges.some(t=>t.lineId==='Chiyoda'),false,'JL does not require a platform change at Kita-Senju');
  }
});

test('Jōban Local shows JR rapid and other transfers without reverse-mirroring JL',()=>{
  const links=lines.JobanLocal.presentation.mapPassengerConnections||[];
  assert.deepEqual(links.map(x=>x.lineId).sort(),expected.JobanLocal.slice().sort());
  assert.ok(links.every(x=>x.station==='Kita-Senju'));
  assert.ok(transferMap('JobanLocal')['Kita-Senju'].every(t=>t.passengerOnly===true));
  assert.equal(lines.JobanLocal.transferStations.some(t=>t.station==='Kita-Senju'&&t.lineId==='Chiyoda'),false);
  for(const id of ['Chiyoda','Hibiya','TobuSkytree','TsukubaExpress'])
    assert.equal((transferMap(id)['Kita-Senju']||[]).some(t=>t.lineId==='JobanLocal'),false,id);
});

test('Ayase retains the C/JL through boundary and Kita-Senju H/TS through tags remain valid',()=>{
  assert.deepEqual(lines.Chiyoda.serviceBoundaries.find(b=>b.lineId==='JobanLocal').handoverStations,['Ayase']);
  assert.deepEqual(lines.JobanLocal.serviceBoundaries.find(b=>b.lineId==='Chiyoda').handoverStations,['Ayase']);
  for(const [from,to] of [['Chiyoda','JobanLocal'],['JobanLocal','Chiyoda']]){
    const matches=(transferMap(from).Ayase||[]).filter(t=>t.lineId===to);
    assert.equal(matches.length,1,from+' Ayase connection');
    assert.equal(matches[0].through,true,from+' Ayase through tag');
  }
  assert.equal((transferMap('Chiyoda')['Kita-Senju']||[]).some(t=>t.through),false);
  assert.equal((transferMap('Hibiya')['Kita-Senju']||[]).find(t=>t.lineId==='TobuSkytree').through,true);
  assert.equal((transferMap('TobuSkytree')['Kita-Senju']||[]).find(t=>t.lineId==='Hibiya').through,true);
  assert.deepEqual(new Set(data.stationLines['Kita-Senju']),new Set(Object.keys(expected)));
});
