'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const i18n = {
    Kyobashi:{ja:'京橋',zh:'京桥',en:'Kyobashi',ko:'교바시'},
    'Kyobashi-Osaka':{ja:'京橋',zh:'京桥',en:'Kyobashi',ko:'교바시'},
    Kanda:{ja:'神田',zh:'神田',en:'Kanda',ko:'칸다'},
    'Kanda-Fukuoka':{ja:'苅田',zh:'苅田',en:'Kanda',ko:'칸다'},
    Shinjuku:{ja:'新宿',zh:'新宿',en:'Shinjuku',ko:'신주쿠'}
  };
  const lines = {Ginza:{stations:['Kyobashi','Kanda']},OsakaLoop:{stations:['Kyobashi-Osaka']},
    Nippo:{stations:['Kanda-Fukuoka']},Yamanote:{stations:['Shinjuku']}};
  const window = {RAILWAY_I18N:i18n,
    STATION_NAME_MAP:{'京橋':'Kyobashi','苅田':'Kanda-Fukuoka'},
    RailwayDB:{getAllLines:()=>lines, resolveStationName:(id,lang)=>i18n[id]?.[lang]||id}};
  vm.runInNewContext(fs.readFileSync('js/station-resolver.js','utf8'),{window});
  return {window,lines,i18n};
}
test('four languages keep both Kyobashi identities',()=>{
  const {window}=setup();
  for(const label of ['京橋','京桥','Kyobashi','교바시']){
    const candidates=window.StationResolver.resolve(label);
    assert.deepEqual(new Set(candidates.map(c=>c.stationId)),new Set(['Kyobashi','Kyobashi-Osaka']));
    assert.ok(candidates.every(c=>c.status==='AMBIGUOUS'));
  }
});
test('English identity key matching does not silently steal another station',()=>{
  const {window}=setup();
  assert.deepEqual(new Set(window.StationResolver.resolve('Kanda').map(x=>x.stationId)),
    new Set(['Kanda','Kanda-Fukuoka']));
  assert.deepEqual(Array.from(window.StationResolver.resolve('苅田'),x=>x.stationId),['Kanda-Fukuoka']);
  assert.deepEqual(Array.from(window.StationResolver.resolve('Shinjuku'),x=>x.stationId),['Shinjuku']);
});
test('source reload invalidates reverse indices',()=>{
  const {window,lines,i18n}=setup();
  assert.equal(window.StationResolver.resolve('京橋').length,2);
  lines.OsakaLoop.stations=['Shinjuku'];
  delete i18n['Kyobashi-Osaka'];
  window.StationResolver.invalidate();
  assert.deepEqual(Array.from(window.StationResolver.resolve('京橋'),x=>x.stationId),['Kyobashi']);
});
test('search form requires explicit selection and preserves display labels',()=>{
  const ui=fs.readFileSync('js/search-ui.js','utf8');
  const search=fs.readFileSync('js/route-search.js','utf8');
  const loader=fs.readFileSync('data/core/db-loader.js','utf8');
  assert.match(ui,/ids\.length > 1/);
  assert.match(ui,/uncertain\.focus\(\)/);
  assert.match(ui,/getAttribute\('data-station-id'\)/);
  assert.match(ui,/data-station-label/);
  assert.match(search,/s\.disambiguation = line/);
  assert.match(loader,/StationResolver\.invalidate\(\)/);
});
