'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');

const data=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const i18n=JSON.parse(fs.readFileSync('data/core/station_i18n.compact.json','utf8'));
const kakogawa=data.lines.KakogawaLine;
const karasuyama=data.lines.Karasuyama;

test('Hyogo and Tochigi Taki are distinct canonical stations and scoped aliases',()=>{
  assert.ok(kakogawa.stations.includes('Taki'));
  assert.ok(!kakogawa.stations.includes('Taki-Tochigi'));
  assert.ok(karasuyama.stations.includes('Taki-Tochigi'));
  assert.ok(!karasuyama.stations.includes('Taki'));
  assert.deepEqual(data.stationLines.Taki,['KakogawaLine']);
  assert.deepEqual(data.stationLines['Taki-Tochigi'],['Karasuyama']);
  assert.equal(data.lineStationOrder.Karasuyama['Taki-Tochigi'],6);
  assert.ok(!Object.hasOwn(data.lineStationOrder.Karasuyama,'Taki'));
  assert.deepEqual(data.stations.Takino,{lat:34.9411467,lng:134.9553627});
  assert.deepEqual(data.stations.Taki,{lat:34.948737,lng:134.9623568});
  assert.deepEqual(data.stations['Taki-Tochigi'],{lat:36.6487217,lng:140.1382081});
  assert.equal(i18n['Taki-Tochigi'].ja,'滝');
  for(const f of ['data/core/runtime-config.js','data/core/data-config-bundle.js']){
    const source=fs.readFileSync(f,'utf8');
    assert.match(source,/"Karasuyama": \{ "Taki": "Taki-Tochigi" \}/);
  }
});

test('Kakogawa reference durations are non-synthetic and station labels are accurate',()=>{
  assert.equal(kakogawa.stations.length,21);
  assert.equal(kakogawa.durations.length,20);
  assert.ok(new Set(kakogawa.durations).size>1);
  assert.deepEqual([i18n.Hioka.en,i18n.Kanno.en,i18n.Kurodashou.en,i18n['Motoguro-Ta'].en],
    ['Hioka','Kanno','Kurodasho','Hon-Kuroda']);
  assert.deepEqual([i18n.Hioka.ko,i18n.Kanno.ko,i18n.Kurodashou.ko,i18n['Motoguro-Ta'].ko],
    ['히오카','칸노','구로다쇼','혼쿠로다']);
});

test('canonical source data and all generated railway/i18n outputs match',()=>{
  for(const [src,js,global] of [
    ['railway_data','railway-data.file.js','RAILWAY_DATA'],
    ['station_i18n','station-i18n.file.js','RAILWAY_I18N']
  ]){
    const compact=JSON.stringify(JSON.parse(fs.readFileSync('data/core/'+src+'.json','utf8')));
    assert.equal(fs.readFileSync('data/core/'+src+'.compact.json','utf8'),compact+'\n');
    assert.equal(fs.readFileSync('data/core/'+js,'utf8'),'window.'+global+' = '+compact+';\n');
  }
});

test('client cache keys point at current canonical compact blob SHA',()=>{
  const source=fs.readFileSync('data/core/db-loader.js','utf8');
  for(const asset of ['railway_data','station_i18n']){
    const buf=fs.readFileSync('data/core/'+asset+'.compact.json');
    const blob=crypto.createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex').slice(0,12);
    assert.ok(source.includes(asset+'.compact.json?v='+blob),asset);
  }
});

test('published railway date exception is SQL-owned, source-backed and downstream cancels',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261109092000_published_railway_dated_cancellations_kakogawa.sql','utf8');
  const numbers=fs.readFileSync('supabase/migrations/20261109091000_kakogawa_2611_nishiwaki_number_split.sql','utf8');
  const handler=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  for(const n of ['1335S','2329S','2326S','1338S'])assert.ok(numbers.includes(n),n);
  for(const d of ['2026-11-19','2026-11-20','2026-11-24','2026-11-25','2026-11-26'])assert.ok(sql.includes(d),d);
  for(const n of ['2326S','2327S','2328S','2329S'])assert.ok(sql.includes(n),n);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql,/source_id.*REFERENCES public\.evidence_sources/i);
  assert.match(handler,/\.from\("published_railway_date_exceptions"\)/);
  assert.match(handler,/run\.operation_status="cancelled"/);
  assert.match(fs.readFileSync('data/api/odpt-unified.js','utf8'),
    /run && run\.operation_status === "cancelled"/);
});

