'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {owner,format,inspect,summary}=require('../tools/audit-toei-odpt-live.cjs');
const rows=[
 {lineIds:['Asakusa'],requireRealtimeToeiOwner:true,weekdayNumbers:['1008T','1702TA'],holidayNumbers:['1008T']},
 {lineIds:['Shinjuku'],requireRealtimeToeiOwner:true,weekdayNumbers:['1031T'],holidayNumbers:[]},
 {lineIds:['Oedo'],requireRealtimeToeiOwner:true,weekdayNumbers:['1001A'],holidayNumbers:[]},
 {lineIds:['Mita'],requireRealtimeToeiOwner:false,weekdayNumbers:['1202T'],holidayNumbers:[]}
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
 assert.equal(result.lines.Mita.overlap,0);
 assert.match(summary(result),/DOES NOT prove an official train-number crosswalk/);
});
test('unavailable official response cannot be silently treated as an empty verified feed',()=>{
 assert.throws(()=>inspect({},rows),TypeError);
 const result=inspect([],rows);
 assert.equal(result.returned,0);
 assert.equal(result.officialCrosswalkVerifiedCount,0);
});
