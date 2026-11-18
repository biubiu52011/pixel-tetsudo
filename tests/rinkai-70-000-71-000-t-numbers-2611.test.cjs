'use strict';
// Frozen 2611 TWR audit is historical provenance. The runtime pool is
// intentionally date/calendar-independent and must not claim an actual Z set.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={};
const context=vm.createContext({
 window:root,Date,console:{log(){},warn(){},debug(){},error(){}}
});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const model70='東京臨海高速鉄道70-000形';
const model71='東京臨海高速鉄道71-000形';
const png70='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png';
const png71='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png';
const mByOdd={81:model70,83:model70,85:model71,87:model70,89:model71,91:model70};
function sample(no,line='Rinkai',override={}){
 const n=parseInt(no,10);
 return {
  trainNumber:no,positionLineId:line,displayLineId:line,
  sourceRailway:line==='Rinkai'
   ?'odpt.Railway:TWR.Rinkai':'odpt.Railway:JR-East.SaikyoKawagoe',
  trainOperator:line==='Rinkai'?'TWR':'JR-East',
  trainType:line==='Rinkai'
   ?'odpt.TrainType:TWR.Local':'odpt.TrainType:JR-East.Local',
  railDirection:n%2===0?'odpt.RailDirection:Inbound':'odpt.RailDirection:Outbound',
  serviceDate:'2030-06-01',calendarType:'holiday',
  positionSource:'realtime-api',...override
 };
}
function lookup(no,line='Rinkai',overrides={}){
 return root.TrainNumberPngRanges.match(no,line,sample(no,line,overrides));
}
function poolModel(n){
 const tail=parseInt(n,10)%100;
 return mByOdd[tail%2===0?tail+1:tail];
}
test('all twelve 80-91 K/F/S/T tails are reusable irrespective of date and calendar',()=>{
 for(const date of ['','2026-04-03','2026-11-18','2026-12-01','2030-06-01']){
  for(const cal of ['weekday','holiday','']){
   for(let tail=80;tail<=91;tail++){
    const model=poolModel(tail);
    const png=model===model70?png70:png71;
    for(const suffix of ['K','F','S','T']){
     for(const line of suffix==='T'?['Rinkai']:['Rinkai','SaikyoKawagoe']){
      const n=String(tail%2===0?1000+tail:1000+tail)+suffix;
      const hit=lookup(n,line,{serviceDate:date,calendarType:cal});
      assert.equal(hit?.model,model,n+' '+line+' '+date+' '+cal);
      assert.equal(hit?.pngPath,png);
      assert.equal(hit?.source,'twr-composite-number-band-pool');
      assert.equal(hit?.planned,true);
      assert.equal(hit?.illustrative,true);
      assert.equal(hit?.referenceOnly,true);
      assert.equal(hit?.displayDefault,true);
     }
    }
   }
  }
 }
});
test('number bands, not old 2611 T day lists, decide eligibility',()=>{
 for(const [no,model] of [
  ['580T',model70],['584T',model71],['1080T',model70],
  ['1088T',model71],['888T',model71],['991T',model70],
  ['1984K',model71],['1983S',model70]
 ])assert.equal(lookup(no)?.model,model,no);
 for(const [no,model] of [
  ['636T',model70],['738T',model70],
  ['1638T',model71],['1640T',model71]
 ]){
  const h=lookup(no,'Rinkai',{serviceDate:'2032-10-01',calendarType:'holiday'});
  assert.equal(h?.model,model,no);
  assert.match(h?.source||'',/rinkai-.*-t-display-default/);
 }
 for(const no of ['637T','739T','1079T','1080X','89T','1639T']){
  assert.equal(lookup(no),null,no);
 }
});
test('independent explicit model overrides pooled reference, disagreements fail closed',()=>{
 for(const name of [model70,model71]){
  const x=lookup('1984K','Rinkai',{realtimeVehicleType:name});
  assert.equal(x?.model,name);
  assert.equal(x?.pngPath,name===model70?png70:png71);
  assert.notEqual(x?.source,'twr-composite-number-band-pool');
 }
 assert.equal(lookup('1984K','Rinkai',{
  realtimeVehicleType:model70,realtimeDerivedVehicleType:model71
 }),null);
 assert.equal(lookup('1984K','Rinkai',{realtimeVehicleType:'E233系7000番台'}),null);
});
test('line/owner, train type and direction still gate composite numbers',()=>{
 assert.equal(lookup('1984K','Rinkai',{
  sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'}),null);
 assert.equal(lookup('1088T','SaikyoKawagoe'),null);
 assert.equal(lookup('1088T','Rinkai',{
  sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'}),null);
 assert.equal(lookup('1088T','Rinkai',{
  trainType:'odpt.TrainType:TWR.Rapid'}),null);
 assert.equal(lookup('1984K','Rinkai',{
  railDirection:'odpt.RailDirection:Outbound'}),null);
 assert.equal(lookup('1985K','SaikyoKawagoe',{
  railDirection:'odpt.RailDirection:Inbound'}),null);
 assert.equal(lookup('1984K','SaikyoKawagoe',{
  railDirection:'odpt.RailDirection:Southbound'})?.model,model71);
 assert.equal(lookup('1985K','SaikyoKawagoe',{
  railDirection:'odpt.RailDirection:Northbound'})?.model,model71);
});
test('other K/F/S families also have no 2611 month dependency',()=>{
 for(const date of ['','2025-01-01','2026-11-18','2031-01-01']){
  assert.equal(lookup('510S','SaikyoKawagoe',{serviceDate:date})?.model,
   'E233系7000番台');
  assert.equal(lookup('1974K','SaikyoKawagoe',{serviceDate:date})?.model,
   '相鉄12000系');
 }
});
test('historic ODPT audit is preserved as evidence of public numbers, not carsets',()=>{
 const snapshot=JSON.parse(fs.readFileSync(
  'data/audits/twr-odpt-traintimetable-20260316-number-roster.json','utf8'));
 assert.equal(snapshot.source,'ODPT odpt:TrainTimetable (TWR)');
 assert.equal(snapshot.providerDcDate,'2026-03-16');
 assert.equal(snapshot.recordCount,564);
 assert.equal(snapshot.trainVehicleTypeEvidenceCount,0);
 let covered=0;
 for(const group of snapshot.groups){
  const calendar=group.calendar.endsWith(':Weekday')?'weekday':'holiday';
  for(const number of group.numbers){
   const tail=parseInt(number,10)%100;
   const suffix=number.slice(-1);
   const ref=lookup(number,'Rinkai',{
    calendarType:calendar,serviceDate:'2032-03-01',
    railDirection:group.railDirection
   });
   assert.ok(ref,number+' source number is covered');
   if(suffix==='T'&&tail<80){
    assert.match(ref.source,/rinkai-.*-t-display-default/);
   }else if(tail>=80){
    assert.equal(ref.model,poolModel(tail),number);
   }else{
    assert.equal(ref.model,'E233系7000番台',number);
   }
   covered++;
  }
 }
 assert.equal(covered,564);
 // Historical public T numbers live in the original ODPT archive, NOT
 // in the undated composite runtime-number rules. Keep the two separate.
 const archived={weekday:new Set(),holiday:new Set()};
 for(const group of snapshot.groups){
  const calendar=group.calendar.endsWith(':Weekday')?'weekday':'holiday';
  for(const number of group.numbers){
   if(number.endsWith('T'))archived[calendar].add(number);
  }
 }
 assert.equal(archived.weekday.size,53);
 assert.equal(archived.holiday.size,54);
 // This historical roster does not authorize current physical carsets.
});
