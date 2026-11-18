'use strict';
// Rinkai 70-000 / 71-000 coexist in the same 81-91 operating family.
// An exact source train number is NOT the physical stock model.
// Three-digit T numbers may show illustrative 70-000 art and four-digit
// T numbers 71-000 art; physical carsets still need independent evidence.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={},context=vm.createContext({window:root,Date,console:{log(){},warn(){},debug(){},error(){}}});
for(const path of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js'])
 vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path,timeout:15000});
const catalog=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8'));
const index=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const png70='images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png';
const png71='images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png';
const model70='東京臨海高速鉄道70-000形';
const model71='東京臨海高速鉄道71-000形';
const base=(trainNumber,model,overrides={})=>({
 trainNumber,positionLineId:'Rinkai',
 sourceRailway:'odpt.Railway:TWR.Rinkai',
 trainType:'odpt.TrainType:TWR.Local',
 railDirection:/[02468]T$/.test(trainNumber)?
  'odpt.RailDirection:Inbound':'odpt.RailDirection:Outbound',
 serviceDate:'2026-11-18',calendarType:'weekday',
 realtimeVehicleType:model,...overrides
});
const match=(number,model,changes={})=>root.TrainNumberPngRanges.match(
 number,changes.positionLineId||'Rinkai',base(number,model,changes));

test('TWR Rinkai internal T suffix is separately documented for weekday/holiday, never JR Saikyo',()=>{
 const t=catalog.rules.find(x=>x.id==='js-0132');
 assert.ok(t);
 assert.deepEqual(t.line_ids,['Rinkai']);
 assert.equal(t.suffix,'T');
 assert.equal(t.format,'tail');
 assert.equal(t.min,36);
 assert.equal(t.max,91);
 assert.equal(t.weekday_numbers.length,53);
 assert.equal(t.holiday_numbers.length,54);
 assert.equal(new Set([...t.weekday_numbers,...t.holiday_numbers]).size,76);
 for(const no of ['636T','738T','1638T','1640T'])
  assert.ok(t.weekday_numbers.includes(no),'historical weekday T whitelist missing '+no);
 assert.equal(t.runtime_guards.directionNumberParity,undefined);
 assert.equal(t.direction_number_parity,'inbound-even');
 assert.deepEqual(t.source_railways,['odpt.Railway:TWR.Rinkai']);
 assert.equal(t.runtime_guards.exactModelArtworkMap[model70],
  '../'+png70);
 assert.equal(t.runtime_guards.exactModelArtworkMap[model71],
  '../'+png71);
 for(const png of [png70,png71]){
  assert.ok(fs.existsSync(png),'artwork missing: '+png);
  const asset=index.pngIndex.find(x=>x.path===png);
  assert.ok(asset);
  assert.ok(asset.canonicalModels.includes(png===png70?model70:model71));
  assert.ok(asset.directNumberRules.some(x=>x.ruleId==='js-0132'));
  assert.ok(asset.directNumberRules.some(x=>x.ruleId==='js-0058'));
  assert.ok(asset.directNumberRules.every(x=>x.actualVehicleConfirmed===false));
  assert.ok(csv.includes(png+',Rinkai,0036,0091,T,tail,'));
 }
 assert.equal(index.summary.galleryPng,601);
 assert.equal(index.summary.catalogRules,423);
});

