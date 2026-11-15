'use strict';
// Unified read-only catalog. Do not promote published train-number ranges to actual formation evidence.
// node tools/build-train-number-png-catalog.cjs --write
// node tools/build-train-number-png-catalog.cjs --check --strict
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const JS='data/timetables/train-number-png-ranges.js';
const SNAP='data/audits/supabase-railway-audit-snapshot-20261116.json';
const OUT='data/audits/train-number-png-catalog-2611.json';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
function getRows(){
 const src=read(JS),marker='  Object.freeze(rows);';
 if(src.split(marker).length!==2)throw Error('Number-rule owner changed; review extractor');
 const context={window:{},console:{log(){},warn(){},debug(){},error(){}}};
 vm.runInNewContext(src.replace(marker,marker+'\nroot.__auditRows=rows;'),
  context,{filename:JS,timeout:15000});
 return JSON.parse(JSON.stringify(context.window.__auditRows));
}

/**
 * Compare only explicit, published JS train numbers against SQL intervals on
 * shared lines.  A range alone NEVER adds a train or permits a model choice.
 * The union of weekday/holiday lists is for audit comparison, NOT proof that
 * an individual number operates on both calendars.
 */
function crossSourceNumberAudit(sql,js){
 const sqlLines=new Set(sql.flatMap(r=>r.line_ids));
 const sharedLines=[...sqlLines].filter(line=>
   js.some(r=>r.line_ids.includes(line))).sort((a,b)=>a.localeCompare(b,'en'));
 const checked=[],conflicts=[],untested=[];
 for(const line of sharedLines){
  const sqlRules=sql.filter(r=>r.line_ids.includes(line));
  for(const j of js.filter(r=>r.line_ids.includes(line))){
   const names=[...new Set([...(j.published_numbers||[]),
     ...(j.weekday_numbers||[]),...(j.holiday_numbers||[])])];
   if(!names.length){
    untested.push({line,js_rule:j.id,reason:'no_explicit_number_list',
      note:'do not infer shared PNG compatibility from broad bands'});
    continue;
   }
   for(const number of names){
    // The literal source number, not an operation code or a suffix-less
    // transformation, is the only comparable cross-database identity.
    const m=/^(\d+)([A-Z]*)$/.exec(String(number));
    if(!m)continue;
    const value=Number(m[1]),suffix=m[2];
    for(const s of sqlRules){
     if(s.suffix!==suffix||value<s.min||value>s.max)continue;
     const common={line,train_number:number,sql_rule:s.id,js_rule:j.id};
     if(s.png===j.png)
      checked.push({...common,png:s.png,same_model_label:s.model===j.model});
     else conflicts.push({...common,sql_png:s.png,js_png:j.png,
       sql_model:s.model,js_model:j.model});
    }
   }
  }
 }
 return {shared_lines:sharedLines,verified_same_png:checked,
  png_conflicts:conflicts,unverified_js_rules:untested,
  meaning:'comparison of declared number/PNG references only, not operating-date or actual-carset proof'};
}

