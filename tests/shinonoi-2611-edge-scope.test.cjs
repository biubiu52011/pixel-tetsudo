'use strict';
/* Shinonoi 2611 Supabase train-runs scoped reference projection contract. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const start=edge.indexOf('  // Shinonoi 2611: use existing published 383 Shinano plans');
const end=edge.indexOf('  // Senzan 2611: protect actual running dates',start);
assert.ok(start>0&&end>start,'Shinonoi guard location');
const guard=edge.slice(start,end).replace(/:any\b/g,'');
const apply=new Function('db','result','selectedCalendar','lineId','serviceDate',
 'return (async()=>{'+guard+'})();');
const cal='odpt.Calendar:Weekday',rail='odpt.Railway:JR-East.Shinonoi';
function proof(id,role){
 const limited=role==='shinano_383',rapid=role==='rapid_211_reference';
 return {
  source_template_id:id,calendar_urn:cal,
  direction_urn:limited?'odpt.RailDirection:Outbound':'odpt.RailDirection:Inbound',
  train_number:limited?'1001M':rapid?'2530M':(400+id*2)+'M',
  train_type_urn:'odpt.TrainType:JR-East.'+
    (limited?'LimitedExpress':rapid?'Rapid':'Local'),
  fleet_role:role,
  candidate_models:limited?['383系']:rapid?['211系（長野地区）']:
    ['211系（長野地区）','E127系100番台'],
  illustration_model:limited?'383系':'211系（長野地区）',
  number_evidence_scope:limited?'existing_official_service_vehicle_plan':
   'historical_source_only',
  source_url:'https://timetables.jreast.co.jp/2611/timetable-v/116u1.html',
  reference_only:true,actual_vehicle_confirmed:false
 };
}
const rows=Array.from({length:142},(_,i)=>proof(i+1,'mixed_local'));
rows.push(proof(143,'rapid_211_reference'),proof(144,'shinano_383'));
function runOf(x){
 return {source_template_id:x.source_template_id,service_id:x.calendar_urn,
  rail_direction:x.direction_urn,train_number:x.train_number,
  train_type:x.train_type_urn,network_key:rail,
  vehicle_type_label:'383系（しなの）/ E353系（あずさ）',
  vehicle_plan_confirmed:false,
  vehicle_artwork_path:'../images/列车/JR東日本/JR東日本_E353系.png',
  timetable_date_verified:true};
}
function db(data=rows,error=null){
 return {from(table){
  assert.equal(table,'published_shinonoi_2611_fleet_scope');
  const filters={};
  return {select(){return this;},eq(key,value){
   filters[key]=value;
   if(Object.keys(filters).length===3){
    assert.deepEqual(filters,{edition:'2611',line_key:'Shinonoi',calendar_urn:cal});
    return Promise.resolve({data,error});
   }
   return this;
  }};
 }};
}
async function sample(arr,date='2026-11-06',source=db()){
 const runs=arr.map(runOf);await apply(source,runs,cal,'Shinonoi',date);return runs;
}
test('383 official plan remains planned, local mixed labels never become actual',async()=>{
 const out=await sample([rows[0],rows[142],rows[143]]);
 assert.equal(out.length,3);
 const shinano=out.find(x=>x.train_number==='1001M');
 assert.equal(shinano.vehicle_type_candidates,'383系');
 assert.equal(shinano.vehicle_plan_confirmed,true);
 assert.equal(shinano.vehicle_type_label,null);
 assert.equal(shinano.vehicle_artwork_path,null);
 assert.equal(shinano.timetable_date_verified,false);
 assert.equal(shinano.published_number_fleet_reference.actualVehicleConfirmed,false);
 const local=out.find(x=>x.source_template_id===1);
 assert.equal(local.vehicle_plan_confirmed,false);
 assert.equal(local.vehicle_type_candidates,'211系（長野地区） / E127系100番台');
 assert.equal(local.train_number_verification,'historical-source-only-116-2611');
});
test('unlisted train, bad direction/type/source and wrong source row are omitted',async()=>{
 const good=runOf(rows[0]),other=runOf(rows[143]);
 other.network_key='odpt.Railway:JR-East.Chuo';
 const wrongNumber={...good,train_number:'8032M'};
 const wrongType={...good,train_type:'odpt.TrainType:JR-East.Rapid'};
 const missing=runOf({...rows[0],source_template_id:999,train_number:'9999M'});
 const list=[good,other,wrongNumber,wrongType,missing];
 await apply(db(),list,cal,'Shinonoi','2026-11-06');
 assert.equal(list.length,1);assert.equal(list[0].train_number,rows[0].train_number);
});
test('incomplete reference scope fails closed',async()=>{
 await assert.rejects(()=>sample([rows[0]],'2026-11-06',db(rows.slice(0,143))),
  /SHINONOI_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE/);
 await assert.rejects(()=>sample([rows[0]],'2026-11-06',db(rows,new Error('unavailable'))),
  /SHINONOI_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE/);
});
test('not applied to other lines and outside November',async()=>{
 const list=[runOf(rows[0]),runOf(rows[143])];
 await apply(db(),list,cal,'Senzan','2026-11-06');
 assert.equal(list.length,2);
 await apply(db(),list,cal,'Shinonoi','2026-12-01');
 assert.equal(list.length,2);
});
