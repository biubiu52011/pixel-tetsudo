'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {build,csvOf}=require('../tools/build-jr-east-png-folder-number-map.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const report=JSON.parse(read('data/audits/jr-east-png-folder-number-map-2611.json'));
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const current=JSON.parse(read('data/audits/png-current-service-number-map-20261116.json'));
const sources={gono:read('data/timetables/jreast-gono-2611-number-index.js'),
 iiyama:read('data/timetables/jreast-iiyama-2611-number-index.js'),
 senzan:read('data/timetables/jreast-senzan-2611-number-index.js'),
 tazawako:read('data/timetables/jreast-tazawako-2611-number-index.js'),
 suigun:read('data/timetables/jreast-suigun-2611-number-index.js'),
 tadami:read('data/timetables/jreast-tadami-2611-number-index.js'),
 yamagata:read('data/timetables/jreast-yamagata-2611-number-index.js'),
 shonan:read('data/timetables/jreast-shonan-mixed-number-index-202611.js'),
 uetsu:read('data/timetables/jreast-uetsu-2611-number-index.js'),
 tsugaru:read('data/timetables/jreast-tsugaru-2611-number-index.js')};
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

test('Tazawako 701-5000 recovers the original official 8xxM adapter only',()=>{
 const refs=find('JR東日本_701系_5000番台.png').existingAdapterExactNumberRefs;
 assert.ok(refs.length>=60);
 assert.ok(refs.every(r=>r.lineId==='Tazawako'&&/^8\d\dM$/.test(r.trainNumber)));
 assert.ok(refs.every(r=>!r.authorizesRuntimePNG&&!r.actualVehicleConfirmed));
});
test('Suigun 0-series replays the existing adapter and excludes Kazekko',()=>{
 const refs=find('JR東日本_キハE130系0番台.png').existingAdapterExactNumberRefs;
 assert.ok(refs.length>50);
 assert.ok(refs.some(r=>r.trainNumber==='320D'&&r.lineId==='Suigun'));
 assert.ok(refs.some(r=>r.trainNumber==='920D'&&r.lineId==='SuigunBranch'));
 assert.ok(!refs.some(r=>r.trainNumber==='9821D'||r.trainNumber==='9822D'));
 assert.ok(refs.every(r=>r.operatingDates.length>0));
});
test('Tadami KiHa E120 and KiHa110 reuse number with position guards only',()=>{
 const e120=find('JR東日本_キハE120形_只見線色.png').existingAdapterExactNumberRefs;
 const kiha=find('JR東日本_キハ110系（只見線）.png').existingAdapterExactNumberRefs;
 assert.ok(e120.length>=32);
 assert.deepEqual(e120,kiha);
 assert.ok(e120.every(x=>x.requiredGuards.includes('segment position')));
});
test('Yamagata all mixed fleet candidates remain conditional; E723 November 13 only',()=>{
 for(const n of ['JR東日本_701系_5500番台.png','JR東日本_719系_5000番台.png','JR東日本_E723系_5000番台.png']){
  const refs=find(n).ambiguousYamagataLineNumberCandidates;
  assert.ok(refs.length>100);
  assert.ok(refs.every(x=>x.evidenceGrade.includes('NOT_model_assignment')&&!x.authorizesRuntimePNG));
  assert.ok(refs.some(x=>x.trainNumber==='1426M'));
 }
 const observed=find('JR東日本_E723系_5000番台.png').thirdPartyOneDateObservedRefs;
 assert.deepEqual(observed.map(x=>x.trainNumber),['1426M','424M']);
 assert.ok(observed.every(x=>x.serviceDate==='2026-11-13'&&!x.actualVehicleConfirmed));
});
test('B31 and 209-3500/E231-0 do not inherit passenger train numbers without proof',()=>{
 assert.equal(find('JR東日本_E235系_0番台_B31編成_中央・総武線.png').status,'no_qualified_number_mapping');
 for(const name of ['JR東日本_209系_3500番台.png','JR東日本_E231系_0番台_中央・総武線各駅停車.png']){
  const row=find(name);
  assert.equal(row.status,'active_family_without_number_reference');
  assert.equal(row.existingAdapterExactNumberRefs.length,0);
 }
});

