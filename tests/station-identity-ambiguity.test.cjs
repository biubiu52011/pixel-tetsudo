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

test('every repeated localized name preserves all referenced canonical IDs',()=>{
  const railway=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
  const i18n=JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
  const used=new Set(Object.values(railway.lines).flatMap(line=>line.stations||[]));
  const window={
    RAILWAY_I18N:i18n, STATION_NAME_MAP:railway.name_map,
    RailwayDB:{getAllLines:()=>railway.lines,resolveStationName:(id,lang)=>i18n[id]?.[lang]||id}
  };
  vm.runInNewContext(fs.readFileSync('js/station-resolver.js','utf8'),{window});
  let count=0;
  for(const lang of ['ja','zh','en','ko']){
    const index=new Map();
    for(const id of used){
      const label=i18n[id]?.[lang];
      if(!label)continue;
      if(!index.has(label))index.set(label,[]);
      index.get(label).push(id);
    }
    for(const [label,ids]of index){
      if(ids.length<2)continue;
      count++;
      const matched=new Set(window.StationResolver.resolve(label).map(c=>c.stationId));
      for(const id of ids)assert.ok(matched.has(id),lang+' '+label+' missing '+id);
    }
  }
  assert.ok(count>200,'expected substantial real-world multilingual homonym coverage');
});

test('one railway may connect to two distinct alias stations with exact walking minutes',()=>{
  const lines={
    A:{stations:['Hub'],transferStations:[
      {station:'Hub',lineId:'B',toStation:'T1',type:'out',walkMinutes:5},
      {station:'Hub',lineId:'B',toStation:'T2',type:'out',walkMinutes:3}]},
    B:{stations:['T1','T2'],transferStations:[]}
  };
  const window={UNIFIED_LINES:lines,STATION_COORDS:{
    Hub:[35.55,139.7865],T1:[35.549,139.7846],T2:[35.5508,139.7878]},
    RuntimeConfig:{TRUNK_MAIN_LINE_IDS:[]},
    LINE_STATION_ORDER:{A:{Hub:0},B:{T1:0,T2:1}},
    RailwayDB:{getAllLines:()=>lines,getLine:id=>lines[id],getLineDurations:()=>[],
      getData:()=>({line_types:{}})}};
  vm.runInNewContext(fs.readFileSync('js/route-search.js','utf8'),{window});
  for(const [dest,minutes] of [['T1',5],['T2',3]]){
    const result=window.RouteSearch.findRoute('Hub',dest,'combo');
    assert.ok(result,dest+' must be reachable');
    const transfer=result.routeSegments.find(x=>x.type==='transfer');
    assert.equal(transfer.toStation,dest);
    assert.equal(transfer.walking,true);
    assert.equal(transfer.walkingDuration,minutes);
  }
});
test('canonical alias targets exist on the destination line',()=>{
  const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
  for(const [id,line] of Object.entries(data.lines)){
    for(const t of line.transferStations||[]){
      if(!t.toStation||t.toStation===t.station)continue;
      assert.ok(data.lines[t.lineId]?.stations?.includes(t.toStation),
        id+'/'+t.station+' -> '+t.lineId+'/'+t.toStation);
    }
  }
  assert.ok(data.lines.Musashino.transferStations.some(t=>
    t.station==='Kita-Asaka'&&t.toStation==='Asakadai'));
  assert.ok(data.lines.Fukutoshin.transferStations.some(t=>
    t.station==='Zoshigaya'&&t.toStation==='Onishimogami_Mae'));
  assert.ok(data.stations['Monorail-Hamamatsucho']);
});
