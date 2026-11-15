'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {getRows,buildCatalog,audit}=require('../tools/build-train-number-png-catalog.cjs');
const snapshot=require('../data/audits/supabase-railway-audit-snapshot-20261116.json');
const c=buildCatalog(snapshot,getRows());
test('2611 catalog includes both maintained owner rule sets and their SQL provenance',()=>{
 assert.equal(c.summary.sql_rules,291);
 assert.equal(c.summary.js_rules,130);
 assert.equal(c.summary.total_line_keys,88);
 assert.equal(c.rules.filter(r=>r.origin==='sql_snapshot'&&!r.source_url).length,0);
 assert.equal(c.summary.unregistered_sql_png_rules,0);
 assert.deepEqual(audit(c),[]);
});
test('four native PNG assets remain in review pending vehicle depiction approval',()=>{
 assert.equal(c.review.sql_asset_review_required.length,5);
 assert.equal(new Set(c.review.sql_asset_review_required.map(r=>r.png)).size,4);
 for(const r of c.review.sql_asset_review_required){
  assert.equal(r.asset_status,'review');
  assert.equal(r.file_format_status,'native_png');
  assert.equal(r.appearance_class,'requires_review');
 }
 const promoted=JSON.parse(JSON.stringify(snapshot));
 const path=c.review.sql_asset_review_required[0].png;
 promoted.vehicle_image_assets.find(a=>a.image_path===path).asset_status='available';
 assert.ok(audit(buildCatalog(promoted,getRows())).some(x=>/unexpected SQL asset review\/promotion|pending assets changed/.test(x)));
});
test('all SQL overlaps fail closed on candidate band alone',()=>{
 assert.equal(c.review.sql_range_overlaps.length,6);
 assert.equal(c.review.sql_range_overlaps.filter(r=>!r.same_model_png).length,3);
 for(const r of c.review.sql_range_overlaps){
  assert.equal(r.may_select_by_band_alone,false);
  const a=c.rules.find(x=>x.id===r.a),b=c.rules.find(x=>x.id===r.b);
  assert.ok(a.requires_exact_roster&&b.requires_exact_roster);
  assert.equal(r.classification,r.same_model_png?
   'same_artwork_separate_source_evidence':'cross_model_candidate_bands_require_exact_roster');
 }
});
test('front-end broad rules are visible, but cannot become carset confirmations',()=>{
 assert.equal(c.review.frontend_guard_only_rules.length,9);
 assert.equal(c.review.frontend_official_month_rosters.length,4);
 assert.equal(c.review.frontend_singleton_candidates.length,1);
 assert.ok(c.review.sql_asset_label_differences.every(r=>
  r.label_relation!=='unresolved_model_identity'&&r.safe_alias_authorized===false));
 for(const r of c.rules)assert.equal(r.actual_vehicle_confirmed,false);
 const bad=JSON.parse(JSON.stringify(snapshot));
 bad.published_train_png_number_ranges[0].actual_vehicle_confirmed=true;
 assert.ok(audit(buildCatalog(bad,getRows())).some(x=>/must not assert actual car/.test(x)));
 bad.published_train_png_number_ranges[0].actual_vehicle_confirmed=false;
 bad.published_train_png_number_ranges[0].source_url='';
 assert.ok(audit(buildCatalog(bad,getRows())).some(x=>/missing provenance/.test(x)));
});

test('four inventoried train artwork files are actual PNG byte streams (not encoded text)',()=>{
 const fs=require('node:fs');
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 const paths=[...new Set(c.review.sql_asset_review_required.map(r=>r.png))];
 assert.equal(paths.length,4);
 for(const file of paths){
  const bytes=fs.readFileSync(file);
  assert.ok(bytes.length>=57,file+': too short for valid PNG chunks');
  assert.ok(bytes.subarray(0,8).equals(signature),file+': bad PNG signature');
  assert.equal(bytes.readUInt32BE(8),13,file+': unexpected first chunk size');
  assert.equal(bytes.toString('ascii',12,16),'IHDR',file+': missing IHDR');
  assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0,file+': empty canvas');
  assert.equal(bytes.readUInt32BE(bytes.length-12),0,file+': IEND length');
  assert.equal(bytes.toString('ascii',bytes.length-8,bytes.length-4),'IEND',file+': missing IEND');
 }
});

