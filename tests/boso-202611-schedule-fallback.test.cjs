'use strict';
/* Boso timetable projection regression: station clock samples from the
 * owner's existing Uchibo/Sotobo SQL templates (not a wholesale JR East
 * timetable copy). 2026-11-04 JST is a weekday.
 * The timetable snapshot remains "undated_not_current_verified":
 * these checks prove rendering/clock interpolation, not complete 2611
 * revision parity or physical trainset assignment.
 * Run: node --test tests/boso-202611-schedule-fallback.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const lines=JSON.parse(fs.readFileSync(
  'data/core/railway_data.compact.json','utf8')).lines;
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const samples={
  Uchibo:[
    // Kisarazu -> Chiba, 120M: weekday 05:00 to 05:38
    ['120M','Inbound','Uchibo.Chiba',[
      ['Kisarazu',null,'05:00'],['Iwane','05:03','05:04'],
      ['Sodegaura','05:07','05:07'],['Nagaura','05:11','05:11'],
      ['Anegasaki','05:16','05:16'],['Goi','05:21','05:22'],
      ['Yawatajuku','05:25','05:25'],['Hamano','05:28','05:28'],
      ['Soga','05:32','05:32'],['HonChiba','05:35','05:36'],
      ['Chiba','05:38',null]]],
    // Kimitsu -> Zushi via Chiba: only Uchibo source segment is tested
    ['3680F','Inbound','Yokosuka.Zushi',[
      ['Kimitsu',null,'06:02'],['Kisarazu','06:09','06:10'],
      ['Sodegaura','06:15','06:16'],['Nagaura','06:19','06:20'],
      ['Anegasaki','06:24','06:25'],['Goi','06:29','06:30'],
      ['Yawatajuku','06:33','06:34'],['Hamano','06:36','06:37'],
      ['Soga','06:40','06:43'],['HonChiba','06:46','06:46'],
      ['Chiba','06:49',null]]]
  ],
  Sotobo:[
    ['220M','Inbound','Sotobo.Chiba',[
      ['Ohara',null,'04:40'],['Mikado','04:43','04:44'],
      ['Chojamachi','04:46','04:46'],['Taito','04:49','04:49'],
      ['Torami','04:53','04:53'],['KazusaIchinomiya','04:57','04:57'],
      ['Yatsumi','05:01','05:01'],['Mobara','05:05','05:06'],
      ['ShimMobara','05:09','05:09'],['Honno','05:12','05:13'],
      ['Nagata','05:15','05:16'],['Oami','05:18','05:19'],
      ['Toke','05:23','05:24'],['Honda','05:28','05:29'],
      ['Kamatori','05:32','05:32'],['Soga','05:37','05:38'],
      ['HonChiba','05:41','05:41'],['Chiba','05:44',null]]],
    // Chiba -> Kazusa-Ichinomiya, Rapid 3591F (full number)
    ['3591F','Outbound','Sotobo.KazusaIchinomiya',[
      ['Chiba',null,'05:21'],['HonChiba','05:23','05:23'],
      ['Soga','05:26','05:27'],['Kamatori','05:31','05:32'],
      ['Honda','05:35','05:36'],['Toke','05:40','05:41'],
      ['Oami','05:44','05:45'],['Mobara','05:53','05:54'],
      ['KazusaIchinomiya','06:01',null]]],
    // local 221M short southern segment, no invented intermediate stops
    ['221M','Outbound','Sotobo.AwaKamogawa',[
      ['AwaKominato',null,'06:04'],['AwaAmatsu','06:08','06:08'],
      ['AwaKamogawa','06:14',null]]]
  ]
};
const all=[];
for(const [line,records] of Object.entries(samples))for(const
  [trainNumber,direction,destination,stops] of records){
  all.push({line,trainNumber,stops,
    timetable:{
      '@id':'sql-test:'+line+':'+trainNumber,
      'odpt:railway':'odpt.Railway:JR-East.'+line,
      'odpt:trainNumber':trainNumber,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+direction,
      'odpt:trainType':'odpt.TrainType:JR-East.'+
        (/F$/.test(trainNumber)?'Rapid':'Local'),
      'odpt:destinationStation':['odpt.Station:JR-East.'+destination],
      'odpt:trainTimetableObject':stops.map(([station,arr,dep])=>({
        ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.'+line+'.'+station,
                 'odpt:arrivalTime':arr}:{}),
        ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.'+line+'.'+station,
                 'odpt:departureTime':dep}:{})
      })),
      _positionSource:'supabase-train-run',
      _sqlLineId:line,
      _serviceDate:'2026-11-04',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false,
      _canonicalGroupEvidence:'source_only'
    }});
}
function estimateAt(utc){
  class FakeDate extends Date{
    constructor(...x){super(...(x.length?x:[utc]))}
    static now(){return Date.parse(utc)}
  }
  const window={RuntimeConfig:{},ODPTClient:{
    LINE_RAILWAY_CODE:{Uchibo:'Uchibo',Sotobo:'Sotobo'},
    LINE_TO_OPERATOR:{Uchibo:'JR-East',Sotobo:'JR-East'}
  }};
  const context=vm.createContext({window,Date:FakeDate,
    console:{debug(){},warn(){},error(){},log(){}}});
  vm.runInContext(estimator,context,{filename:'js/train-position-estimator.js'});
  for(const line of ['Uchibo','Sotobo'])
    window.TrainPositionEstimator.registerManualTimetable(line,
      all.filter(x=>x.line===line).map(x=>x.timetable));
  return window.TrainPositionEstimator.estimateAllPositions(
    {Uchibo:lines.Uchibo,Sotobo:lines.Sotobo},
    {},{},null,{lineIds:['Uchibo','Sotobo']});
}
function find(out,line,number){
  return (out[line]||[]).find(x=>x.trainNumber===number);
}
function segment(out,line,number,start,end){
  const p=find(out,line,number);
  assert.ok(p,number+' scheduled on '+line);
  assert.equal(lines[line].stations[p.stationIndex],start);
  assert.equal(lines[line].stations[p.segmentToIndex],end);
  assert.equal(p.positionSource,'supabase-train-run');
  assert.equal(p.estimated,true);
  assert.equal(p.serviceDate,'2026-11-04');
  assert.equal(p.trainNumber,number);
  assert.equal(p.timetableDateVerified,false);
}
test('05:25 JST: Uchibo 120M and Sotobo 220M / 3591F run independently',()=>{
  const o=estimateAt('2026-11-03T20:25:00Z');
  segment(o,'Uchibo','120M','Yawatajuku','Hamano');
  segment(o,'Sotobo','220M','Toke','Honda');
  segment(o,'Sotobo','3591F','Hon-Chiba','Soga');
});
test('05:40 Toke dwell, then 05:42 departures preserve real station clocks',()=>{
  const stopped=estimateAt('2026-11-03T20:40:00Z');
  assert.equal(find(stopped,'Uchibo','120M'),undefined);
  segment(stopped,'Sotobo','220M','Soga','Hon-Chiba');
  const rapid=find(stopped,'Sotobo','3591F');
  assert.ok(rapid,'3591F remains in timetable at Toke');
  assert.equal(lines.Sotobo.stations[rapid.stationIndex],'Toke');
  assert.equal(rapid.segmentToIndex,undefined,
    '05:40 arrival must be a station stop, not a premature departure');
  const departed=estimateAt('2026-11-03T20:42:00Z');
  segment(departed,'Sotobo','220M','Hon-Chiba','Chiba');
  segment(departed,'Sotobo','3591F','Toke','Oami');
});
test('06:07 JST: Uchibo 3680F and Sotobo 221M keep source train numbers',()=>{
  const o=estimateAt('2026-11-03T21:07:00Z');
  segment(o,'Uchibo','3680F','Kimitsu','Kisarazu');
  segment(o,'Sotobo','221M','Awa-Kominato','Awa-Amatsu');
  assert.equal(find(o,'Sotobo','3591F'),undefined);
});
test('source terminal arrival clocks end each Boso position, no false perpetual train',()=>{
  const o=estimateAt('2026-11-03T22:00:00Z');
  for(const line of ['Uchibo','Sotobo'])for(const p of o[line]||[])
    assert.ok(!['120M','3680F','220M','3591F','221M'].includes(p.trainNumber));
  for(const record of all){
    const stops=record.stops;
    assert.equal(stops[0][1],null,'origin has no fabricated arrival');
    assert.equal(stops.at(-1)[2],null,'terminus has no fabricated departure');
  }
});
