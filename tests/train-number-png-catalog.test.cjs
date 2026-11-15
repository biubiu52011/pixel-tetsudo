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
test('four unverified arts are registered as review, never approved or native-file verified',()=>{
 assert.equal(c.review.sql_asset_review_required.length,5);
 assert.equal(new Set(c.review.sql_asset_review_required.map(r=>r.png)).size,4);
 for(const r of c.review.sql_asset_review_required){
  assert.equal(r.asset_status,'review');
  assert.equal(r.file_format_status,null);
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
 assert.equal(c.review.frontend_guard_only_rules.length,20);
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
