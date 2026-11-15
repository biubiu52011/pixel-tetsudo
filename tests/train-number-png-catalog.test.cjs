'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {getRows,buildCatalog,audit}=require('../tools/build-train-number-png-catalog.cjs');
const snapshot=require('../data/audits/supabase-railway-audit-snapshot-20261116.json');
const c=buildCatalog(snapshot,getRows());
test('2611 catalog includes both maintained owner rule sets and their SQL provenance',()=>{
 assert.equal(c.summary.sql_rules,291);
 assert.equal(c.summary.js_rules,108);
 assert.equal(c.summary.total_line_keys,76);
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
 assert.equal(c.review.frontend_guard_only_rules.length,17);
 assert.equal(c.review.frontend_official_month_rosters.length,2);
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
