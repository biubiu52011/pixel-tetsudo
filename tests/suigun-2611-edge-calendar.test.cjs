'use strict';
/* Source-scoped JR-East Suigun/branch monthly Edge calendar projection. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const first=source.indexOf('  // Suigun (main) + SuigunBranch (Hitachi-Ota) 2611:');
const end=source.indexOf('  // Shinonoi 2611: use existing published 383 Shinano plans',first);
assert.ok(first>0&&end>first,'Suigun date gate in canonical train-runs');
const block=source.slice(first,end).replace(/:any\b/g,'');
const apply=new Function('db','result','selectedCalendar','lineId','serviceDate',
 'return (async()=>{'+block+'})();');
const cal='odpt.Calendar:SaturdayHoliday',weekday='odpt.Calendar:Weekday';
const mk=(id,number,kind='kiha_e130_0_reference',line='Suigun',calendar=cal,dates=[],excluded=[])=>{
 const trolley=kind==='kazekko_excursion_no_png';
 return {source_template_id:id,calendar_urn:calendar,
  direction_urn:'odpt.RailDirection:'+(parseInt(number)%2?'Outbound':'Inbound'),
  train_number:number,source_type_urn:'odpt.TrainType:JR-East.Local',
  published_type_urn:'odpt.TrainType:JR-East.'+(trolley?'Rapid':'Local'),
  source_occurrence:0,fleet_role:kind,
  candidate_models:trolley?[]:['キハE130系0番台'],
  illustration_model:trolley?null:'キハE130系0番台',
  png_reference:trolley?null:'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',
  operating_dates:dates,excluded_dates:excluded,
  number_evidence_scope:trolley?'official-2611-number-and-dated-service':'historical-source-number-with-2611-line-roster',
  source_url:'https://timetables.jreast.co.jp/2611/timetable-v/243d2.html',
  reference_only:true,actual_vehicle_confirmed:false,line_key:line};
};
const holidayMain=Array.from({length:79},(_,i)=>mk(i+1,(821+2*i)+'D'));
holidayMain.push(mk(80,'9821D','kazekko_excursion_no_png','Suigun',cal,['2026-11-14','2026-11-15']));
holidayMain.push(mk(81,'9822D','kazekko_excursion_no_png','Suigun',cal,['2026-11-14','2026-11-15']));
holidayMain.push(mk(82,'9841D','kiha_e130_0_reference','Suigun',cal,['2026-11-21']));
holidayMain.push(mk(83,'341D','kiha_e130_0_reference','Suigun',cal,[],['2026-11-22']));
const mainWeekday=Array.from({length:72},(_,i)=>mk(200+i,(821+i*2)+'D','kiha_e130_0_reference','Suigun',weekday));
mainWeekday.push(mk(300,'9329D','kiha_e130_0_reference','Suigun',weekday,['2026-11-10','2026-11-11','2026-11-12']));
mainWeekday.push(mk(301,'9329D','kiha_e130_0_reference','Suigun',weekday,['2026-11-17','2026-11-18','2026-11-19']));
mainWeekday.push(mk(302,'9324D','kiha_e130_0_reference','Suigun',weekday,['2026-11-17','2026-11-18','2026-11-19']));
mainWeekday.push(mk(303,'8325D','kiha_e130_0_reference','Suigun',weekday,['2026-11-02','2026-11-03','2026-11-26','2026-11-27','2026-11-30']));
const branchWeekday=Array.from({length:26},(_,i)=>mk(400+i,(920+i)+'D','kiha_e130_0_reference','SuigunBranch',weekday));
function run(x){
 return {source_template_id:x.source_template_id,service_id:x.calendar_urn,
  rail_direction:x.direction_urn,train_number:x.train_number,
  train_type:x.source_type_urn,
  network_key:'odpt.Railway:JR-East.'+x.line_key,
  vehicle_type_label:'キハE130系 / キハ110系',
  vehicle_type_candidates:'キハ110系',
  vehicle_plan_confirmed:true,
  vehicle_artwork_path:'../images/列车/JR東日本/JR東日本_キハ110系.png',
  timetable_date_verified:true};
}
function fake(rows,error=null){
 return {from(table){
  assert.equal(table,'published_suigun_2611_fleet_scope');
  const params={};
  return {select(){return this;},eq(k,v){
   params[k]=v;
   if(Object.keys(params).length===3){
    assert.deepEqual(params,{edition:'2611',line_key:rows[0].line_key,
      calendar_urn:rows[0].calendar_urn});
    return Promise.resolve({data:rows,error});
   }
   return this;
  }};
 }};
}
async function check(records,date,rows=holidayMain,line='Suigun'){
 const returned=records.map(run);
 await apply(fake(rows),returned,rows[0].calendar_urn,line,date);
 return returned;
}
test('Kazekko runs only November 14/15 as Rapid without KiHaE130 image',async()=>{
 const on=await check([holidayMain[0],holidayMain[79],holidayMain[80]],'2026-11-14');
 assert.equal(on.length,3);
 for(const k of ['9821D','9822D']){
  const x=on.find(z=>z.train_number===k);
  assert.ok(x);
  assert.equal(x.train_type,'odpt.TrainType:JR-East.Rapid');
  assert.equal(x.service_name,'風っこ水郡線紅葉号');
  assert.equal(x.vehicle_type_candidates,null);
  assert.equal(x.vehicle_artwork_path,null);
  assert.equal(x.vehicle_plan_confirmed,false);
  assert.equal(x.timetable_date_verified,false);
  assert.equal(x.published_number_fleet_reference.actualVehicleConfirmed,false);
 }
 const off=await check([holidayMain[0],holidayMain[79],holidayMain[80]],'2026-11-08');
 assert.equal(off.length,1);
});
test('special 9841D only Nov21; historically wrong 341D Nov22 is suppressed',async()=>{
 const on=await check([holidayMain[81],holidayMain[82]],'2026-11-21');
 assert.equal(on.length,2);
 const next=await check([holidayMain[81],holidayMain[82]],'2026-11-22');
 assert.equal(next.length,0);
});
test('duplicate source 9329D split gets distinct maintenance dates',async()=>{
 const candidates=[mainWeekday[72],mainWeekday[73],mainWeekday[74]];
 const d12=await check(candidates,'2026-11-12',mainWeekday);
 assert.deepEqual(d12.map(x=>x.source_template_id),[300]);
 const d18=await check(candidates,'2026-11-18',mainWeekday);
 assert.deepEqual(d18.map(x=>x.source_template_id),[301,302]);
 const d06=await check(candidates,'2026-11-06',mainWeekday);
 assert.equal(d06.length,0);
});
test('same 920D branch number is not interchangeable with main line',async()=>{
 const a=branchWeekday[0];
 const passed=await check([a],'2026-11-06',branchWeekday,'SuigunBranch');
 assert.equal(passed.length,1);
 assert.equal(passed[0].vehicle_type_candidates,'キハE130系0番台');
 const wrong=[run(a)];wrong[0].network_key='odpt.Railway:JR-East.Suigun';
 await apply(fake(branchWeekday),wrong,weekday,'SuigunBranch','2026-11-06');
 assert.equal(wrong.length,0);
});
test('obsolete candidate identity and unrecognized IDs cannot enter projection',async()=>{
 const a=run(holidayMain[0]),b=run(holidayMain[0]);b.source_template_id=65797;
 const c=run(holidayMain[0]);c.train_number='9822D';
 const list=[a,b,c];
 await apply(fake(holidayMain),list,cal,'Suigun','2026-11-06');
 assert.equal(list.length,1);
 assert.equal(list[0].vehicle_artwork_path,null);
 assert.equal(list[0].vehicle_type_label,null);
 assert.equal(list[0].vehicle_plan_confirmed,false);
});
test('partial scope or database error fails closed; other lines unaffected',async()=>{
 await assert.rejects(
  ()=>apply(fake(holidayMain.slice(0,82)),[run(holidayMain[0])],cal,'Suigun','2026-11-06'),
  /SUIGUN_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE/);
 await assert.rejects(
  ()=>apply(fake(holidayMain,new Error('offline')),[run(holidayMain[0])],cal,'Suigun','2026-11-06'),
  /SUIGUN_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE/);
 const untouched=[run(holidayMain[0])];
 await apply(fake(holidayMain),untouched,cal,'Senzan','2026-11-06');
 await apply(fake(holidayMain),untouched,cal,'Suigun','2026-12-01');
 assert.equal(untouched.length,1);
});
