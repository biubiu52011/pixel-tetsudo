'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const w={};
vm.runInNewContext(fs.readFileSync('data/timetables/jreast-chuo-main-2611-number-index.js','utf8'),{window:w});
const idx=w.JREastChuoMainNumbers2611;
const ground={
  weekday:{Inbound:201,Outbound:203},
  holiday:{Inbound:216,Outbound:219}
};
test('all four published lists are literal train-number columns in JR 2611 edition',()=>{
  for(const cal of ['weekday','holiday'])for(const dir of ['Inbound','Outbound']){
    const list=idx.columns[cal][dir];
    assert.equal(list.length,ground[cal][dir].valueOf());
    assert.match(idx.sources[cal+'.'+dir],/^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/223[ud][12]\.html$/);
    assert.ok(list.every(n=>/^\d{1,4}[A-Z]$/.test(n)));
  }
});
test('different calendars and directions cannot borrow each others published train numbers',()=>{
  assert.equal(idx.has('640M','weekday','Inbound'),true);
  assert.equal(idx.has('640T','weekday','Inbound'),true);
  assert.equal(idx.has('321M','weekday','Outbound'),true);
  assert.equal(idx.has('321M','weekday','Inbound'),false);
  assert.equal(idx.has('919M','holiday','Outbound'),true);
  assert.equal(idx.has('919M','weekday','Outbound'),false);
  assert.equal(idx.has('9580D','holiday','Inbound'),true);
  assert.equal(idx.has('9581D','holiday','Outbound'),true);
  assert.equal(idx.has('9999M','weekday','Outbound'),false);
});
test('a published train number never certifies active dates or actual rolling stock',()=>{
  const p={serviceDate:'2026-11-05',lineId:'ChuoMain',
    calendarType:'odpt.Calendar:Weekday',
    railDirection:'odpt.RailDirection:Outbound',
    trainNumber:'321M',trainOperator:'JR-East',
    sourceRailway:'odpt.Railway:JR-East.Chuo'};
  const e=idx.match(p);
  assert.ok(e);assert.equal(e.publishedNumberOnly,true);
  assert.equal(e.operatingDateVerified,false);
  assert.equal(e.actualVehicleConfirmed,false);
  assert.equal(e.authorizesPNG,false);
  assert.equal(e.pngPath,undefined);
  assert.equal(idx.match({...p,serviceDate:'2026-12-05'}),null);
  assert.equal(idx.match({...p,lineId:'ChuoRapid'}),null);
  assert.equal(idx.match({...p,railDirection:'odpt.RailDirection:Inbound'}),null);
  assert.equal(idx.match({...p,trainOperator:'JR-Central'}),null);
});
