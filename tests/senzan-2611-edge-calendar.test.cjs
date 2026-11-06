'use strict';
/* Senzan 2611 Edge guard: actual service-date projection, not PNG suppression.
 * Run node --test tests/senzan-2611-edge-calendar.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const first=edge.indexOf('  // Senzan 2611: protect actual running dates');
const last=edge.indexOf('  // Ryomo 2611: number-scoped fleet reference only.',first);
assert.ok(first>0&&last>first,'Senzan guard must precede Ryomo guard');
const guard=edge.slice(first,last).replace(/:any\b/g,'');
const runFilter=new Function('db','result','selectedCalendar','lineId','serviceDate',
  'return (async()=>{'+guard+'})();');
const cal='odpt.Calendar:Weekday',rail='odpt.Railway:JR-East.Senzan';
const mk=(id,number,kind='regular_e721',dates=[])=>({
 source_template_id:id,calendar_urn:cal,
 direction_urn:kind==='satono_dated'
  ?'odpt.RailDirection:'+(number==='8821D'?'Outbound':'Inbound')
  :'odpt.RailDirection:Inbound',
 train_number:number,source_type_urn:'odpt.TrainType:JR-East.'+
  (kind==='satono_dated'?'Rapid':'Local'),
 published_type_urn:'odpt.TrainType:JR-East.'+
  (kind==='satono_dated'?'Rapid':'Local'),
 fleet_role:kind,candidate_models:[kind==='satono_dated'?'HB-E300系（SATONO）':'E721系'],
 illustration_model:kind==='satono_dated'?'HB-E300系（SATONO）':'E721系',
 source_url:'https://timetables.jreast.co.jp/2611/timetable-v/265u1.html',
 operating_dates:dates,reference_only:true,actual_vehicle_confirmed:false
});
const proofs=Array.from({length:104},(_,i)=>mk(i+1,(1820+i*2)+'M'));
proofs.push(mk(105,'8821D','satono_dated',['2026-11-06','2026-11-07']));
proofs.push(mk(106,'8822D','satono_dated',['2026-11-06','2026-11-07']));
const runFrom=p=>({
 source_template_id:p.source_template_id,
 service_id:p.calendar_urn,
 train_number:p.train_number,
 train_type:p.source_type_urn,
 rail_direction:p.direction_urn,
 network_key:rail,vehicle_type_label:'E721系 / 701系',
 vehicle_artwork_path:'bad-image.png',vehicle_plan_confirmed:true
});
function fakeDB(rows=proofs,error=null){
 return {from(table){
  assert.equal(table,'published_senzan_2611_fleet_scope');
  const filters={};
  return {
   select(){return this;},
   eq(key,value){filters[key]=value;
    if(Object.keys(filters).length===3){
     assert.deepEqual(filters,{edition:'2611',line_key:'Senzan',calendar_urn:cal});
     return Promise.resolve({data:rows,error});
    }
    return this;
   }
  };
 }};
}
async function apply(date,entries,db=fakeDB()){
 const runs=entries.map(runFrom);
 await runFilter(db,runs,cal,'Senzan',date);
 return runs;
}
test('regular E721 survives; SATONO only on operating days',async()=>{
 const available=await apply('2026-11-06',[proofs[0],proofs[104],proofs[105]]);
 assert.equal(available.length,3);
 const satono=available.find(x=>x.train_number==='8821D');
 assert.equal(satono.service_name,'いろどりSATONO');
 assert.equal(satono.train_type,'odpt.TrainType:JR-East.Rapid');
 assert.equal(satono.vehicle_type_label,null);
 assert.equal(satono.vehicle_plan_confirmed,false);
 assert.equal(satono.vehicle_artwork_path,null);
 assert.equal(satono.timetable_date_verified,false);
 assert.equal(satono.published_number_fleet_reference.actualVehicleConfirmed,false);
 const off=await apply('2026-11-10',[proofs[0],proofs[104],proofs[105]]);
 assert.equal(off.length,1);
 assert.equal(off[0].train_number,proofs[0].train_number);
});
test('December-only old trains and wrong railway/calendar/type cannot render',async()=>{
 const old=mk(107,'9821D','satono_dated',['2026-12-05']);
 const wrong=runFrom(proofs[0]);wrong.network_key='odpt.Railway:JR-East.Tohoku';
 const manual=[runFrom(old),wrong];
 await runFilter(fakeDB(),manual,cal,'Senzan','2026-11-06');
 assert.equal(manual.length,0);
});
test('incomplete/erroneous roster rejects entire projection',async()=>{
 await assert.rejects(()=>apply('2026-11-06',[proofs[0]],fakeDB(proofs.slice(0,105))),
   /SENZAN_2611_NUMBER_FLEET_SCOPE_UNAVAILABLE/);
 await assert.rejects(()=>apply('2026-11-06',[proofs[0]],fakeDB(proofs,new Error('db unavailable'))),
   /SENZAN_2611_NUMBER_FLEET_SCOPE_UNAVAILABLE/);
});
test('other lines and dates remain unchanged',async()=>{
 const list=[runFrom(proofs[0]),runFrom(proofs[104])];
 await runFilter(fakeDB(),list,cal,'Ryomo','2026-11-10');
 assert.equal(list.length,2);
 await runFilter(fakeDB(),list,cal,'Senzan','2026-12-05');
 assert.equal(list.length,2);
});
