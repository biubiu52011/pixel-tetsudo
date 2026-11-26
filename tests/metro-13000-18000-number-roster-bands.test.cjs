'use strict';
/* Metro PNG-first number bands: the stored bounds are a reverse index,
 * not permission to pick a vehicle without the existing exact service roster.
 * node --test tests/metro-13000-18000-number-roster-bands.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const migration=fs.readFileSync(
 'supabase/migrations/20261118003000_seed_metro_13000_hibiya_18000_hanzomon_png_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8').trimEnd().split('\n');
const idx=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
const cases=[
 {line:'Hibiya',name:'東京メトロ_13000系.png',min:502,max:2468,
  weekday:370,holiday:222,weekdaySample:'A1006S',holidaySample:'A1002S'},
 {line:'Hanzomon',name:'東京メトロ_18000系.png',min:551,max:2491,
  weekday:151,holiday:112,weekdaySample:'A1093S',holidaySample:'A1057S'}
];
const rowRegex=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'S',NULL,'\.\.\/(images\/列车\/東京メトロ\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
const sqlRows=[...migration.matchAll(rowRegex)].map(m=>({
 line:m[1],segment:m[2],min:+m[3],max:+m[4],png:m[5]
}));
test('two Metro S-band SQL rows derive from the actual 2611 full-number rosters',()=>{
 assert.equal(sqlRows.length,2);
 for(const x of cases){
  const path='images/列车/東京メトロ/'+x.name;
  const item=idx.find(y=>y.path===path);
  assert.ok(item&&!item.quarantined&&fs.existsSync(path),path);
  const rosters=item.runtimeNumberRosters.filter(y=>y.lineId===x.line);
  assert.equal(rosters.length,2,path+' weekday and holiday');
  const totals=Object.fromEntries(rosters.map(y=>[y.calendarType,y.explicitDocumentedNumberCount]));
  assert.equal(totals.weekday,x.weekday);
  assert.equal(totals.holiday,x.holiday);
  const nums=rosters.flatMap(y=>y.exactContiguousBands.flatMap(b=>[b.from,b.to]))
   .map(num=>{
    assert.match(num,/^[AB]\d{3,4}S$/,path+' complete prefix-number-suffix');
    return +num.slice(1,-1);
   });
  assert.equal(Math.min(...nums),x.min);
  assert.equal(Math.max(...nums),x.max);
  assert.ok(rosters.every(y=>y.numberFormat==='full_exact' &&
    y.validFrom==='2026-11-02' && y.validTo==='2026-11-30' &&
    y.referenceOnly===true && y.actualVehicleConfirmed===false &&
    y.guardDescription.includes('operator')));
  const found=sqlRows.filter(y=>y.line===x.line&&y.png===path);
  assert.equal(found.length,1);
  assert.equal(found[0].min,x.min);
  assert.equal(found[0].max,x.max);
  assert.equal(found[0].segment,
   'png_band/'+x.line+'/'+String(x.min).padStart(4,'0')+'-'+String(x.max).padStart(4,'0')+'S');
  const row=['地铁','東京メトロ',path,x.line,
   String(x.min).padStart(4,'0'),String(x.max).padStart(4,'0'),
   'S','metro-prefixed','纯号段（既有完整番号名单及日期运营方守卫保留）'].join(',');
  assert.ok(!csv.includes(row),path+' 已退役包络不得重新生成');
  assert.equal(csv.filter(y=>y.startsWith('地铁,東京メトロ,'+path+',')).length,x.line==='Hibiya'?442:216);
 }
 assert.ok(migration.includes("asset_scope='generic'"));
 assert.ok(migration.includes('ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING'));
 assert.doesNotMatch(migration,/UPDATE\s+public\.vehicle_image_assets/i);
 assert.doesNotMatch(migration,/DO\s+UPDATE/i);
});
test('original runtime only grants a Metro PNG for the exact scoped roster',()=>{
 const root={},ctx=vm.createContext({window:root,Date,console:{log(){},debug(){},warn(){},error(){}}});
 for(const file of ['data/timetables/vehicle-garage-png-map.js',
   'data/timetables/train-number-png-ranges.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 function position(line,num,calendarType,changes={}){
  return {positionLineId:line,displayLineId:line,
   sourceRailway:'odpt.Railway:TokyoMetro.'+line,
   trainOperator:'TokyoMetro',trainNumber:num,
   trainType:'odpt.TrainType:TokyoMetro.Local',
   serviceDate:calendarType==='weekday'?'2026-11-16':'2026-11-15',
   calendarType,positionSource:'supabase-train-run',estimated:true,
   vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
   ...changes};
 }
 for(const x of cases){
  const png='../images/列车/東京メトロ/'+x.name;
  for(const [cal,num] of [['weekday',x.weekdaySample],['holiday',x.holidaySample]]){
   const valid=position(x.line,num,cal);
   const result=root.TrainNumberPngRanges.match(num,x.line,valid);
   assert.ok(result,x.line+'/'+num+'/'+cal);
   assert.equal(result.pngPath,png);
   assert.equal(result.actualVehicleConfirmed,false);
   for(const changed of [
    {serviceDate:'2026-12-01'}, {sourceRailway:'odpt.Railway:TokyoMetro.Tozai'},
    {trainOperator:'Tobu'}, {vehicleIdentityStatus:'EXACT'},
    {realtimeVehicleType:'東京メトロ別形式'},
    {displayLineId:'Tozai'}
   ])assert.equal(root.TrainNumberPngRanges.match(num,x.line,{...valid,...changed}),
      null,x.line+' wrong source cannot borrow PNG: '+JSON.stringify(changed));
  }
 }
});

test('现行生成清单逐键对应四组原始名单和九个THライナー参考番号',()=>{
 const source=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
 const roster=JSON.parse(source.split('\n').find(s=>s.includes('var tobuMetroThroughNumberRoster=')).trim()
   .replace(/^var tobuMetroThroughNumberRoster=/,'').replace(/;$/,''));
 const actual=(path,line,suffix)=>{
  const rows=csv.map(r=>r.split(',')).filter(c=>c[2]===path&&c[3]===line&&c[6]===suffix&&c[8].startsWith('纯号段'));
  const keys=[];
  for(const r of rows)for(let n=+r[4];n<=+r[5];n++)keys.push(n);
  assert.equal(new Set(keys).size,keys.length);
  return keys.sort((a,b)=>a-b);
 };
 for(const [line,suffix,path,count] of [
  ['Hibiya','S','images/列车/東京メトロ/東京メトロ_13000系.png',455],
  ['Hanzomon','S','images/列车/東京メトロ/東京メトロ_18000系.png',216],
  ['Hanzomon','K','images/列车/東急電鉄/東急電鉄_2020系.png',396],
  ['Hanzomon','T','images/列车/東武鉄道/東武鉄道_50050型.png',188]
 ]){
  const expected=[...new Set([...roster[line].weekday,...roster[line].holiday]
    .filter(x=>new RegExp('^[AB][0-9]{3,4}'+suffix+'$').test(x))
    .map(x=>Number(x.slice(1,-1))))].sort((a,b)=>a-b);
  assert.equal(expected.length,count);
  assert.deepEqual(actual(path,line,suffix),expected);
 }
 assert.deepEqual(actual('images/列车/東武鉄道/東武鉄道_70090型.png','Hibiya','T'),
   [643,845,947,1743,1845,1847,1941,1945,2043]);
});