test('Nikko 253-1000 maps only eligible 2026-11 numbers, never Tobu 100 Spacia',()=>{
 const x=find('JR東日本_253系_1000番台.png').datedNamedServiceNumbers;
 assert.deepEqual(x.map(q=>q.trainNumber),['1082M','1083M','5021M','5022M','5113M']);
 assert.equal(x.find(q=>q.trainNumber==='1082M').operatingDates.length,30);
 assert.equal(x.find(q=>q.trainNumber==='1083M').operatingDates.length,30);
 assert.equal(x.find(q=>q.trainNumber==='5021M').operatingDates.length,24);
 assert.deepEqual(x.find(q=>q.trainNumber==='5022M').operatingDates,['2026-11-21','2026-11-22']);
 assert.deepEqual(x.find(q=>q.trainNumber==='5113M').operatingDates,['2026-11-21','2026-11-22']);
 assert.ok(x.every(q=>q.lineId==='TobuNikko'&&!q.actualVehicleConfirmed&&!q.authorizesRuntimePNG));
 assert.ok(!x.some(q=>['1091M','1094M','5111M','5112M'].includes(q.trainNumber)));
});
test('E231-1000 and E233-3000 get only shared source-number candidates',()=>{
 const a=find('JR東日本_E231系_1000番台.png').sharedShonanMixedFleetNumberScopes;
 const b=find('JR東日本_E233系3000番台.png').sharedShonanMixedFleetNumberScopes;
 assert.equal(a.length,38);assert.deepEqual(a,b);
 assert.equal(a.reduce((n,x)=>n+x.exactSourceNumbers.length,0),3053);
 assert.ok(a.every(x=>x.possibleModels.length===2&&x.referenceOnly&&
    !x.authorizesRuntimePNG&&!x.actualVehicleConfirmed));
 assert.equal(find('JR東日本_E233系_3000番台.png').sharedShonanMixedFleetNumberScopes.length,0);
});
test('E501 SAKIGAKE Nov14 service has no fabricated public train number',()=>{
 const x=find('JR東日本_E501系_E501_SAKIGAKE.png').datedNamedServicesWithoutPublicNumber;
 assert.equal(x.length,1);
 assert.equal(x[0].serviceDate,'2026-11-14');
 assert.equal(x[0].publicTrainNumber,null);
 assert.equal(x[0].authorizesRuntimePNG,false);
 assert.equal(find('JR東日本_E501系_E501_SAKIGAKE.png').status,'active_family_without_number_reference');
});

test('Uetsu Inaho 1M-14M reference uses only LimitedExpress E653 color family',()=>{
 const rows=find('JR東日本_E653系_1000番台_いなほ色.png').existingAdapterExactNumberRefs;
 assert.equal(rows.length,28);
 assert.ok(rows.every(x=>x.lineId==='Uetsu'&&
    /^(?:[1-9]|1[0-4])M$/.test(x.trainNumber)&&
    x.requiredGuards.includes('LimitedExpress')&&!x.authorizesRuntimePNG));
 assert.ok(!rows.some(x=>x.trainNumber==='8853D'||x.trainNumber==='225M'));
});
test('Tsugaru Akita 701 verifies current open railway and Sat-only 324M',()=>{
 const rows=find('JR東日本_701系_秋田地区.png').existingAdapterExactNumberRefs;
 assert.ok(rows.length>=35);
 assert.ok(rows.every(x=>x.lineId==='Tsugaru'&&!x.authorizesRuntimePNG&&x.operatingDates.length));
 const special=rows.filter(x=>x.trainNumber==='324M');
 assert.equal(special.length,2);
 const holiday=special.find(x=>x.calendar==='SaturdayHoliday');
 const weekday=special.find(x=>x.calendar==='Weekday');
 assert.ok(holiday&&weekday);
 assert.deepEqual(holiday.operatingDates,['2026-11-07','2026-11-14','2026-11-21','2026-11-28']);
 assert.ok(weekday.operatingDates.length>10);
 assert.ok(weekday.operatingDates.every(d=>[1,2,3,4,5].includes(new Date(d+'T12:00:00Z').getUTCDay())));
 assert.ok(rows.every(x=>x.requiredGuards.includes('Aomori-Kanita')));
});
