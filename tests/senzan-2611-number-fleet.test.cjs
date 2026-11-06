'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const w={},ctx=vm.createContext({window:w,Date,console:{
 debug(){},warn(){},log(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-senzan-2611-number-index.js','js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const mk=(n,cal='weekday',dir='Outbound',type='Local',date='2026-11-06')=>({
 trainNumber:n,calendarType:cal,railDirection:'odpt.RailDirection:'+dir,
 trainType:'odpt.TrainType:JR-East.'+type,serviceDate:date,
 positionLineId:'Senzan',displayLineId:'Senzan',
 sourceRailway:'odpt.Railway:JR-East.Senzan',
 positionSource:'supabase-train-run',estimated:true,vehicleIdentityStatus:'UNKNOWN'});
const resolve=p=>w.JREastSenzanNumberIndex202611.resolve(p);
const art=p=>w.TrainVehicle.selectMarkerArtwork(p,false);
test('104 official M numbers per calendar, 52 each direction',()=>{
 const rapid=new Set(['3820M','3830M','3834M','3838M','3827M','3831M','3835M']);
 for(const cal of ['weekday','holiday']){
  for(const dir of ['Outbound','Inbound']){
   let count=0;
   for(let i=100;i<10000;i++){
    const n=i+'M',p=mk(n,cal,dir,rapid.has(n)?'Rapid':'Local');
    if(resolve(p))count++;
   }
   assert.equal(count,52,cal+' '+dir);
  }
 }
});
test('M is E721 planned reference and does not claim physical carset',()=>{
 for(const [n,dir,type] of [['1829M','Outbound','Local'],
  ['1820M','Inbound','Local'],['3820M','Inbound','Rapid'],
  ['3831M','Outbound','Rapid']]){
  const p=mk(n,'weekday',dir,type),ref=resolve(p);
  assert.equal(ref.authorizesPNG,false);
  assert.equal(ref.model,null);
  assert.equal(art(p).planned,true);
  assert.equal(art(p).iconSrc,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png');
 }
});
test('SATONO selected dates; never admit December-only Omoide in November',()=>{
 const satono='../images/列车/JR東日本/JR東日本_HB-E300系_SATONO_1号車.png';
 for(const day of ['2026-11-01','2026-11-06','2026-11-09',
  '2026-11-13','2026-11-16','2026-11-21','2026-11-24','2026-11-30']){
  assert.equal(art(mk('8821D','weekday','Outbound','Rapid',day)).iconSrc,satono,day);
 }
 for(const date of ['2026-11-04','2026-11-10','2026-11-25'])
  assert.equal(resolve(mk('8821D','weekday','Outbound','Rapid',date)),null,date);
 for(const n of ['9821D','9822D'])
  assert.equal(resolve(mk(n,'holiday',n==='9821D'?'Outbound':'Inbound','Rapid')),null);
});
test('source and vehicle boundaries cannot manufacture PNG',()=>{
 const a=mk('1829M');
 for(const change of [
  {sourceRailway:'odpt.Railway:JR-East.Tohoku'},
  {displayLineId:'BanetsuWest'},{positionLineId:'Joetsu'},
  {vehicleIdentityStatus:'EXACT'}, {realtimeVehicleType:'E721系'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {serviceDate:'2026-12-06'},{trainOperator:'TokyoMetro'}
 ])assert.equal(resolve({...a,...change}),null,JSON.stringify(change));
 assert.equal(w.TrainVehicle.selectMarkerArtwork(a,true).kind,'unresolved');
});
test('manifest and gallery are consistent with generated HTML',()=>{
 const m=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-senzan-2611-number-index.js';
 assert.equal(m.lazy.trains.filter(x=>x===path).length,1);
 assert.equal(m.lazy.trains.indexOf(path),m.lazy.trains.indexOf('data/timetables/train-number-png-ranges.js')+1);
 assert.equal(m.lazyScopes.trains[path][0],'Senzan');
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const f of [path,'data/timetables/vehicle-garage-png-map.js']){
  const b=fs.readFileSync(f),hash=crypto.createHash('sha1')
   .update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+f+'?v='+hash),'stale '+f);
 }
});
