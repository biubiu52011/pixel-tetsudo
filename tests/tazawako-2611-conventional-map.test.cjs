'use strict';
/* Tazawako 2611 strictly conventional, source-station and reference-art tests. */
const assert=require('node:assert/strict');
const {test}=require('node:test');
const crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const root={},context=vm.createContext({window:root,Date,console:{debug(){},warn(){},log(){},error(){}}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-tazawako-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
const index=root.JREastTazawakoNumberIndex202611;
const png='../images/列车/JR東日本/JR東日本_701系_5000番台.png';
const line=['Morioka','Maegata','Okama','Koiwai','Shizukuishi',
 'Harukiba','Akabuchi','Tazawako','Sashimaki','Jindai',
 'Shoden','Kakunodate','Uguisu-no','Ugo-Nagano','Yariminai',
 'Ugo-Yotsuya','Kita-Omagari','Omagari'];
function pos(n,opts={}){
 const date=opts.serviceDate||'2026-11-06';
 const calendar=opts.calendarType||'weekday';
 const type=/^(holiday|SaturdayHoliday)$/i.test(calendar)?'SaturdayHoliday':'Weekday';
 const scope=index.source[type];
 const dir=scope.Outbound[n]?'Outbound':'Inbound';
 const shape=(scope[dir]&&scope[dir][n])||[18,'Morioka','Omagari'];
 const start=line.indexOf(shape[1]),end=line.indexOf(shape[2]),step=start<=end?1:-1;
 const stations=[];
 if(start>=0&&end>=0)for(let j=start;j!==end+step;j+=step)
   stations.push('odpt.Station:JR-East.'+line[j]);
 return {
  trainNumber:n,positionLineId:'Tazawako',displayLineId:'Tazawako',
  sourceRailway:'odpt.Railway:JR-East.Tazawako',trainOperator:'JR-East',
  trainType:'odpt.TrainType:JR-East.Local',
  railDirection:'odpt.RailDirection:'+dir,
  positionSource:'supabase-train-run',estimated:true,
  serviceDate:date,calendarType:calendar,
  stationIndex:4,segmentToIndex:5,segmentProgress:.5,
  scheduledStopKeys:stations,
  vehicleIdentityStatus:'UNKNOWN',
  ...opts
 };
}
test('33 weekday, 32 holiday conventional 8xxM, no Komachi aliases',()=>{
 const source=index.source;
 assert.equal(Object.keys(source.Weekday.Outbound).length,17);
 assert.equal(Object.keys(source.Weekday.Inbound).length,16);
 assert.equal(Object.keys(source.SaturdayHoliday.Outbound).length,17);
 assert.equal(Object.keys(source.SaturdayHoliday.Inbound).length,15);
 for(const cal of ['Weekday','SaturdayHoliday']){
  for(const direction of ['Outbound','Inbound']){
   for(const [n,span] of Object.entries(source[cal][direction])){
    const p=pos(n,{calendarType:cal==='Weekday'?'weekday':'holiday',
      serviceDate:cal==='Weekday'?'2026-11-06':'2026-11-07'});
    assert.equal(p.railDirection,'odpt.RailDirection:'+direction);
    assert.equal(p.scheduledStopKeys.length,span[0],cal+' '+n+' count');
    assert.ok(index.verify(p),cal+' '+n+' official');
   }
  }
 }
 for(const n of ['3001M','3006M','3019M','3034M','5008M','5013M',
   '8052M','8065M','8836M','8837M','9017M','9285M','9832M',
   '621M','8621D','929M'])
   assert.equal(index.verify(pos(n)),null,n+' no false conventional plan');
});
test('source-specific 828M weekday only, public holidays use SaturdayHoliday',()=>{
 for(const day of ['2026-11-01','2026-11-03','2026-11-07','2026-11-08','2026-11-23']){
  assert.ok(index.verify(pos('823M',{serviceDate:day,calendarType:'holiday'})),day);
  assert.equal(index.verify(pos('823M',{serviceDate:day,calendarType:'weekday'})),null);
  assert.equal(index.verify(pos('828M',{serviceDate:day,calendarType:'holiday'})),null);
 }
 assert.ok(index.verify(pos('828M')));
 assert.equal(index.verify(pos('828M',{serviceDate:'2026-11-07',calendarType:'weekday'})),null);
 assert.equal(index.verify(pos('823M',{serviceDate:'2026-12-01'})),null);
});
test('truncated duplicate source segments do not become extra on-map trains',()=>{
 const p=pos('846M',{stationIndex:14,segmentToIndex:13});
 assert.equal(index.verify(p).stopCount,18);
 assert.equal(index.verify({...p,scheduledStopKeys:p.scheduledStopKeys.slice(-5)}),null);
 const q=pos('822M',{stationIndex:15,segmentToIndex:14});
 assert.equal(index.verify(q).stopCount,11);
 assert.equal(index.verify({...q,scheduledStopKeys:q.scheduledStopKeys.slice(0,8)}),null);
 const mid=pos('841M',{stationIndex:9,segmentToIndex:10});
 assert.equal(index.verify(mid).stopCount,18);
 assert.equal(index.verify({...mid,scheduledStopKeys:mid.scheduledStopKeys.slice(0,12)}),null);
});
test('historical SQL Uguisuno equals diagram Uguisu-no only on the correct route',()=>{
 for(const n of ['822M','825M','841M','846M','851M']){
  const sample=pos(n);
  const raw={...sample,scheduledStopKeys:sample.scheduledStopKeys.map(x=>
    x.replace(/Uguisu-no$/, 'Uguisuno'))};
  assert.ok(index.verify(raw),n+' SQL spelling still on map');
  assert.equal(index.resolve(raw).illustrationModel,'701系5000番台');
  const wrong={...raw,scheduledStopKeys:raw.scheduledStopKeys.map(x=>
    x.replace(/Uguisuno$/, 'UguisunoOther'))};
  assert.equal(index.verify(wrong),null,n+' no arbitrary station alias');
 }
});
test('foreign source, unsupported train date, forged stop order never authorize PNG',()=>{
 const a=pos('841M');
 for(const change of [
 {sourceRailway:'odpt.Railway:JR-East.AkitaShinkansen'},
 {positionLineId:'AkitaShinkansen'}, {displayLineId:'AkitaShinkansen'},
 {positionSource:'realtime-api'},{trainOperator:'JR-West'},
 {trainType:'odpt.TrainType:JR-East.Shinkansen'},
 {railDirection:'odpt.RailDirection:Inbound'},
 {scheduledStopKeys:[]},
 {scheduledStopKeys:a.scheduledStopKeys.slice().reverse()},
 {scheduledStopKeys:a.scheduledStopKeys.map((x,i)=>i===3?'odpt.Station:JR-East.Akita':x)}
 ])assert.equal(index.resolve({...a,...change}),null,JSON.stringify(change));
 assert.equal(index.resolve({...a,actualVehicleConfirmed:true}),null);
 assert.equal(index.resolve({...a,vehicleIdentityStatus:'EXACT'}),null);
 assert.equal(index.resolve({...a,vehicleFormationId:'S1'}),null);
 assert.equal(index.resolve({...a,realtimeVehicleType:'701系'}),null);
});
test('Tazawako 701 photo is permitted representative only, never physical consist',()=>{
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系5000番台',png,'Tazawako'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系5000番台',png,'AkitaShinkansen'),false);
 const p=pos('841M');
 const match=root.TrainNumberPngRanges.match(p.trainNumber,'Tazawako',p);
 assert.equal(match.pngPath,png);
 assert.equal(match.model,'701系5000番台');
 assert.equal(match.illustrative,true);
 assert.equal(match.actualVehicleConfirmed,false);
 const a=root.TrainVehicle.selectMarkerArtwork(p,false);
 assert.equal(a.kind,'vehicle');
 assert.equal(a.iconSrc,png);
 assert.equal(a.illustrative,true);
 assert.equal(a.representativeOnly,true);
 assert.equal(a.actualVehicleConfirmed,false);
 assert.equal(index.resolve(p).authorizesPNG,false);
 assert.equal(index.resolve({...p,vehiclePlan:{status:'PLANNED_MODEL',models:['E6系']}}),null);
});
test('lazy asset/manifest and estimator source guard shipped with exact SHA',()=>{
 const manifest=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-tazawako-2611-number-index.js';
 assert.deepEqual(manifest.lazyScopes.trains[path],['Tazawako']);
 assert.equal(manifest.lazy.trains.filter(p=>p===path).length,1);
 assert.equal(manifest.lazy.trains.indexOf(path),
  manifest.lazy.trains.indexOf('data/timetables/jreast-tadami-2611-number-index.js')+1);
 const page=fs.readFileSync('pages/trains.html','utf8');
 assert.match(page,/jreast-tazawako-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Tazawako"/);
 for(const path of [
  'data/timetables/jreast-tazawako-2611-number-index.js',
  'js/train-position-estimator.js'
 ]){
  const data=fs.readFileSync(path),sha=crypto.createHash('sha1')
   .update('blob '+data.length+'\0').update(data).digest('hex').slice(0,12);
  assert.ok(page.includes('../'+path+'?v='+sha),path+' correct blob fingerprint');
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Tazawako"&&tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/tazawakoIndex\.verify\(/);
});