test('70-000 and 71-000 T services select one PNG only with independent, consistent model evidence',()=>{
 const pairs=[
  ['1088T',model71,png71,{calendarType:'weekday',serviceDate:'2026-11-18'}],
  // These four full train numbers exist in the historical source calendar;
  // model here is an independent simulated observation, NOT a 2611 carset claim.
  ['636T',model70,png70,{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['738T',model71,png71,{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['1638T',model71,png71,{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['1640T',model70,png70,{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['1091T',model70,png70,{calendarType:'holiday',serviceDate:'2026-11-15'}],
  ['580T',model70,png70,{calendarType:'weekday',serviceDate:'2026-11-18'}]
 ];
 for(const [number,model,png,calendar] of pairs){
  const evidence=match(number,model,calendar);
  assert.ok(evidence,number+' exact source-model PNG');
  assert.equal(evidence.model,model);
  assert.equal(evidence.pngPath,'../'+png);
  assert.equal(evidence.planned,true,'no actual carset asserted');
  const noModel=match(number,'',calendar);
  const threeDigit=/^[0-9]{3}T$/.test(number);
  const defaultModel=threeDigit?model70:model71;
  const defaultPng=threeDigit?png70:png71;
  assert.equal(noModel?.model,defaultModel,'T number length chooses representative artwork');
  assert.equal(noModel?.pngPath,'../'+defaultPng);
  assert.equal(noModel?.source,threeDigit
   ?'rinkai-three-digit-t-display-default'
   :'rinkai-four-digit-t-display-default');
  assert.equal(noModel?.illustrative,true,'default must not claim an actual formation');
  const other=model===model70?model71:model70;
  assert.equal(match(number,model,{...calendar,realtimeDerivedVehicleType:other}),null,
   'conflicting model evidence fails closed');
  assert.equal(match(number,model,{...calendar,sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'}),null,
   'JR namespace is not Rinkai local T');
  assert.equal(match(number,model,{...calendar,serviceDate:'2026-12-01'}),null,
   'edition guard preserved');
 }
});

test('Rinkai T illustration defaults by three/four numeric digits only without independent model evidence',()=>{
 for(const [number,calendar] of [
  ['1689T',{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['1088T',{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['2480T',{calendarType:'holiday',serviceDate:'2026-11-15'}],
  ['580T',{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['584T',{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['991T',{calendarType:'weekday',serviceDate:'2026-11-18'}],
  ['990T',{calendarType:'holiday',serviceDate:'2026-11-15'}]
 ]){
  const shown=match(number,'',calendar);
  const threeDigit=/^[0-9]{3}T$/.test(number);
  assert.equal(shown?.model,threeDigit?model70:model71);
  assert.equal(shown?.pngPath,'../'+(threeDigit?png70:png71));
  assert.equal(shown?.source,threeDigit
   ?'rinkai-three-digit-t-display-default'
   :'rinkai-four-digit-t-display-default');
  assert.equal(shown?.illustrative,true);
  assert.equal(shown?.displayDefault,true);
  assert.equal(shown?.planned,true);
 }
 assert.equal(match('1689T','',{
  vehiclePlan:{status:'PLANNED_MODEL',models:[model70]}
 })?.model,model71,'unconfirmed SQL plan must not override display preference');
 assert.equal(match('1689T',model70)?.pngPath,'../'+png70,
  'explicit 70-000 model evidence overrides display preference');
 assert.equal(match('1689T',model71)?.pngPath,'../'+png71);
 assert.equal(match('1689T',model70,{realtimeDerivedVehicleType:model71}),null,
  'conflicting model sources remain unresolved');
 assert.equal(match('584T','')?.model,model70,'three-digit T defaults to representative 70-000');
 assert.equal(match('991T','')?.model,model70,'three-digit T defaults to representative 70-000');
 assert.equal(match('584T',model71)?.pngPath,'../'+png71,
  'explicit 71-000 model evidence overrides three-digit display preference');
 assert.equal(match('584T',model70)?.pngPath,'../'+png70);
 assert.equal(match('584T',model71,{realtimeDerivedVehicleType:model70}),null,
  'conflicting model evidence overrides neither default');
 assert.equal(match('1080T',''),null,'unlisted four-digit T must not be fabricated');
 assert.equal(match('1640T','',{calendarType:'holiday',serviceDate:'2026-11-15'}),
  null,'weekday-only T does not leak into holiday');
 assert.equal(match('1689T','',{sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'}),
  null,'JR Saikyo may not use this TWR fallback');
 assert.equal(match('1689T','',{serviceDate:'2026-12-01'}),null,
  'edition guard is preserved');
});

test('T train-number whitelist does not fill gaps or allow 70/71 by operation ID',()=>{
 const good=base('1088T',model71);
 for(const number of ['1080T','1082T','888T','89T','637T','739T','1639T','1641T','936T']){
  assert.equal(root.TrainNumberPngRanges.match(number,'Rinkai',{...good,trainNumber:number}),null,
   'unsupported TWR T sample must not become a 70/71 mapping: '+number);
 }
 assert.equal(root.TrainNumberPngRanges.match('1088T','SaikyoKawagoe',{
  ...good,positionLineId:'SaikyoKawagoe',
  sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'}),null,
  'Rinkai T must not leak across JR direct service');
 assert.equal(match('1091T',model70,{calendarType:'weekday',serviceDate:'2026-11-18'}),null,
  'weekend-only original T number must not be inferred for weekdays');
 assert.equal(match('1088T',model71,{railDirection:'odpt.RailDirection:Outbound'}),null,
  'inbound-even T suffix parity required');
 assert.equal(match('1089T',model71,{trainType:'odpt.TrainType:TWR.Rapid'}),null,
  'T internal service requires Local');
 assert.equal(root.TrainNumberPngRanges.match('1984K','SaikyoKawagoe',{
  trainNumber:'1984K',positionLineId:'SaikyoKawagoe',
  serviceDate:'2026-11-18',sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
  trainType:'odpt.TrainType:JR-East.Local',
  railDirection:'odpt.RailDirection:Inbound',realtimeVehicleType:model70
 })?.pngPath,'../'+png70,'existing K/F/S reference still works');
});

test('Official ODPT 2026-03-16 public number snapshot covers T and K/F/S without inferring a 70/71 carset',()=>{
 const snapshot=JSON.parse(fs.readFileSync(
  'data/audits/twr-odpt-traintimetable-20260316-number-roster.json','utf8'));
 assert.equal(snapshot.source,'ODPT odpt:TrainTimetable (TWR)');
 assert.equal(snapshot.providerDcDate,'2026-03-16');
 assert.equal(snapshot.recordCount,564);
 assert.equal(snapshot.uniquePublicNumbers,516);
 assert.equal(snapshot.trainVehicleTypeEvidenceCount,0);
 assert.equal(snapshot.groups.length,7);
 const numbersByCalendar={weekday:new Set(),holiday:new Set()};
 let seen=0, kfs=0, ambiguous=0, lowT=0;
 for(const group of snapshot.groups){
  assert.equal(group.railway,'odpt.Railway:TWR.Rinkai');
  const calendar=group.calendar.endsWith(':Weekday')?'weekday':'holiday';
  assert.ok(group.calendar.endsWith(':Weekday')||
   group.calendar.endsWith(':SaturdayHoliday'));
  const direction=group.railDirection.split(':').pop();
  assert.ok(['Inbound','Outbound'].includes(direction));
  for(const number of group.numbers){
   seen++;
   assert.match(number,/^\d+[KFST]$/);
   assert.equal(parseInt(number,10)%2,direction==='Inbound'?0:1,
    'ODPT source public train number parity: '+number);
   const tail=parseInt(number,10)%100,suffix=number.slice(-1);
   if(suffix==='T'){
    assert.ok(tail===36||tail===38||tail===40||
     (tail>=80&&tail<=91),'full official T number in approved split band: '+number);
    if(tail<80)lowT++;
    numbersByCalendar[calendar].add(number);
   }else{
    kfs++;
    assert.ok(tail<=71||(tail>=80&&tail<=91),
     'official K/F/S number stays in documented source-number bands: '+number);
   }
   const sample={trainNumber:number,positionLineId:'Rinkai',
    sourceRailway:group.railway,trainType:group.trainType,
    railDirection:group.railDirection,calendarType:calendar,
    serviceDate:calendar==='weekday'?'2026-11-18':'2026-11-15'};
   // ODPT gives no actual carset: T digits select illustrative artwork only.
   // K/F/S tails 80-91 still require independently supplied model evidence.
   if(suffix==='T'||tail>=80)ambiguous++;
   if(suffix==='T'&&/^[0-9]{3,4}T$/.test(number)){
    const fallback=root.TrainNumberPngRanges.match(number,'Rinkai',sample);
    const threeDigit=/^[0-9]{3}T$/.test(number);
    assert.equal(fallback?.model,threeDigit?model70:model71,
     'T source number permits user-selected illustrative art: '+number);
    assert.equal(fallback?.source,threeDigit
     ?'rinkai-three-digit-t-display-default'
     :'rinkai-four-digit-t-display-default');
    assert.equal(fallback?.illustrative,true);
    assert.equal(fallback?.displayDefault,true);
   }else if(suffix==='T'||tail>=80){
    assert.equal(root.TrainNumberPngRanges.match(number,'Rinkai',sample),null,
     'unlisted T or K/F/S 80-91 needs source model evidence: '+number);
   }else{
    const matched=root.TrainNumberPngRanges.match(number,'Rinkai',sample);
    assert.equal(matched?.model,'E233系7000番台',
     '00–71 K/F/S is a generic E233 number reference, not a physical carset: '+number);
    assert.equal(matched?.planned,true);
   }
  }
 }
 assert.equal(seen,564);
 assert.equal(kfs,457);
 assert.equal(ambiguous,Array.from(snapshot.groups).reduce((n,g)=>n+
  g.numbers.filter(no=>no.endsWith('T')||parseInt(no,10)%100>=80).length,0));
 assert.equal(lowT,5);
 const t=catalog.rules.find(x=>x.id==='js-0132');
 for(const [calendar,prop] of [['weekday','weekday_numbers'],['holiday','holiday_numbers']]){
  assert.deepEqual([...numbersByCalendar[calendar]].sort(),
   [...t[prop]].sort(),'complete T roster equals official ODPT '+calendar);
 }
});
