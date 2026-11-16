'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {build,csvOf}=require('../tools/build-jr-east-png-folder-number-map.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const report=JSON.parse(read('data/audits/jr-east-png-folder-number-map-2611.json'));
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const current=JSON.parse(read('data/audits/png-current-service-number-map-20261116.json'));
const sources={gono:read('data/timetables/jreast-gono-2611-number-index.js'),
 iiyama:read('data/timetables/jreast-iiyama-2611-number-index.js'),
 senzan:read('data/timetables/jreast-senzan-2611-number-index.js')};
const find=name=>report.records.find(x=>x.name===name);
test('all 131 JR-East PNGs appear once, with generated artifacts synchronized',()=>{
 assert.deepEqual(report,build(index,current,sources));
 assert.equal(csvOf(report),read('data/audits/jr-east-png-folder-number-map-2611.csv'));
 assert.equal(report.summary.totalPng,131);
 assert.equal(report.summary.quarantined,4);
 assert.equal(report.summary.observedPhysicalCarsets,0);
 const source=index.pngIndex.filter(x=>x.operatorDirectory==='JR東日本').map(x=>x.path).sort();
 assert.deepEqual(report.records.map(x=>x.png).sort(),source);
});
test('no bound is treated as actual formation or ungated runtime PNG',()=>{
 for(const r of report.records){
  assert.equal(r.actualVehicleConfirmed,false);
  assert.equal(r.allowSelectByBandAlone,false);
  for(const n of r.originalNumberRules)assert.equal(n.actualVehicleConfirmed,false);
  for(const n of r.originalRuntimeNumberRosters)assert.equal(n.actualVehicleConfirmed,false);
  for(const n of r.datedNamedServiceNumbers){
   assert.equal(n.actualVehicleConfirmed,false);
   assert.equal(n.authorizesRuntimePNG,false);
   assert.ok(n.sourceUrl.startsWith('https://'));
   assert.ok(n.operatingDates.length>0);
   assert.ok(n.operatingDates.every(d=>/^2026-11-(?:0[1-9]|[12][0-9]|30)$/.test(d)));
  }
 }
});
test('Shirakami Buna dates and both PNG ends remain only candidate images',()=>{
 for(const name of ['JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E301-5.png',
                   'JR東日本_HB-E300系_リゾートしらかみ「橅」_HB-E302-5.png']){
  const items=find(name).datedNamedServiceNumbers;
  assert.deepEqual(items.map(x=>x.trainNumber),['8521D','8522D','8524D','8525D']);
  assert.equal(items[0].operatingDates.length,17);
  assert.equal(items[1].operatingDates.length,13);
 }
});
test('Senzan SATONO and Iiyama Oykot match 2611 dated roster only',()=>{
 const satono=find('JR東日本_HB-E300系_SATONO_1号車.png').datedNamedServiceNumbers;
 assert.deepEqual(satono.map(x=>x.trainNumber),['8821D','8822D']);
 assert.equal(satono[0].operatingDates.length,19);
 const oykot=find('JR東日本_キハ110系_おいこっと.png').datedNamedServiceNumbers;
 assert.deepEqual(oykot.map(x=>x.trainNumber),['8140D','8141D']);
 assert.equal(oykot[0].operatingDates.length,12);
 assert.ok(oykot[0].operatingDates.includes('2026-11-02'));
});
test('retired service scope and non-revenue images do not gain current service numbers',()=>{
 for(const n of ['JR東日本_205系_1100番台_鶴見線.png',
  'JR東日本_209系_3000番台.png','JR東日本_209系_3100番台.png'])
   assert.equal(find(n).status,'historic_not_2026_service');
 for(const n of ['JR東日本_E926形_East-i.png','JR東日本_FV-E991系_HYBARI.png'])
   assert.equal(find(n).status,'non_passenger_stock');
});
