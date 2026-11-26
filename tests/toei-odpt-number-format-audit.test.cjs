'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {owner,format,inspect,inspectTimetable,summary,timetableSummary}=require('../tools/audit-toei-odpt-live.cjs');
const rows=[
 {lineIds:['Asakusa'],sourceRailways:['odpt.Railway:Toei.Asakusa'],operator:'Toei',requireRealtimeToeiOwner:true,weekdayNumbers:['1008T','1702TA'],holidayNumbers:['1008T']},
 {lineIds:['Shinjuku'],sourceRailways:['odpt.Railway:Toei.Shinjuku'],operator:'Toei',requireRealtimeToeiOwner:true,weekdayNumbers:['1031T'],holidayNumbers:[]},
 {lineIds:['Oedo'],sourceRailways:['odpt.Railway:Toei.Oedo'],operator:'Toei',requireRealtimeToeiOwner:true,weekdayNumbers:['1001A'],holidayNumbers:[]},
 {lineIds:['Mita'],sourceRailways:['odpt.Railway:Toei.Mita'],operator:'Toei',requireRealtimeToeiOwner:false,weekdayNumbers:['1202T'],holidayNumbers:[]}
];
const record=(line,number,own)=>({'odpt:railway':'odpt.Railway:Toei.'+line,
 'odpt:trainNumber':number,'odpt:trainOwner':own});
test('classifies source train numbers without converting 4-digit or Oedo suffix',()=>{
 assert.equal(format('1234'),'numeric');assert.equal(format('1008T'),'suffixed');
 assert.equal(format('1702TA'),'suffixed');assert.equal(format('1001A'),'suffixed');
 assert.equal(format('1001A1'),'other');assert.equal(format('ODPT0001'),'opaque');
 assert.equal(owner('odpt.TrainOwner:Toei'),'Toei');
 assert.equal(owner('odpt.Operator:Toei'),'Toei');
 assert.equal(owner('odpt.TrainOwner:Keio'),'Keio');
});
test('source railway, raw number and actual train owner must remain independent',()=>{
 const records=[
  record('Asakusa','1008T','odpt.TrainOwner:Toei'),
  record('Asakusa','1008','odpt.Operator:Toei'),
  record('Asakusa','1702TA','odpt.TrainOwner:Keikyu'),
  record('Shinjuku','1031T',''),
  record('Oedo','1001A','Toei'),
  record('Oedo','1001A1','Toei'),
  record('Mita','1202T','Toei'),
  record('Asakusa','ODPT0001','Toei'),
  record('Keio','1008T','Toei')
 ];
 const unchanged=JSON.stringify(records);
 const result=inspect(records,rows,'2026-11-16T00:00:00Z');
 assert.equal(JSON.stringify(records),unchanged);
 assert.equal(result.officialCrosswalkVerifiedCount,0);
 assert.equal(result.otherRailway,1);
 assert.equal(result.lines.Asakusa.count,4);
 assert.equal(result.lines.Asakusa.overlap,2);
 assert.equal(result.lines.Asakusa.ownedOverlap,1);
 assert.equal(result.lines.Asakusa.numeric,1);
 assert.equal(result.lines.Shinjuku.ownedOverlap,0);
 assert.equal(result.lines.Oedo.overlap,1);
 assert.equal(result.lines.Oedo.formats.other,1);
 assert.equal(result.lines.Oedo.providedVehicleType,0);
 assert.equal(result.lines.Mita.overlap,1);
 assert.match(summary(result),/DOES NOT prove an official train-number crosswalk/);
});
test('unavailable official response cannot be silently treated as an empty verified feed',()=>{
 assert.throws(()=>inspect({},rows),TypeError);
 const result=inspect([],rows);
 assert.equal(result.returned,0);
 assert.equal(result.officialCrosswalkVerifiedCount,0);
});

test('都营官方时刻表按来源日历与完整番号对账，不猜车主或运营日期',()=>{
 const row=(line,number,calendar,own,metadata={})=>({
  'odpt:railway':'odpt.Railway:Toei.'+line,'odpt:trainNumber':number,
  'odpt:calendar':calendar,'odpt:trainOwner':own,...metadata
 });
 const weekday='odpt.Calendar:Weekday',holiday='odpt.Calendar:SaturdayHoliday';
 const records=[
  row('Asakusa','1008T',weekday,'odpt.TrainOwner:Toei',{'dc:date':'2026-11-21'}),
  row('Asakusa','1008T',weekday,'odpt.TrainOwner:Toei'),
  row('Asakusa','1702TA',holiday,''),
  row('Asakusa','1008',weekday,''),
  row('Asakusa','1008T',holiday,'odpt.TrainOwner:Keikyu'),
  row('Oedo','1001A1',weekday,''),
  row('Oedo','1001A',weekday,''),
  row('Mita','1202T','odpt.Calendar:Special',''),
  row('Mita','',weekday,''),
  row('Mita','1202T','','')
 ];
 const before=JSON.stringify(records),r=inspectTimetable(records,rows);
 assert.equal(JSON.stringify(records),before);
 assert.equal(r.status,'observed');assert.equal(r.returned,10);
 assert.equal(r.officialCrosswalkVerifiedCount,0);
 assert.equal(r.currentServiceDateVerified,false);assert.equal(r.actualVehicleConfirmed,false);
 assert.deepEqual(r.lines.Asakusa.sourceMetadata['dc:date'],['2026-11-21']);
 const g=r.lines.Asakusa.groups.find(x=>x.owner==='Toei');
 assert.equal(g.records,2);assert.deepEqual(g.numbers,['1008T']);assert.deepEqual(g.literalOverlap,['1008T']);
 const h=r.lines.Asakusa.groups.find(x=>x.calendar===holiday&&!x.owner);
 assert.deepEqual(h.notInOldRoster,['1702TA']);
 assert.equal(r.lines.Asakusa.missingOwner,2);
 assert.deepEqual(r.lines.Oedo.groups[0].literalOverlap,['1001A']);
 assert.deepEqual(r.lines.Oedo.groups[0].notInOldRoster,['1001A1']);
 assert.equal(r.lines.Mita.groups[0].legacyCalendarComparable,false);
 assert.equal(r.lines.Mita.missingNumber,1);assert.equal(r.lines.Mita.missingCalendar,1);
 assert.equal(inspectTimetable([],rows).status,'empty-response');
 assert.throws(()=>inspectTimetable({},rows),TypeError);
 assert.match(timetableSummary(r),/不证明同运营日/);
});