test('Kakogawa official I line color and Tanigawa reciprocal transfer',()=>{
  assert.equal(kakogawa.presentation.code,'I');
  assert.equal(kakogawa.color,'#00a98f');
  assert.equal(kakogawa.presentation.color,'#00a98f');
  assert.deepEqual(kakogawa.transferStations.filter(t=>t.station==='Tanigawa'),
    [{station:'Tanigawa',lineId:'Fukuchiyama',type:'in/out',
      note:'谷川駅：福知山線へ乗換'}]);
  assert.ok(data.lines.Fukuchiyama.transferStations.some(t=>
    t.station==='Tanigawa' && t.lineId==='KakogawaLine'));
  assert.deepEqual([...data.stationLines.Tanigawa].sort(),
    ['Fukuchiyama','KakogawaLine'].sort());
});

test('Kakogawa Korean readings are not truncated',()=>{
  assert.equal(i18n.Yakujin.ko,'야쿠진');
  assert.equal(i18n['Nippon-Heso-Kouen'].ko,'니혼헤소코엔');
  assert.equal(i18n['Shinzai-Waki'].ko,'신니시와키');
});

test('November SQL position policy excludes historical source clocks',()=>{
  const cfg=fs.readFileSync('data/core/runtime-config.js','utf8');
  const bundle=fs.readFileSync('data/core/data-config-bundle.js','utf8');
  const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
  assert.ok(cfg.includes('KakogawaLine: Object.freeze(["2026-11"])'));
  assert.ok(bundle.includes('SQL_POSITION_VERIFICATION_MONTHS: SQL_POSITION_VERIFICATION_MONTHS'));
  assert.ok(estimator.includes('verifiedSqlMonths.indexOf(String(serviceDate).slice(0,7))>=0'));
  assert.ok(estimator.includes('tt._timetableDateVerified!==true'));
  assert.ok(estimator.includes('tt._positionSource==="supabase-train-run"'));
});

test('Kakogawa 1324S and 1344S official November sources are date-scoped',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261109110000_kakogawa_2611_two_more_official_inbound_clocks.sql','utf8');
  for(const no of ['1324S','1344S'])
    assert.ok(sql.includes("'"+no+"'"),no);
  for(const url of ['/65181?date=20261128','/65471?date=20261128'])
    assert.ok(sql.includes(url),url);
  assert.ok(sql.includes("NOT IN (98,101)"));
  assert.ok(sql.includes("timetable_validity"));
  assert.ok(sql.includes("'date_verified'"));
  assert.ok(sql.includes("SATURDAY_HOLIDAY_OFFICIAL_NUMBER_GAPS_29"));
  assert.ok(sql.includes("'public_number_calendar_direction_only'"));
  assert.ok(sql.includes("'2026-11-03'::date"));
  assert.ok(sql.includes("'2026-11-23'::date"));
  assert.ok(!sql.includes("vehicle_plan_confirmed=true"));
});

test('Kakogawa planner weights match the sourced 2026 North-Harima corridor guide',()=>{
  assert.equal(kakogawa.durationTotalMin,75);
  assert.equal(kakogawa.durations.length,20);
  assert.deepEqual([
    kakogawa.durations.slice(0,6).reduce((s,v)=>s+v,0),
    kakogawa.durations.slice(6,12).reduce((s,v)=>s+v,0),
    kakogawa.durations.slice(12).reduce((s,v)=>s+v,0)
  ],[25,21,29]);
  assert.deepEqual(kakogawa.durationSections.map(s=>s.approxMinutes),[25,21,29]);
  assert.match(kakogawa.durationReference,/web.pref.hyogo.lg.jp/);
  assert.match(kakogawa.durationReferenceScope,/planning-only/);
});

test('Kakogawa official timetable links are references, not live API data',()=>{
  const source=fs.readFileSync('js/trains-page.js','utf8');
  assert.ok(source.includes('lineId === "KakogawaLine"'));
  for(const url of ['https://www.train-guide.westjr.co.jp/',
     'https://timetable.jr-odekake.net/line-timetable/2455',
     'https://timetable.jr-odekake.net/line-timetable/2456'])
    assert.ok(source.includes(url));
  assert.ok(source.includes('未核实2026年11月全部列车'));
});