test('November 2026 exact calendar rosters do not silently fall back to broad number bands',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const window={},ctx=vm.createContext({window,Date,console:{log(){},warn(){},error(){},debug(){}}});
 for(const file of ['data/timetables/vehicle-garage-png-map.js',
                      'data/timetables/train-number-png-ranges.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 const samples=[
  {id:'js-0059',line:'ChuoRapid',source:'odpt.Railway:JR-East.ChuoRapid',type:'Rapid'},
  {id:'js-0101',line:'Tsurumi',source:'odpt.Railway:JR-East.Tsurumi',type:'Local'}
 ];
 for(const s of samples){
  const r=c.rules.find(row=>row.id===s.id);
  const num=r.official_month_numbers[s.line].weekday[0];
  const pos={serviceDate:'2026-11-05',calendarType:'weekday',
   trainOperator:'JR-East',sourceRailway:s.source,
   trainType:'odpt.TrainType:JR-East.'+s.type,
   railDirection:'odpt.RailDirection:'+(Number(num.match(/^\d+/)[0])%2?'Outbound':'Inbound')};
  const active=window.TrainNumberPngRanges.match(num,s.line,pos);
  assert.ok(active,s.id+': official November weekday sample must match');
  assert.equal(window.TrainNumberPngRanges.match(num,s.line,{...pos,serviceDate:'2026-12-05'}),null,
    s.id+': outside edition must NOT inherit inclusive range');
  assert.equal(window.TrainNumberPngRanges.match(num,s.line,{...pos,serviceDate:''}),null,
    s.id+': missing month must NOT inherit inclusive range');
 }
});

test('SQL and frontend exact train-number PNG references have no contradictory paths',()=>{
 const r=c.review.cross_source_number_png;
 assert.equal(c.summary.shared_sql_frontend_lines,6);
 assert.equal(c.summary.cross_source_same_png_number_matches,180);
 assert.equal(c.summary.cross_source_png_conflicts,0);
 assert.equal(c.summary.cross_source_untested_js_rules,1);
 assert.equal(r.verified_same_png.length,180);
 assert.equal(r.png_conflicts.length,0);
 assert.equal(r.unverified_js_rules.length,1);
 assert.ok(r.verified_same_png.every(x=>
   c.line_index[x.line].sql.includes(x.sql_rule)&&
   c.line_index[x.line].js.includes(x.js_rule)));
 const changed=JSON.parse(JSON.stringify(snapshot));
 const wrong=changed.published_train_png_number_ranges.find(x=>
   x.line_key==='Fujikyu'&&x.segment_key==='fujikyu_local_6000');
 assert.ok(wrong);
 wrong.png_reference='../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png';
 const bad=buildCatalog(changed,getRows());
 assert.ok(bad.review.cross_source_number_png.png_conflicts.length>0);
 assert.ok(audit(bad).some(e=>/SQL\/frontend published train-number PNG artwork conflict/.test(e)));
});

test('front-end PNG range metadata retains every source-specific guard and qualifier',()=>{
 const owner=getRows();
 const represented=new Set(["lineIds","numberFormat","from","to","suffixes","model","pngPath","trainType","trainTypes","numberIndex","publishedNumbers","weekdayNumbers","holidayNumbers","officialMonth","officialMonthNumbers","calendarType","operatingDates","validFrom","validTo","operator","sourceRailways","sourceRailwaysIfPresent","directionNumberParity","requireCompatiblePlan"]);
 assert.equal(c.summary.frontend_rules_with_additional_source_fields,125);
 assert.equal(c.summary.frontend_additional_source_keys,21);
 assert.equal(owner.length,130);
 owner.forEach((row,i)=>{
  const rule=c.rules.find(r=>r.id==='js-'+String(i+1).padStart(4,'0'));
  const remaining=Object.fromEntries(Object.keys(row)
   .filter(k=>!represented.has(k)).sort().map(k=>[k,row[k]]));
  assert.deepEqual(rule.runtime_guards,remaining,rule.id);
 });
 const tozai=c.rules.find(r=>r.id==='js-0091');
 assert.equal(tozai.runtime_guards.excludeTrainType,'LimitedExpress');
 assert.deepEqual(tozai.runtime_guards.allowedModelLabels,['東京メトロ15000系','東京メトロ07系']);
 const kashima=c.rules.find(r=>r.id==='js-0084');
 assert.deepEqual(kashima.runtime_guards.allowedModelLabels,['E235系1000番台']);
});