function buildCatalog(snapshot, rows) {
 const norm = p => String(p||'').replace(/^(\.\.\/|\.\/|\/)+/,'');
 const sql=(snapshot.published_train_png_number_ranges||[]).map((r,i)=>({
  id:'sql-'+String(i+1).padStart(4,'0'),origin:'sql_snapshot',
  line_ids:[r.line_key],segment:r.segment_key,format:'full',source_url:r.source_url||null,
  min:r.min_number,max:r.max_number,suffix:r.suffix||'',
  model:r.vehicle_model,png:norm(r.png_reference),
  requires_exact_roster:r.requires_exact_roster===true,
  actual_vehicle_confirmed:r.actual_vehicle_confirmed===true
 }));
 const representedJsKeys=new Set(["lineIds","numberFormat","from","to","suffixes","model","pngPath","trainType","trainTypes","numberIndex","publishedNumbers","weekdayNumbers","holidayNumbers","officialMonth","officialMonthNumbers","calendarType","operatingDates","validFrom","validTo","operator","sourceRailways","sourceRailwaysIfPresent","directionNumberParity","requireCompatiblePlan"]);
 const js=rows.map((r,i)=>({
  id:'js-'+String(i+1).padStart(4,'0'),origin:'frontend_js',
  line_ids:r.lineIds,format:r.numberFormat||'tail',
  min:r.from,max:r.to,suffix:r.suffixes||'',model:r.model,png:norm(r.pngPath),
  train_type:r.trainType||null,train_types:r.trainTypes||null,
  number_index:r.numberIndex||null,
  published_numbers:r.publishedNumbers||null,
  weekday_numbers:r.weekdayNumbers||null,holiday_numbers:r.holidayNumbers||null,
  official_month:r.officialMonth||null,official_month_numbers:r.officialMonthNumbers||null,
  calendar_type:r.calendarType||null,operating_dates:r.operatingDates||null,
  valid_from:r.validFrom||null,valid_to:r.validTo||null,operator:r.operator||null,
  source_railways:r.sourceRailways||null,
  source_railways_if_present:r.sourceRailwaysIfPresent||null,
  direction_number_parity:r.directionNumberParity||null,
  requires_compatible_plan:r.requireCompatiblePlan===true,
  runtime_guards:Object.fromEntries(Object.keys(r)
   .filter(k=>!representedJsKeys.has(k)).sort().map(k=>[k,r[k]])),
  evidence_kind:(r.publishedNumbers||r.weekdayNumbers||r.holidayNumbers)?'exact-list':
    r.numberIndex?'external-index':
    r.officialMonthNumbers?'official-month-calendar-roster':
    r.from===r.to&&r.requireCompatiblePlan===true?'singleton-compatible-plan':
    'range-with-runtime-guards',
  actual_vehicle_confirmed:false
 }));
 const index={};
 for(const r of sql.concat(js))for(const line of r.line_ids){
  if(!index[line])index[line]={sql:[],js:[]};
  index[line][r.origin==='sql_snapshot'?'sql':'js'].push(r.id);
 }
 const sortedIndex=Object.fromEntries(Object.entries(index).sort((a,b)=>a[0].localeCompare(b[0],'en')));
 const assets=new Map(snapshot.vehicle_image_assets.map(a=>[norm(a.image_path),a]));
 const missing=[],pending=[],labels=[],overlaps=[];
 const labelKind=(model,assetModel)=>{
  if(model.includes(' / '))return 'multi_subseries_reference_not_exact_identity';
  if(model.startsWith(assetModel))return 'asset_series_with_more_specific_rule_label';
  if(assetModel.startsWith(model))return 'asset_label_with_more_specific_context';
  if(model.replace('形','系')===assetModel)return 'class_label_typographic_variant';
  return 'unresolved_model_identity';
 };
 for(const r of sql){
  const a=assets.get(r.png);
  if(!a)missing.push({rule:r.id,line:r.line_ids[0],segment:r.segment,png:r.png});
  else {
   if(a.asset_status!=='available'||a.file_format_status!=='native_png'||a.appearance_class==='requires_review')
    pending.push({rule:r.id,line:r.line_ids[0],png:r.png,
     asset_status:a.asset_status,file_format_status:a.file_format_status,
     appearance_class:a.appearance_class});
   if(a.vehicle_type!==r.model)labels.push({rule:r.id,line:r.line_ids[0],
    rule_model:r.model,asset_model:a.vehicle_type,png:r.png,
    label_relation:labelKind(r.model,a.vehicle_type),
    safe_alias_authorized:false});
  }
 }
 for(let i=0;i<sql.length;i++)for(let j=i+1;j<sql.length;j++){
  const a=sql[i],b=sql[j];
  if(a.line_ids[0]!==b.line_ids[0]||a.suffix!==b.suffix||a.min>b.max||b.min>a.max)continue;
  overlaps.push({a:a.id,b:b.id,line:a.line_ids[0],
   segment_a:a.segment,segment_b:b.segment,
   min:Math.max(a.min,b.min),max:Math.min(a.max,b.max),
   same_model_png:a.model===b.model&&a.png===b.png,
   classification:a.model===b.model&&a.png===b.png?'same_artwork_separate_source_evidence':'cross_model_candidate_bands_require_exact_roster',
   may_select_by_band_alone:false});
 }
 const frontendGuardReview=js.filter(r=>r.evidence_kind==='range-with-runtime-guards')
   .map(r=>({rule:r.id,line_ids:r.line_ids,model:r.model,
    min:r.min,max:r.max,suffix:r.suffix,format:r.format,
    requires_compatible_plan:r.requires_compatible_plan,
    has_source_railway_guard:Array.isArray(r.source_railways)&&r.source_railways.length>0,
    has_type_guard:!!(r.train_type||(r.train_types&&r.train_types.length)),
    has_date_window:!!(r.valid_from&&r.valid_to)}));
 const frontendMonthRoster=js.filter(r=>r.evidence_kind==='official-month-calendar-roster')
   .map(r=>({rule:r.id,line_ids:r.line_ids,official_month:r.official_month,
    calendar_counts:Object.fromEntries(Object.entries(r.official_month_numbers||{})
      .map(([line,v])=>[line,{weekday:v.weekday.length,holiday:v.holiday.length}]))}));
 const frontendSingleton=js.filter(r=>r.evidence_kind==='singleton-compatible-plan')
   .map(r=>({rule:r.id,line_ids:r.line_ids,number:r.min,suffix:r.suffix,
    requires_compatible_plan:r.requires_compatible_plan}));
 const crossSource=crossSourceNumberAudit(sql,js);
 return {schema_version:1,edition:'2611',snapshot_date:snapshot.snapshot_date,
  role:'derived read-only catalog; never exact physical formation evidence',
  sources:['data/timetables/train-number-png-ranges.js','data/audits/supabase-railway-audit-snapshot-20261116.json',
   'data/timetables/vehicle-garage-png-map.js'],
  summary:{sql_rules:sql.length,js_rules:js.length,js_line_assignments:js.reduce((n,r)=>n+r.line_ids.length,0),
   total_line_keys:Object.keys(sortedIndex).length,
   sql_lines:new Set(sql.map(r=>r.line_ids[0])).size,
   js_lines:new Set(js.flatMap(r=>r.line_ids)).size,
   shared_sql_frontend_lines:crossSource.shared_lines.length,
   cross_source_same_png_number_matches:crossSource.verified_same_png.length,
   cross_source_png_conflicts:crossSource.png_conflicts.length,
   cross_source_untested_js_rules:crossSource.unverified_js_rules.length,
   unregistered_sql_png_rules:missing.length,sql_assets_pending_review:pending.length,
   frontend_guard_only_rules:frontendGuardReview.length,
   frontend_rules_with_additional_source_fields:js.filter(r=>
    Object.keys(r.runtime_guards).length>0).length,
   frontend_additional_source_keys:new Set(js.flatMap(r=>Object.keys(r.runtime_guards))).size,
   frontend_official_month_rosters:frontendMonthRoster.length,
   frontend_singleton_candidates:frontendSingleton.length,
   model_label_differences:labels.length,
   overlapping_sql_bands:overlaps.length,
   overlapping_different_model_bands:overlaps.filter(x=>!x.same_model_png).length},
  line_index:sortedIndex,rules:sql.concat(js),
  review:{missing_sql_asset_registration:missing,sql_asset_review_required:pending,
   frontend_guard_only_rules:frontendGuardReview,
   frontend_official_month_rosters:frontendMonthRoster,
   frontend_singleton_candidates:frontendSingleton,
   sql_asset_label_differences:labels,sql_range_overlaps:overlaps,
   cross_source_number_png:crossSource}};
}
function audit(c){
 const errors=[];
 const lines=JSON.parse(read('data/core/railway_data.compact.json')).lines;
 for(const r of c.rules){
  if(!r.line_ids.length||r.line_ids.some(k=>!lines[k]))
   errors.push(r.id+': missing canonical line');
  if(!Number.isInteger(r.min)||!Number.isInteger(r.max)||r.min<0||r.min>r.max)
   errors.push(r.id+': invalid interval');
  if(!r.model||!r.png.startsWith('images/列车/')||
     !fs.existsSync(path.join(ROOT,r.png)))
   errors.push(r.id+': missing model or physical PNG '+r.png);
  if(r.actual_vehicle_confirmed)
   errors.push(r.id+': number range must not assert actual car');
  if(r.origin==='sql_snapshot'&&!r.requires_exact_roster)
   errors.push(r.id+': number range missing exact-roster guard');
  if(r.origin==='sql_snapshot'&&!r.source_url)
   errors.push(r.id+': SQL rule missing provenance source');
  if(r.origin==='frontend_js'&&(!r.runtime_guards||
     typeof r.runtime_guards!=='object'||Array.isArray(r.runtime_guards)))
   errors.push(r.id+': missing source-specific runtime qualifiers');
  if(r.origin==='frontend_js'&&r.runtime_guards?.requireExplicitModelEvidence===true&&
    (!Array.isArray(r.runtime_guards.allowedModelLabels)||
     r.runtime_guards.allowedModelLabels.length===0))
   errors.push(r.id+': explicit-model rule missing allowed model labels');
 }
 if(c.review.cross_source_number_png.png_conflicts.length)
  errors.push('SQL/frontend published train-number PNG artwork conflict');
 if(c.review.cross_source_number_png.verified_same_png.length<180)
  errors.push('previously reconciled exact-number artwork mappings regressed');
 // Newly inventoried art is REVIEW ONLY; native PNG does not prove face or carset.
 if(c.review.missing_sql_asset_registration.length)
  errors.push('SQL range references unregistered PNG assets');
 const expectedReview=new Map([
  ['images/列车/富士急行/富士急行_6000系_標準色.png',1],
  ['images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',2],
  ['images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',1],
  ['images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png',1]
 ]);
 const reviewCounts=new Map();
 for(const r of c.review.sql_asset_review_required){
  reviewCounts.set(r.png,(reviewCounts.get(r.png)||0)+1);
  if(!expectedReview.has(r.png)||r.asset_status!=='review'||
    r.appearance_class!=='requires_review'||r.file_format_status!=='native_png')
   errors.push('unexpected SQL asset review/promotion '+r.png);
 }
 if(c.review.sql_asset_review_required.length!==5||
  [...expectedReview].some(([p,n])=>reviewCounts.get(p)!==n))
  errors.push('pending assets changed; independently revalidate artwork and update audit');
 if(c.review.frontend_guard_only_rules.length>17)
  errors.push('new frontend ranges without explicit number set or verifier');
 if(c.review.frontend_official_month_rosters.length!==2)
  errors.push('official-month exact rosters changed; reassess month-gated matcher');
 for(const r of c.rules.filter(x=>x.evidence_kind==='official-month-calendar-roster')){
  if(r.official_month!=='2026-11'||!r.official_month_numbers||
    r.line_ids.some(line=>!r.official_month_numbers[line]))
   errors.push('monthly roster guard corrupted '+r.id);
 }
 if(c.review.frontend_singleton_candidates.length!==1||
   c.review.frontend_singleton_candidates[0].requires_compatible_plan!==true)
  errors.push('singleton rule requires scoped compatible plan');
 if(c.review.sql_asset_label_differences.length>14)
  errors.push('new model-label inconsistencies');
 const allowed=new Set([
  'east_211_family|east_e353_azusa_hakuba',
  'east_211_family|east_e127_100_family',
  'east_e127_100_family|east_e353_azusa_hakuba'
 ]);
 for(const r of c.review.sql_range_overlaps){
  if(r.may_select_by_band_alone!==false)errors.push('overlap must not auto-select artwork');
  const a=c.rules.find(x=>x.id===r.a),b=c.rules.find(x=>x.id===r.b);
  if(!a?.requires_exact_roster||!b?.requires_exact_roster)
   errors.push('overlap without exact-roster guards');
  if(r.same_model_png)continue;
  if(r.line!=='Oito'||(!allowed.has(r.segment_a+'|'+r.segment_b)&&
    !allowed.has(r.segment_b+'|'+r.segment_a)))
   errors.push('new cross-model number conflict '+r.line+'/'+r.segment_a+'/'+r.segment_b);
 }
 if(c.review.sql_range_overlaps.length>6)errors.push('new overlapping SQL bands');
 return errors;
}
function run(args){
 const catalog=buildCatalog(JSON.parse(read(SNAP)),getRows());
 const errors=audit(catalog),output=JSON.stringify(catalog,null,2)+'\n';
 if(args.includes('--write'))fs.writeFileSync(path.join(ROOT,OUT),output);
 if(args.includes('--check')&&(!fs.existsSync(path.join(ROOT,OUT))||read(OUT)!==output))
  errors.push('stale catalog: regenerate with --write');
 console.log(JSON.stringify({catalog:OUT,summary:catalog.summary,errors},null,2));
 if(args.includes('--strict')&&errors.length)process.exitCode=1;
 return {catalog,errors};
}
if(require.main===module)run(process.argv.slice(2));
module.exports={getRows,buildCatalog,crossSourceNumberAudit,audit,run};
