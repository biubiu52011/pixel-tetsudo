'use strict';
// 大船渡線 2026-11: 269 JR rail D numbers ≠ BRT F/K buses.
// Regular KiHa110 has an approved Ofunato fleet illustration;
// holiday KiHa100 Pokemon has NO corresponding authentic PNG.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={};
const ctx=vm.createContext({window:root,Date,console:{
 log(){},warn(){},debug(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const f of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js',
 'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const png='../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png';
const inNumbers=['322D','324D','326D','328D','330D','332D','334D','338D','340D'];
const outNumbers=['321D','323D','325D','329D','331D','333D','335D','337D'];
const full=['Ichinoseki','Mataki','Rikuchu-Kanzaki','Iwanoshita',
 'Rikuchu-Matsukawa','Geibikei','Shibajuku','Surisawa',
 'Senmaya','Konashi','Yagoshi','Orikabe','Niitsuki','Kesennuma'];
const poke=['Ichinoseki','Rikuchu-Matsukawa','Geibikei','Senmaya','Kesennuma'];
const pokemonDates=['2026-11-01','2026-11-03','2026-11-07',
 '2026-11-08','2026-11-14','2026-11-15','2026-11-21',
 '2026-11-22','2026-11-23','2026-11-28','2026-11-29'];
function holiday(day){
 const dow=new Date(day+'T12:00:00Z').getUTCDay();
 return dow===0||dow===6||['2026-11-03','2026-11-23'].includes(day);
}
function position(n,date='2026-11-06',overrides={}){
 const numeric=Number((n.match(/^([0-9]+)/)||['','0'])[1]),
   direction=numeric%2===0?'Inbound':'Outbound',
   directionUrn='odpt.RailDirection:'+direction,
   isPokemon=['8327D','8336D'].includes(n),
   model=isPokemon?'キハ100系（POKÉMON with YOU）':'キハ110系',
   cal=holiday(date)?'holiday':'weekday';
 let source=isPokemon?poke.slice():n==='322D'?full.slice(0,9):full.slice();
 if(direction==='Inbound')source.reverse();
 const proof={
  source:'sql-jreast-2611-number-roster',lineId:'Ofunato',
  trainNumber:n,serviceDate:date,direction:directionUrn,
  calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
  trainType:'odpt.TrainType:JR-East.'+(isPokemon?'Rapid':'Local'),
  segmentKey:'ichinoseki_kesennuma_rail',
  transportScope:isPokemon?'rail_pokemon':'rail_regular',
  sourceTemplateId:5321,sourceStopKeys:source.slice(),
  plannedCandidates:[model],model:model,
  pngReference:isPokemon?null:png,
  operatingDates:isPokemon?pokemonDates.slice():[],
  officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/269'+
    (direction==='Inbound'?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
  stopClockStatus:'historical_not_2611_verified',
  referenceOnly:true,actualVehicleConfirmed:false
 };
 return {
  trainNumber:n,positionLineId:'Ofunato',displayLineId:'Ofunato',
  sourceRailway:'odpt.Railway:JR-East.Ofunato',
  trainOperator:'JR-East',railDirection:directionUrn,
  trainType:proof.trainType,
  calendarType:cal,serviceDate:date,positionSource:'supabase-train-run',
  estimated:true,officialNumberVerified:true,
  vehicleIdentityStatus:'UNKNOWN',plannedVehicleCandidates:[model],
  scheduledStopKeys:source.slice(),
  sqlPublishedNumberFleetReference:proof,
  ...overrides
 };
}
const verify=p=>root.TrainNumberPngRanges.verifyOfunatoService(p);
const matched=p=>root.TrainVehicle.lookupTrainNumberRangePng(p);
test('34 edition-scoped ordinary rail SQL records = 17 exact D numbers x 2 calendars',()=>{
 assert.equal(inNumbers.length,9);
 assert.equal(outNumbers.length,8);
 assert.equal(new Set([...inNumbers,...outNumbers]).size,17);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Ofunato'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Kamaishi'),false);
 assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png'),true);
 for(const n of [...inNumbers,...outNumbers]){
  for(const date of ['2026-11-06','2026-11-07','2026-11-23']){
   const p=position(n,date),ref=verify(p);
   assert.equal(ref?.number,n,n+' on '+date);
   assert.equal(ref?.kind,'rail_regular');
   assert.equal(ref?.pngPath,png);
   assert.equal(ref?.actualVehicleConfirmed,false);
   assert.equal(matched(p)?.pngPath,png,n+' on '+date);
   assert.equal(matched(p)?.planned,true);
  }
 }
});
test('322D begins at Senmaya, not Kesennuma, and has exactly 9 stops',()=>{
 const a=position('322D'),v=verify(a);
 assert.equal(v?.number,'322D');
 assert.equal(a.scheduledStopKeys[0],'Senmaya');
 assert.equal(a.scheduledStopKeys.at(-1),'Ichinoseki');
 assert.equal(a.scheduledStopKeys.length,9);
 const wrong=position('322D');
 wrong.scheduledStopKeys=full.slice().reverse();
 assert.equal(verify(wrong),null);
});
test('holiday-only Pokemon 8327D/8336D are real rail, KiHa100, but have no PNG',()=>{
 for(const date of pokemonDates)
  for(const n of ['8327D','8336D']){
   const p=position(n,date),a=verify(p);
   assert.equal(a?.kind,'rail_pokemon',n+' '+date);
   assert.equal(a?.model,'キハ100系（POKÉMON with YOU）');
   assert.equal(a?.pngPath,null);
   assert.equal(matched(p),null,'No generic KiHa110 livery for '+n);
   assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
 for(const d of ['2026-11-02','2026-11-06','2026-11-09',
                  '2026-11-13','2026-11-30','2026-12-05'])
  for(const n of ['8327D','8336D']){
   const p=position(n,d);
   assert.equal(verify(p),null,n+' '+d);
   assert.equal(matched(p),null,n+' '+d);
  }
});
test('BRT F/K, 2027-Feb Hinabi and other numbers never borrow railway PNG',()=>{
 for(const n of ['1301F','3307F','7308F','1355F','1918K',
                  '9327D','9336D','327D','1918D','8326D']){
  const p=position(n,'2026-11-07');
  assert.equal(verify(p),null,n);
  assert.equal(matched(p),null,n);
 }
});
test('line, transport, calendar, exact route and actual-car mismatches fail',()=>{
 const base=position('321D','2026-11-06'),
   proof=base.sqlPublishedNumberFleetReference;
 const wrong=[
  {positionLineId:'Kesennuma'},{displayLineId:'TohokuMain'},
  {sourceRailway:'odpt.Railway:JR-East.Kesennuma'},
  {trainOperator:'JR-West'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {calendarType:'holiday'},
  {serviceDate:'2026-10-31'},
  {positionSource:'realtime-api'},
  {estimated:false},{officialNumberVerified:false},
  {vehicleIdentityStatus:'EXACT'},
  {plannedVehicleCandidates:['キハ100系']},
  {realtimeVehicleType:'キハ100系'},
  {scheduledStopKeys:['Ichinoseki','Kesennuma']},
  {scheduledStopKeys:[...base.scheduledStopKeys,'Sakari']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{...proof,transportScope:'brt_only'}},
  {sqlPublishedNumberFleetReference:{...proof,model:'キハ100系'}},
  {sqlPublishedNumberFleetReference:{...proof,pngReference:null}},
  {sqlPublishedNumberFleetReference:{...proof,referenceOnly:false}},
  {sqlPublishedNumberFleetReference:{...proof,sourceTemplateId:0}}
 ];
 for(const change of wrong)
  assert.equal(matched({...base,...change}),null,JSON.stringify(change));
});
test('migration and edge enforce published transport mode, dates and source',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+
  '20261106041500_ofunato_2611_rail_brt_pokemon_vehicle_roster.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const token of ['published_ofunato_2611_number_roster',
  'train_number ~ \'[FK]$\'','8327D','8336D',
  '2026-11-23','brt_only','rail_pokemon',
  'source_template_id','png_reference IS NULL'])
  assert.ok(sql.includes(token),token);
 assert.ok(edge.includes('OFUNATO_2611_RAIL_BRT_NUMBER_ROSTER_UNAVAILABLE'));
 assert.ok(edge.includes('proof.transport_scope==="brt_only"'));
 assert.ok(edge.includes('Number(run.source_template_id)'));
 assert.ok(edge.includes('run.train_type="odpt.TrainType:JR-East.Rapid"'));
 assert.ok(edge.includes('run.vehicle_historical_source_label=null'));
 assert.ok(est.includes('officialOfunatoPlan'));
 assert.ok(est.includes('verifyOfunatoService'));
 assert.ok(est.includes('_ofunatoPokemon'));
});