test('Chuo 2611 E353 PNG rules use published calendar rosters, not inclusive number bands',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const root={};const context=vm.createContext({window:root,Date,console:{log(){},warn(){},error(){},debug(){}}});
 for(const path of [
  'data/timetables/jreast-chuo-main-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js'
 ])vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
 const official=root.JREastChuoMainNumbers2611.columns;
 const ranges=[[1,60],[2101,2199],[3101,3199],[5001,5099]];
 const sort=arr=>[...new Set(arr)].sort((a,b)=>Number(a.slice(0,-1))-Number(b.slice(0,-1)));
 for(let i=0;i<ranges.length;i++){
  const [min,max]=ranges[i],row=c.rules.find(r=>r.id==='js-'+String(105+i).padStart(4,'0'));
  assert.ok(row);
  for(const [calendar,field] of [['weekday','weekday_numbers'],['holiday','holiday_numbers']]){
   const expected=sort([...official[calendar].Inbound,...official[calendar].Outbound]
    .filter(n=>/^\d+M$/.test(n)&&Number(n.slice(0,-1))>=min&&Number(n.slice(0,-1))<=max));
   assert.deepEqual(row[field],expected,row.id+'/'+calendar);
  }
  assert.equal(row.evidence_kind,'exact-list');
  assert.equal(row.direction_number_parity,'inbound-even');
  assert.equal(row.valid_from,'2026-11-01');
  assert.equal(row.valid_to,'2026-11-30');
 }
 const base={trainType:'odpt.TrainType:JR-East.LimitedExpress',
  serviceDate:'2026-11-12',calendarType:'weekday',
  sourceRailway:'odpt.Railway:JR-East.ChuoMain',trainOperator:'JR-East'};
 const match=(n,p={})=>root.TrainNumberPngRanges.match(n,'ChuoMain',{...base,...p});
 assert.match(match('1M',{railDirection:'odpt.RailDirection:Outbound'}).pngPath,/E353系\.png$/);
 assert.equal(match('1M',{railDirection:'odpt.RailDirection:Inbound'}),null);
 assert.equal(match('2M'),null,'unpublished number cannot inherit 1–60 band');
 assert.equal(match('2101M'),null,'unpublished number cannot inherit 21xx band');
 assert.equal(match('3101M'),null,'unpublished number cannot inherit 31xx band');
 assert.equal(match('5001M'),null,'unpublished number cannot inherit 50xx band');
 assert.equal(match('1M',{serviceDate:'2026-12-01'}),null,'edition must not bleed into December');
 assert.equal(match('1M',{serviceDate:''}),null,'missing service date must not select artwork');
 assert.equal(match('1M',{trainType:'odpt.TrainType:JR-East.Local'}),null,'local M service cannot select E353');
});

test('Ome and Itsukaichi edition rosters are line-scoped; Itsukaichi has no T/H source family',()=>{
 const full=c.rules.find(r=>r.id==='js-0079');
 const bare=c.rules.find(r=>r.id==='js-0080');
 assert.deepEqual(full.line_ids,['Ome']);
 assert.deepEqual(bare.line_ids,['Ome','Itsukaichi']);
 assert.equal(full.evidence_kind,'official-month-calendar-roster');
 assert.equal(bare.evidence_kind,'official-month-calendar-roster');
 assert.equal(full.official_month,'2026-11');
 assert.equal(full.official_month_numbers.Ome.weekday.length,153);
 assert.equal(full.official_month_numbers.Ome.holiday.length,134);
 assert.equal(bare.official_month_numbers.Itsukaichi.weekday.length,102);
 assert.equal(bare.official_month_numbers.Itsukaichi.holiday.length,89);
 assert.ok(!bare.official_month_numbers.Ome.holiday.includes('2149'));
 assert.ok(bare.official_month_numbers.Itsukaichi.holiday.includes('2149'));
 assert.ok(full.actual_vehicle_confirmed===false&&bare.actual_vehicle_confirmed===false);
});

test('Tozai S and TWR 8x tail artwork stays model-evidence gated',()=>{
 const twr=c.rules.find(x=>x.id==='js-0058');
 const metro=c.rules.find(x=>x.id==='js-0091');
 assert.deepEqual(twr.runtime_guards.exactModelArtworkMap,{"東京臨海高速鉄道70-000形":"../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png","東京臨海高速鉄道71-000形":"../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png"});
 assert.deepEqual(metro.runtime_guards.exactModelArtworkMap,{"東京メトロ15000系":"../images/列车/東京メトロ/東京メトロ_15000系.png","東京メトロ07系":"../images/列车/東京メトロ/東京メトロ_07系.png"});
 assert.equal(twr.evidence_kind,'range-with-runtime-guards');
 assert.equal(metro.evidence_kind,'range-with-runtime-guards');
 assert.equal(twr.actual_vehicle_confirmed,false);
 assert.equal(metro.actual_vehicle_confirmed,false);
});

test('Saikyo and Rinkai tail families reject conflicting source/type/model observations',()=>{
 const sources={
  'js-0056':['odpt.Railway:JR-East.SaikyoKawagoe','odpt.Railway:TWR.Rinkai'],
  'js-0057':['odpt.Railway:JR-East.SaikyoKawagoe'],
  'js-0058':['odpt.Railway:JR-East.SaikyoKawagoe','odpt.Railway:TWR.Rinkai']
 };
 for(const [id,sourceList] of Object.entries(sources)){
  const row=c.rules.find(r=>r.id===id);
  assert.deepEqual(row.source_railways_if_present,sourceList,id);
  assert.deepEqual(row.runtime_guards.trainTypesIfPresent,
   ['Local','Rapid','CommuterRapid'],id);
  assert.ok(row.runtime_guards.allowedModelLabels.length>0,id);
  assert.equal(row.evidence_kind,'range-with-runtime-guards',id);
  assert.equal(row.actual_vehicle_confirmed,false,id);
  assert.ok(c.review.frontend_guard_only_rules.some(r=>r.rule===id),id);
 }
});
