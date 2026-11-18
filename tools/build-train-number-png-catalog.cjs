'use strict';
// Unified read-only catalog. Do not promote published train-number ranges to actual formation evidence.
// node tools/build-train-number-png-catalog.cjs --write
// node tools/build-train-number-png-catalog.cjs --check --strict
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const JS='data/timetables/train-number-png-ranges.js';
const SNAP='data/audits/supabase-railway-audit-snapshot-20261116.json';
const OUT='data/audits/train-number-png-catalog-2611.json';
const PNG_INVENTORY='data/audits/png-first-number-band-inventory-20261117.csv';
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

function collectCandidateOverlaps(rules) {
 const byLine=new Map();
 for(const r of rules)for(const line of new Set(r.line_ids)){
  if(!byLine.has(line))byLine.set(line,[]);
  byLine.get(line).push(r);
 }
 const found=[];
 for(const [line,rows] of byLine){
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j];
   if(a.png===b.png||a.format!==b.format||
      a.min>b.max||b.min>a.max)continue;
   const suffixes=[...new Set(String(a.suffix).split(''))]
     .filter(s=>String(b.suffix).includes(s));
   if(!suffixes.length)continue;
   found.push({line,rule_a:a.id,rule_b:b.id,
    start:Math.max(a.min,b.min),end:Math.min(a.max,b.max),
    suffix:suffixes.join(''),number_format:a.format,
    png_a:a.png,png_b:b.png,
    origin_a:a.origin,origin_b:b.origin,
    status:'potential_overlap_only; context guards may disambiguate'});
  }
 }
 return found;
}
function buildCatalog(snapshot, rows) {
 const norm = p => String(p||'').replace(/^(\.\.\/|\.\/|\/)+/,'');
 const sql=(snapshot.published_train_png_number_ranges||[]).map((r,i)=>({
  id:'sql-'+String(i+1).padStart(4,'0'),origin:'sql_snapshot',
  line_ids:[r.line_key],segment:r.segment_key,format:'full',source_url:r.source_url||null,
  min:r.min_number,max:r.max_number,suffix:r.suffix||'',
  model:r.vehicle_model,png:norm(r.png_reference),
  requires_exact_roster:r.requires_exact_roster===true,
  actual_vehicle_confirmed:r.actual_vehicle_confirmed===true,
  ...(String(r.segment_key||'').startsWith('png_band/')?{pure_number_band:true}:{})
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
   if(!r.pure_number_band&&a.vehicle_type!==r.model)labels.push({rule:r.id,line:r.line_ids[0],
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
    has_source_railway_guard:!!((Array.isArray(r.source_railways)&&r.source_railways.length)||
      (Array.isArray(r.source_railways_if_present)&&r.source_railways_if_present.length)),
    has_type_guard:!!(r.train_type||(r.train_types&&r.train_types.length)||
      (r.runtime_guards.trainTypesIfPresent&&r.runtime_guards.trainTypesIfPresent.length)),
    has_date_window:!!(r.valid_from&&r.valid_to)}));
 const frontendMonthRoster=js.filter(r=>r.evidence_kind==='official-month-calendar-roster')
   .map(r=>({rule:r.id,line_ids:r.line_ids,official_month:r.official_month,
    calendar_counts:Object.fromEntries(Object.entries(r.official_month_numbers||{})
      .map(([line,v])=>[line,{weekday:v.weekday.length,holiday:v.holiday.length}]))}));
 const frontendSingleton=js.filter(r=>r.evidence_kind==='singleton-compatible-plan')
   .map(r=>({rule:r.id,line_ids:r.line_ids,number:r.min,suffix:r.suffix,
    requires_compatible_plan:r.requires_compatible_plan}));
 const crossSource=crossSourceNumberAudit(sql,js);
 const candidateOverlaps=collectCandidateOverlaps(sql.concat(js));
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
   overlapping_different_model_bands:overlaps.filter(x=>!x.same_model_png).length,
   potential_cross_png_band_intersections:candidateOverlaps.length},
  line_index:sortedIndex,rules:sql.concat(js),
  review:{missing_sql_asset_registration:missing,sql_asset_review_required:pending,
   frontend_guard_only_rules:frontendGuardReview,
   frontend_official_month_rosters:frontendMonthRoster,
   frontend_singleton_candidates:frontendSingleton,
   sql_asset_label_differences:labels,sql_range_overlaps:overlaps,
   cross_source_number_png:crossSource,
   candidate_range_overlaps:candidateOverlaps}};
}
function audit(c){
 const errors=[];
 const lines=JSON.parse(read('data/core/railway_data.compact.json')).lines;
 for(const r of c.rules){
  if(!r.line_ids.length||r.line_ids.some(k=>!lines[k]))
   errors.push(r.id+': missing canonical line');
  if(!Number.isInteger(r.min)||!Number.isInteger(r.max)||r.min<0||r.min>r.max)
   errors.push(r.id+': invalid interval');
  if((!r.model&&!r.pure_number_band)||!r.png.startsWith('images/列车/')||
     !fs.existsSync(path.join(ROOT,r.png)))
   errors.push(r.id+': missing model or physical PNG '+r.png);
  if(r.actual_vehicle_confirmed)
   errors.push(r.id+': number range must not assert actual car');
  if(r.origin==='sql_snapshot'&&r.pure_number_band){
   if(r.model!=null||r.source_url!=null||r.requires_exact_roster||
      r.actual_vehicle_confirmed)
    errors.push(r.id+': pure PNG band cannot claim model/source/identity');
  }else if(r.origin==='sql_snapshot'){
   if(!r.requires_exact_roster)errors.push(r.id+': number range missing exact-roster guard');
   if(!r.source_url)errors.push(r.id+': SQL rule missing provenance source');
  }
  if(r.origin==='frontend_js'&&(!r.runtime_guards||
     typeof r.runtime_guards!=='object'||Array.isArray(r.runtime_guards)))
   errors.push(r.id+': missing source-specific runtime qualifiers');
  if(r.origin==='frontend_js'&&r.runtime_guards?.requireExplicitModelEvidence===true&&
    (!Array.isArray(r.runtime_guards.allowedModelLabels)||
     r.runtime_guards.allowedModelLabels.length===0))
   errors.push(r.id+': explicit-model rule missing allowed model labels');
  if(r.origin==='frontend_js'&&r.runtime_guards?.exactModelArtworkMap){
   const entries=Object.entries(r.runtime_guards.exactModelArtworkMap);
   const labels=r.runtime_guards.allowedModelLabels||[];
   if(!entries.length||!entries.some(([model,png])=>model===r.model&&
      String(png).replace(/^(\.\.\/|\.\/|\/)+/,'')===r.png))
    errors.push(r.id+': exact model map missing its primary library identity');
   for(const [model,png] of entries){
    const normalized=String(png||'').replace(/^(\.\.\/|\.\/|\/)+/,'');
    if(!labels.includes(model)||!normalized.startsWith('images/列车/')||
        !fs.existsSync(path.join(ROOT,normalized)))
     errors.push(r.id+': unknown exact model or absent PNG '+model);
   }
  }
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
 // Current unresolved number families form an exact approved audit baseline.
 // New broad bands must fail even when another older band is removed.
 const approvedGuardOnly=new Set(["SaikyoKawagoe,Rinkai|0|71|KFS|tail|E233系7000番台","SaikyoKawagoe|72|79|KFS|tail|相鉄12000系","SaikyoKawagoe,Rinkai|80|91|KFS|tail|東京臨海高速鉄道70-000形","Tozai|400|2599|S|metro-prefixed|東京メトロ15000系","Tozai|400|2599|K|metro-prefixed|E231系800番台（東西線直通）","Tozai|400|2599|T|metro-prefixed|東葉高速2000系","JobanLocal|400|2599|K|full|E233系2000番台","JobanLocal|400|2599|S|full|東京メトロ16000系","JobanLocal|400|2599|E|full|小田急4000形"]);
 for(const r of c.review.frontend_guard_only_rules){
  const key=[r.line_ids.join(','),r.min,r.max,r.suffix,r.format,r.model].join('|');
  if(!approvedGuardOnly.has(key))
   errors.push('new unreviewed guard-only number range: '+key);
 }
 if(c.review.frontend_guard_only_rules.length>9)
  errors.push('new frontend ranges without explicit number set or verifier');
 if(c.review.frontend_official_month_rosters.length!==4)
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
  const first=c.rules.find(x=>x.id===r.a),second=c.rules.find(x=>x.id===r.b);
  if(first?.pure_number_band||second?.pure_number_band){
   if(first.png!==second.png)
    errors.push('conflicting pure PNG band '+r.line+'/'+r.segment_a+'/'+r.segment_b);
   continue;
  }
  if(!first?.requires_exact_roster||!second?.requires_exact_roster)
   errors.push('overlap without exact-roster guards');
  if(r.same_model_png)continue;
  if(r.line!=='Oito'||(!allowed.has(r.segment_a+'|'+r.segment_b)&&
    !allowed.has(r.segment_b+'|'+r.segment_a)))
   errors.push('new cross-model number conflict '+r.line+'/'+r.segment_a+'/'+r.segment_b);
 }
 const oldOverlaps=c.review.sql_range_overlaps.filter(r=>
  !c.rules.find(x=>x.id===r.a)?.pure_number_band&&
  !c.rules.find(x=>x.id===r.b)?.pure_number_band);
 if(oldOverlaps.length>6)errors.push('new overlapping legacy SQL bands');
 return errors;
}
function compactNumberBands(input){
 const source=[...new Map(input.map(b=>[b.join('|'),b])).values()];
 source.sort((a,b)=>{
  const group=x=>[x[0],x[3],x[4],x[5]].join('|');
  const ka=group(a),kb=group(b);
  return ka<kb?-1:ka>kb?1:Number(a[1])-Number(b[1])||Number(a[2])-Number(b[2]);
 });
 const reduced=[];
 for(const next of source){
  const last=reduced[reduced.length-1];
  const same=last&&last[0]===next[0]&&
   last[3]===next[3]&&last[4]===next[4]&&last[5]===next[5];
  if(same&&Number(next[1])<=Number(last[2])+1){
   const end=Math.max(Number(last[2]),Number(next[2]));
   last[2]=String(end).padStart(4,'0');
  }else reduced.push(next.slice());
 }
 return reduced;
}
// Audit-only reuse of existing JR East numbered illustration resolvers.
function jrEastScopedNumberBands(){
 const root={},context={window:root,Date,console:{log(){},warn(){},debug(){},error(){}}};
 for(const script of [
  'data/timetables/jreast-yamagata-2611-number-index.js',
  'data/timetables/jreast-tazawako-2611-number-index.js'
 ])vm.runInNewContext(read(script),context,{filename:script,timeout:15000});
 const yam=root.JREastYamagataNumberIndex202611,taz=root.JREastTazawakoNumberIndex202611;
 if(!yam||!taz||!taz.image||!Array.isArray(taz.stops))
  throw Error('Missing JR East source-number audit exports');
 const calendars={Weekday:'2026-11-05',SaturdayHoliday:'2026-11-07'},refs=[];
 function add(png,line,number,cal){
  const m=/^([0-9]{1,5})([A-Z])$/.exec(number);
  if(!m)throw Error('Unexpected JR published number: '+number);
  const path=String(png||'').replace(/^(?:\.\.\/|\.\/|\/)+/,'');
  if(!path.startsWith('images/列车/'))throw Error('Invalid JR PNG path: '+png);
  refs.push({png:path,line,from:m[1].padStart(4,'0'),
   to:m[1].padStart(4,'0'),suffix:m[2],format:'full',
   status:'既有JR专用示意守卫('+cal+')'});
 }
 for(const [model,numbers] of Object.entries(yam.observed)){
  if(!yam.image[model])throw Error('Yamagata observed model has no PNG');
  for(const number of numbers)for(const [cal,date] of Object.entries(calendars)){
   const trip=yam.roster[cal]?.[number];
   if(!trip)continue;
   const p={positionLineId:'Yamagata',displayLineId:'Yamagata',
    sourceRailway:'odpt.Railway:JR-East.Yamagata',
    positionSource:'supabase-train-run',estimated:true,
    trainOperator:'JR-East',serviceDate:date,calendarType:cal,
    trainNumber:number,trainType:'odpt.TrainType:JR-East.Local',
    railDirection:'odpt.RailDirection:'+trip[0],
    scheduledStopKeys:trip[1].map(i=>yam.stops[i]),
    vehicleIdentityStatus:'UNKNOWN'};
   const approved=yam.resolve(p);
   if(!approved||approved.illustrationPng!==yam.image[model]||
      approved.actualVehicleConfirmed!==false)
    throw Error('Yamagata illustrated number not verified: '+number+'/'+cal);
   add(approved.illustrationPng,'Yamagata',number,cal);
  }
 }
 for(const [cal,directions] of Object.entries(taz.source)){
  const date=calendars[cal];
  if(!date)throw Error('Unexpected Tazawako calendar: '+cal);
  for(const [direction,numbers] of Object.entries(directions))
   for(const [number,record] of Object.entries(numbers)){
    const a=taz.stops.indexOf(record[1]),b=taz.stops.indexOf(record[2]);
    if(a<0||b<0)throw Error('Tazawako roster station missing');
    const step=a<=b?1:-1,stopKeys=[];
    for(let i=a;step>0?i<=b:i>=b;i+=step)stopKeys.push(taz.stops[i]);
    if(stopKeys.length!==record[0])throw Error('Tazawako noncanonical route: '+number);
    const p={positionLineId:'Tazawako',displayLineId:'Tazawako',
     sourceRailway:'odpt.Railway:JR-East.Tazawako',
     positionSource:'supabase-train-run',estimated:true,
     trainOperator:'JR-East',serviceDate:date,calendarType:cal,
     trainNumber:number,trainType:'odpt.TrainType:JR-East.Local',
     railDirection:'odpt.RailDirection:'+direction,
     scheduledStopKeys:stopKeys,vehicleIdentityStatus:'UNKNOWN'};
    const approved=taz.resolve(p);
    if(!approved||approved.illustrationPng!==taz.image||
       approved.actualVehicleConfirmed!==false)
     throw Error('Tazawako illustrated number not verified: '+number+'/'+cal);
    add(approved.illustrationPng,'Tazawako',number,cal);
   }
 }
 return refs;
}
// Extra JR existing line-source number rosters, audit-only; not runtime authority.
function jrEastAdditionalNumberBands(){
 const root={},context={window:root,Date,
  console:{log(){},warn(){},debug(){},error(){}}};
 for(const script of ['data/timetables/jreast-senzan-2611-number-index.js',
                       'data/timetables/jreast-ryomo-2611-number-index.js'])
  vm.runInNewContext(read(script),context,{filename:script,timeout:15000});
 const senz=root.JREastSenzanNumberIndex202611,
  ryomo=root.JREastRyomoNumberIndex202611;
 if(!senz||!senz.regularNumbers||!senz.specialDates||
    !ryomo||!Array.isArray(ryomo.groups))
  throw Error('Missing JR numbered illustration registry');
 const calendars={Weekday:'2026-11-16',SaturdayHoliday:'2026-11-07'};
 const records=[];
 function add(entry,line,cal,special){
  const m=/^([0-9]{1,5})([A-Z])$/.exec(entry.trainNumber);
  if(!m||!entry.illustrationPng||entry.actualVehicleConfirmed!==false||
     entry.authorizesPNG!==false)
   throw Error('Invalid non-physical numbered JR illustration');
  const png=String(entry.illustrationPng).replace(/^(?:\.\.\/|\.\/|\/)+/,'');
  if(!png.startsWith('images/列车/'))throw Error('Invalid JR gallery path: '+png);
  records.push({png,line,from:m[1].padStart(4,'0'),
   to:m[1].padStart(4,'0'),suffix:m[2],format:'full',
   status:'既有JR专用示意守卫('+cal+(special?';限定日期':'')+')'});
 }
 for(const [cal,date] of Object.entries(calendars)){
  for(const [direction,types] of Object.entries(senz.regularNumbers))
   for(const [type,numbers] of Object.entries(types))
    for(const number of numbers){
     const p={positionLineId:'Senzan',displayLineId:'Senzan',
      sourceRailway:'odpt.Railway:JR-East.Senzan',
      positionSource:'supabase-train-run',estimated:true,
      trainOperator:'JR-East',calendarType:cal==='Weekday'?'weekday':'holiday',
      serviceDate:date,trainNumber:number,railDirection:'odpt.RailDirection:'+direction,
      trainType:'odpt.TrainType:JR-East.'+type,vehicleIdentityStatus:'UNKNOWN'};
     const approved=senz.resolve(p);
     if(!approved||approved.illustrationModel!=='E721系')
      throw Error('Senzan regular source rule no longer qualifies: '+number+'/'+cal);
     add(approved,'Senzan',cal,false);
    }
  if(!senz.specialDates.includes(date))
   throw Error('Senzan reference date missing special operation');
  for(const [direction,number] of [['Outbound','8821D'],['Inbound','8822D']]){
   const p={positionLineId:'Senzan',displayLineId:'Senzan',
    sourceRailway:'odpt.Railway:JR-East.Senzan',
    positionSource:'supabase-train-run',estimated:true,
    trainOperator:'JR-East',calendarType:cal==='Weekday'?'weekday':'holiday',
    serviceDate:date,trainNumber:number,
    railDirection:'odpt.RailDirection:'+direction,
    trainType:'odpt.TrainType:JR-East.Rapid',vehicleIdentityStatus:'UNKNOWN'};
   const approved=senz.resolve(p);
   if(!approved||approved.serviceKind!=='satono')
    throw Error('Senzan dated special no longer qualifies: '+number+'/'+cal);
   add(approved,'Senzan',cal,true);
  }
 }
 for(const [cal,direction,kind,numbers] of ryomo.groups){
  const date=calendars[cal];
  if(!date)throw Error('Unexpected Ryomo calendar');
  for(const number of numbers.split(',')){
   const type=number.endsWith('Y')?'Rapid':'Local';
   const p={positionLineId:'Ryomo',displayLineId:'Ryomo',
    sourceRailway:'odpt.Railway:JR-East.Ryomo',
    positionSource:'supabase-train-run',estimated:true,
    trainOperator:'JR-East',calendarType:cal==='Weekday'?'weekday':'holiday',
    serviceDate:date,trainNumber:number,
    railDirection:'odpt.RailDirection:'+direction,
    trainType:'odpt.TrainType:JR-East.'+type,
    vehicleIdentityStatus:'UNKNOWN'};
   const approved=ryomo.resolve(p);
   if(!approved||approved.kind!==kind)
    throw Error('Ryomo numbered source rule not unique: '+number+'/'+cal+'/'+direction);
   add(approved,'Ryomo',cal,false);
  }
 }
 return records;
}
// Derive the gallery audit from the already applied SQL seed. The source
// modules still own the guards; this is NOT an extra runtime mapping table.
// Include the 97 initial PNG-first SQL bands in the read-only gallery audit.
// Original JS guards still determine actual applicability.
const JR_FIRST_SQL_MIGRATION='supabase/migrations/20261116180740_enable_and_seed_png_first_jr_reference_bands_2611.sql';
function jrFirstSqlSeedBands(){
 const src=read(JR_FIRST_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==97)throw Error('JR SQL number bands do not match initial applied migration');
 var records=matches.map((m)=>({
  line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'
 }));
 // The original migration remains immutable. Apply the later effective
 // reference-only one-row correction to this read-only audit projection.
 const correction=read('supabase/migrations/20261117230000_fix_narita_abiko_e231_livery_reference_2611.sql');
 if(!correction.includes("SET png_reference='../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png'") ||
    !correction.includes("segment_key='png_band/NaritaAbikoBranch/0820-0899M'") ||
    !correction.includes("AND png_reference='../images/列车/JR東日本/JR東日本_E231系_0番台.png'"))
   throw Error('Narita-Abiko correction migration contract changed');
 const patched=records.filter(r=>r.line==='NaritaAbikoBranch'&&
   r.segment==='png_band/NaritaAbikoBranch/0820-0899M'&&
   r.from==='0820'&&r.to==='0899'&&r.suffix==='M'&&
   r.png==='images/列车/JR東日本/JR東日本_E231系_0番台.png');
 if(patched.length!==1)throw Error('Narita-Abiko legacy band not unique');
 patched[0].png='images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png';
 return records;
}

const JR_SCOPED_SQL_MIGRATION='supabase/migrations/20261116183142_seed_png_first_jr_scoped_reference_bands_2611.sql';
function jrScopedSqlSeedBands(){
 const src=read(JR_SCOPED_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==20)throw Error('JR SQL number bands do not match reviewed migration');
 return matches.map((m)=>({
  line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'
 }));
}

// Existing JR third-batch SQL source is read only for the same PNG inventory.
const JR_THIRD_SQL_MIGRATION='supabase/migrations/20261116194249_seed_png_first_jr_oga_ishinomaki_kitakami_bands_2611.sql';
function jrThirdSqlSeedBands(){
 const src=read(JR_THIRD_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==20)throw Error('JR third SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Fourth batch: same audit-only SQL reader; never a runtime authority.
const JR_FOURTH_SQL_MIGRATION='supabase/migrations/20261116201347_seed_png_first_jr_hakushin_hachiko_yamanote_yokohama_bands_2611.sql';
function jrFourthSqlSeedBands(){
 const src=read(JR_FOURTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==12)throw Error('JR fourth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Fifth JR batch from existing SQL, audit-only. No new runtime map.
const JR_FIFTH_SQL_MIGRATION='supabase/migrations/20261116202922_seed_png_first_jr_keihin_kururi_rikuto_chiba_bands_2611.sql';
function jrFifthSqlSeedBands(){
 const src=read(JR_FIFTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==27)throw Error('JR fifth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Sixth JR batch: read migration for the derived inventory, not runtime resolution.
const JR_SIXTH_SQL_MIGRATION='supabase/migrations/20261116204630_seed_png_first_sixth_jr_keiyo_sunrise_new_gallery_bands_2611.sql';
function jrSixthSqlSeedBands(){
 const src=read(JR_SIXTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==3)throw Error('JR sixth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Seventh JR batch: SQL audit reference for date-gated OyKot gallery PNG.
const JR_SEVENTH_SQL_MIGRATION='supabase/migrations/20261117035439_seed_png_first_seventh_jr_iiyama_oykot_band_2611.sql';
function jrSeventhSqlSeedBands(){
 const src=read(JR_SEVENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==1)throw Error('JR seventh SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
 // Eighth JR batch: SQL audit reference only; retain original source guards.
const JR_EIGHTH_SQL_MIGRATION='supabase/migrations/20261117043056_seed_png_first_eighth_jr_kyushu_800_senseki_e131_bands_2611.sql';
function jrEighthSqlSeedBands(){
 const src=read(JR_EIGHTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==17)throw Error('JR eighth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Ninth JR batch: SQL audit reference only; retain original source guards.
const JR_NINTH_SQL_MIGRATION='supabase/migrations/20261117043610_seed_png_first_ninth_jr_nambu_joban_mito_bands_2611.sql';
function jrNinthSqlSeedBands(){
 const src=read(JR_NINTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==4)throw Error('JR ninth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Tenth JR batch: SQL audit reference only; retain original source guards.
const JR_TENTH_SQL_MIGRATION='supabase/migrations/20261117044055_seed_png_first_tenth_jr_kashima_odoriko_oumain_bands_2611.sql';
function jrTenthSqlSeedBands(){
 const src=read(JR_TENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==6)throw Error('JR tenth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Eleventh JR batch: SQL audit reference only; retain original source guards.
const JR_ELEVENTH_SQL_MIGRATION='supabase/migrations/20261117045138_seed_png_first_eleventh_jr_odori_joban_sotobo_bands_2611.sql';
function jrEleventhSqlSeedBands(){
 const src=read(JR_ELEVENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==20)throw Error('JR eleventh SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Twelfth JR batch: SQL audit reference only; retain original source guards.
const JR_TWELFTH_SQL_MIGRATION='supabase/migrations/20261117050051_seed_png_first_twelfth_jr_e6_e7_e8_shinkansen_bands_2611.sql';
function jrTwelfthSqlSeedBands(){
 const src=read(JR_TWELFTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==76)throw Error('JR twelfth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}
// Thirteenth JR batch: SQL audit reference only; retain original source guards.
const JR_THIRTEENTH_SQL_MIGRATION='supabase/migrations/20261117052143_seed_png_first_thirteenth_jr_hinabi_ofunato_n700_sanyo_2611.sql';
function jrThirteenthSqlSeedBands(){
 const src=read(JR_THIRTEENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==43)throw Error('JR thirteenth SQL number bands do not match applied migration');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'}));
}

// Metro second batch: only nonconflicting, already guarded November JS bounds.
// These reference-only intervals do not bypass date, model, ownership or format.
const METRO_SECOND_SQL_MIGRATION='supabase/migrations/20261117061000_seed_png_first_metro_unique_reference_bands_2611.sql';
function metroSecondSqlSeedBands(){
 const src=read(METRO_SECOND_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==6)throw Error('Metro six-band migration no longer matches audit');
 const fmt={Ginza:'metro-bare',Marunouchi:'metro-bare',MarunouchiBranch:'metro-bare',Chiyoda:'metro-prefixed',Namboku:'metro-prefixed',JobanLocal:'full'};
 return matches.map(m=>{
  if(!Object.prototype.hasOwnProperty.call(fmt,m[1]))throw Error('Unexpected metro line '+m[1]);
  return {line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
   to:String(m[4]).padStart(4,'0'),suffix:m[5],format:fmt[m[1]],
   png:m[6],status:'纯号段（地铁原有条件保留）'};
 });
}


// Metro next batch: original full-exact November S-owner rosters permit
// one 13000 PNG on Hibiya and one 18000 PNG on Hanzomon. Never generalize
// this numeric-only SQL audit to TobuSkytree, where distinct S-prefix train
// owners share overlapping numeric envelopes.
const METRO_13000_18000_SQL_MIGRATION='supabase/migrations/20261118003000_seed_metro_13000_hibiya_18000_hanzomon_png_bands_2611.sql';
function metro13000And18000SqlSeedBands(){
 const inventory=JSON.parse(read('data/audits/png-to-train-number-index-2611.json')).pngIndex;
 const expected=[
  {line:'Hibiya',from:502,to:2468,png:'images/列车/東京メトロ/東京メトロ_13000系.png',
   weekday:370,holiday:222},
  {line:'Hanzomon',from:551,to:2491,png:'images/列车/東京メトロ/東京メトロ_18000系.png',
   weekday:151,holiday:112}
 ];
 const src=read(METRO_13000_18000_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'S',NULL,'\.\.\/(images\/列车\/東京メトロ\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...src.matchAll(pattern)];
 if(rows.length!==2)throw Error('Metro 13000/18000 SQL reference count changed');
 return expected.map(x=>{
  const meta=inventory.find(item=>item.path===x.png);
  if(!meta||meta.quarantined)throw Error('Metro PNG missing or quarantined: '+x.png);
  const rosters=meta.runtimeNumberRosters.filter(r=>
   r.lineId===x.line&&r.numberFormat==='full_exact'&&
   r.validFrom==='2026-11-02'&&r.validTo==='2026-11-30'&&
   r.referenceOnly===true&&r.actualVehicleConfirmed===false);
  if(rosters.length!==2||
    rosters.find(r=>r.calendarType==='weekday')?.explicitDocumentedNumberCount!==x.weekday||
    rosters.find(r=>r.calendarType==='holiday')?.explicitDocumentedNumberCount!==x.holiday)
   throw Error('Metro original full service rosters changed: '+x.line);
  const bounds=rosters.flatMap(r=>r.exactContiguousBands.flatMap(b=>[b.from,b.to]))
   .map(str=>Number(str.match(/^[AB](\d+)S$/)?.[1]));
  if(bounds.some(n=>!Number.isFinite(n))||Math.min(...bounds)!==x.from||
     Math.max(...bounds)!==x.to)
   throw Error('Metro documented number bounds changed: '+x.line);
  const found=rows.filter(row=>row[1]===x.line&&row[5]===x.png);
  const from=String(x.from).padStart(4,'0'),to=String(x.to).padStart(4,'0');
  if(found.length!==1||found[0][2]!=='png_band/'+x.line+'/'+from+'-'+to+'S'||
     +found[0][3]!==x.from||+found[0][4]!==x.to)
   throw Error('Metro SQL/JS service roster bounds disagree: '+x.line);
  return {line:x.line,segment:found[0][2],from,to,suffix:'S',
   format:'metro-prefixed',png:x.png,
   status:'纯号段（既有完整番号名单及日期运营方守卫保留）'};
 });
}

// JR source number-envelope batch: preserve the original E233 00..71
// K/F/S last-two-digit family and Gotemba 315 listed 88 full M/G numbers.
// Both are reference-only; the runtime must still check all original
// operator, route, date, train type and actual-model/identity requirements.
const JR_E233_315_SQL_MIGRATION='supabase/migrations/20261118013000_seed_jr_saikyo_e233_gotemba_315_number_bands_2611.sql';
function jrE233Saikyo315GotembaSqlSeedBands(c){
 const rules=c.rules.filter(r=>r.origin==='frontend_js'&&
  ['images/列车/JR東日本/JR東日本_E233系_7000番台.png',
   'images/列车/JR東海/JR東海_315系.png'].includes(r.png));
 if(rules.length!==2)throw Error('JR E233/315 original source catalog changed');
 const e233=rules.find(r=>r.png.endsWith('/JR東日本_E233系_7000番台.png'));
 const g315=rules.find(r=>r.png.endsWith('/JR東海_315系.png'));
 if(!e233||!g315||
    e233.min!==0||e233.max!==71||e233.suffix!=='KFS'||
    e233.format!=='tail'||e233.valid_from!=='2026-11-01'||
    e233.valid_to!=='2026-11-30'||
    e233.line_ids.join('|')!=='SaikyoKawagoe|Rinkai'||
    e233.direction_number_parity!=='inbound-even'||
    e233.runtime_guards?.allowedModelLabels?.join()!=='E233系7000番台'||
    e233.runtime_guards?.trainTypesIfPresent?.length!==3||
    e233.source_railways_if_present?.length!==2||
    g315.min!==2226||g315.max!==5550||g315.suffix!=='MG'||
    g315.format!=='full'||g315.train_type!=='Local'||
    g315.line_ids.join()!=='Gotemba'||
    g315.valid_from!=='2026-11-01'||g315.valid_to!=='2026-11-30'||
    g315.operator!=='JR-Central'||
    g315.source_railways?.join()!=='odpt.Railway:JR-Central.Gotemba'||
    g315.published_numbers?.length!==88||
    g315.published_numbers?.some(n=>!/^\d{4}[MG]$/.test(n))||
    Math.min(...g315.published_numbers.map(n=>+n.slice(0,-1)))!==2226||
    Math.max(...g315.published_numbers.map(n=>+n.slice(0,-1)))!==5550)
  throw Error('JR E233/315 number provenance or original runtime guards changed');
 const expected=[
  {line:'SaikyoKawagoe',from:0,to:71,suffix:'KFS',format:'tail',png:e233.png},
  {line:'Rinkai',from:0,to:71,suffix:'KFS',format:'tail',png:e233.png},
  {line:'Gotemba',from:2226,to:5550,suffix:'MG',format:'full',png:g315.png}
 ];
 const sql=read(JR_E233_315_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(pattern)];
 if(found.length!==3)throw Error('JR E233/315 SQL number bands missing/altered');
 for(const item of expected){
  const from=String(item.from).padStart(4,'0');
  const to=String(item.to).padStart(4,'0');
  const segment='png_band/'+item.line+'/'+from+'-'+to+item.suffix;
  const row=found.find(m=>m[1]===item.line);
  if(!row||row[2]!==segment||+row[3]!==item.from||
      +row[4]!==item.to||row[5]!==item.suffix||row[6]!==item.png)
   throw Error('JR E233/315 SQL does not match source JS: '+segment);
 }
 return expected.filter(x=>x.line!=='Gotemba').map(x=>({line:x.line,from:String(x.from).padStart(4,'0'),
  to:String(x.to).padStart(4,'0'),suffix:x.suffix,format:x.format,png:x.png,
  status:'纯号段（JR原有号码条件保留；不代表编组）'}));
}

// JR twenty-second batch: only connected islands of the full published
// service-number list. Do not fill gaps or use unconfirmed review artwork.
const JR_HACHIKO_DE10_EXACT_SQL_MIGRATION='supabase/migrations/20261118014500_seed_jr_hachiko_e231_3000_de10_banetsu_exact_png_bands_2611.sql';
function jrHachikoE231AndDe10ExactSqlSeedBands(c){
 const expected=[];
 const specs=[
  {id:'js-0073',line:'Hachiko',png:'images/列车/JR東日本/JR東日本_E231系_3000番台.png',
   count:148,bandCount:90,format:'full',suffix:'E'},
  {id:'js-0033',line:'BanetsuWest',png:'images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png',
   count:2,bandCount:2,format:'bare',suffix:''}
 ];
 for(const spec of specs){
  const rule=c.rules.find(r=>r.id===spec.id);
  if(!rule||rule.origin!=='frontend_js'||rule.png!==spec.png||
    rule.line_ids.join()!==spec.line||rule.operator!=='JR-East'||
    rule.valid_from!=='2026-11-01'||rule.valid_to!=='2026-11-30'||
    rule.evidence_kind!=='exact-list'||rule.format!==spec.format||
    rule.suffix!==spec.suffix||rule.published_numbers?.length!==spec.count||
    rule.actual_vehicle_confirmed!==false||
    new Set(rule.published_numbers).size!==spec.count)
   throw Error('JR E231/DE10 original exact-number roster changed: '+spec.id);
  if(spec.id==='js-0073'&&
    (rule.train_type!=='Local'||rule.min!==461||rule.max!==4778||
     rule.runtime_guards?.requireExplicitModelEvidence!==true||
     rule.runtime_guards?.rejectAmbiguousPlan!==true||
     rule.runtime_guards?.allowedModelLabels?.join()!=='E231系3000番台'))
   throw Error('JR Hachiko model/line/roster conditions changed');
  if(spec.id==='js-0033'&&
    (rule.published_numbers.join()!=='9226,9233'||
     rule.operating_dates?.join()!=='2026-11-01,2026-11-08,2026-11-15'||
     rule.train_types?.join()!=='Rapid,SLRapid'||
     rule.runtime_guards?.allowedModelLabels?.join()!=='DE10形（DLばんえつ物語）'))
   throw Error('JR DE10 dated-train conditions changed');
  const parsed=rule.published_numbers.map(n=>{
    const m=/^(\d{2,5})([A-Z]?)$/.exec(n);
    if(!m||m[2]!==spec.suffix||+m[1]<rule.min||+m[1]>rule.max)
     throw Error('JR Hachiko / DL number is not from original roster: '+n);
    return +m[1];
  }).sort((a,b)=>a-b);
  const ranges=[];
  for(const n of parsed){
    const last=ranges[ranges.length-1];
    if(last&&last.to+1===n)last.to=n;
    else ranges.push({from:n,to:n});
  }
  if(ranges.length!==spec.bandCount||
     ranges.reduce((sum,r)=>sum+(r.to-r.from+1),0)!==spec.count)
   throw Error('JR exact-number islands were expanded beyond known services');
  for(const island of ranges){
    const a=String(island.from).padStart(4,'0');
    const b=String(island.to).padStart(4,'0');
    expected.push({line:spec.line,
      segment:'png_band/'+spec.line+'/'+a+'-'+b+spec.suffix,
      from:a,to:b,suffix:spec.suffix,format:spec.format,png:spec.png,
      status:'纯号段（JR明示番号；车型及资产仍待复核）'});
  }
 }
 const sql=read(JR_HACHIKO_DE10_EXACT_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(pattern)];
 if(found.length!==92||expected.length!==92)
  throw Error('JR Hachiko/DE10 exact-number SQL row count changed');
 for(let i=0;i<expected.length;i++){
   const row=found[i],item=expected[i];
   if(row[1]!==item.line||row[2]!==item.segment||
     +row[3]!==Number(item.from)||+row[4]!==Number(item.to)||
     row[5]!==item.suffix||row[6]!==item.png)
    throw Error('JR Hachiko/DE10 SQL differs from original-number islands: '+item.segment);
 }
 return expected;
}

// JR reference PNG batch: persist only the original *listed* 2611
// SL Banetsu C57 and Boso Local 209 service numbers. Wide JS min/max are
// deliberately not copied: their interior gaps are not evidenced and
// E257 LimitedExpress rules can have overlapping numeric envelopes.
const JR_BOSO_209_C57_SQL_MIGRATION='supabase/migrations/20261118010600_seed_jr_boso_209_banetsu_c57_exact_png_number_bands_2611.sql';
function jrBoso209BanetsuC57SqlSeedBands(c){
 const images=[
  'images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png',
  'images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'
 ];
 const planned=c.rules.filter(r=>r.origin==='frontend_js'&&images.includes(r.png));
 if(planned.length!==3)throw Error('JR Boso/SL original number rules missing');
 const expected=[];
 for(const rule of planned){
  if(rule.actual_vehicle_confirmed!==false||
     rule.valid_from!=='2026-11-01'||rule.valid_to!=='2026-11-30'||
     rule.operator!=='JR-East'||rule.evidence_kind!=='exact-list'||
     rule.line_ids.length!==1||!Array.isArray(rule.published_numbers))
   throw Error('JR Boso/SL documented source guards changed');
  if(rule.png===images[0]){
   if(rule.line_ids[0]!=='BanetsuWest'||rule.published_numbers.length!==2||
      rule.format!=='bare'||!rule.train_types?.includes('SLRapid')||
      rule.operating_dates?.length!==4)
    throw Error('SL dated C57 source list changed');
  } else if(!['Uchibo','Sotobo'].includes(rule.line_ids[0])||
      rule.train_type!=='Local'||rule.published_numbers.length!==12||
      rule.format!=='full'||rule.runtime_guards?.rejectAmbiguousPlan!==true)
    throw Error('Boso 209 local source list changed');
  for(const number of rule.published_numbers){
   const m=/^(\d{2,5})([A-Z]?)$/.exec(String(number));
   if(!m||Number(m[1])<rule.min||Number(m[1])>rule.max||
      !(rule.suffix===''?m[2]==='':rule.suffix===m[2]))
    throw Error('JR Boso/SL source service number invalid: '+number);
   expected.push({line:rule.line_ids[0],number:+m[1],suffix:m[2],
     png:rule.png,format:rule.format,
     status:'纯号段（JR既有确切车次／日期车型守卫保留）'});
  }
 }
 expected.sort((a,b)=>a.line.localeCompare(b.line)||a.number-b.number);
 if(expected.length!==26||new Set(expected.map(x=>x.line+'|'+x.number+'|'+x.suffix)).size!==26)
  throw Error('JR Boso/SL service roster count changed');
 const sql=read(JR_BOSO_209_C57_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const actual=[...sql.matchAll(pattern)];
 if(actual.length!==26)throw Error('JR Boso/SL SQL exact-number count changed');
 return expected.map((x,i)=>{
  const row=actual[i],pad=String(x.number).padStart(4,'0');
  const segment='png_band/'+x.line+'/'+pad+'-'+pad+x.suffix;
  if(row[1]!==x.line||row[2]!==segment||+row[3]!==x.number||
     +row[4]!==x.number||row[5]!==x.suffix||row[6]!==x.png)
   throw Error('JR Boso/SL SQL and original published list disagree: '+segment);
  return {line:x.line,segment,from:pad,to:pad,suffix:x.suffix,
   format:x.format,png:x.png,status:x.status};
 });
}

// JR seventeenth batch: only existing JR East official 2611 named train
// reference numbers for 253-series Nikko/Kinugawa. A source number band
// NEVER establishes calendar, operating date or physical trainset.
const JR_SEVENTEENTH_SQL_MIGRATION='supabase/migrations/20261117071000_seed_jr_253_nikko_kinugawa_png_bands_2611.sql';
function jrSeventeenthSqlSeedBands(){
 const src=read(JR_SEVENTEENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==10)throw Error('JR seventeenth SQL band migration mismatch');
 const allowed=new Set(['UtsunomiyaJR','TobuNikko','Nikkoku']);
 return matches.map(m=>{
  if(!allowed.has(m[1])||m[5]!=='M'||!m[6].endsWith('JR東日本_253系_1000番台.png'))
   throw Error('Unexpected JR 253 PNG number-band scope');
  return {line:m[1],segment:m[2],
   from:String(m[3]).padStart(4,'0'),to:String(m[4]).padStart(4,'0'),
   suffix:m[5],format:'full',png:m[6],
   status:'纯号段（JR专用原始条件保留）'};
 });
}


// JR eighteenth batch: Hakodate Liner numbered 733-1000 reference only.
// The source number bands do not waive current train/date/service checks.
const JR_EIGHTEENTH_SQL_MIGRATION='supabase/migrations/20261117073000_seed_jr_hokkaido_733_hakodate_liner_png_bands_2611.sql';
function jrEighteenthSqlSeedBands(){
 const src=read(JR_EIGHTEENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==2)throw Error('JR Hokkaido Hakodate Liner SQL bands mismatch');
 return matches.map(m=>{
  if(m[1]!=='HakodateMain'||m[5]!=='M'||!m[6].endsWith('JR北海道_733系_1000代_はこだてライナー.png'))
   throw Error('Unexpected Hakodate Liner PNG number-band context');
  return {line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
   to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',
   png:m[6],status:'纯号段（JR专用原始条件保留）'};
 });
}


// JR West Yakumo: published 1001M..1030M reference-only numbers.
// The 273-series artwork remains review-only, NOT runtime selectable.
const JR_NINETEENTH_SQL_MIGRATION='supabase/migrations/20261117081500_seed_jr_west_273_yakumo_review_reference_bands_2611.sql';
function jrNineteenthSqlSeedBands(){
 const src=read(JR_NINETEENTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==2)throw Error('JR Yakumo review-only SQL number-band count changed');
 const allowed=new Set(['SanyoMain','SaninMain']);
 return matches.map(m=>{
  if(!allowed.has(m[1])||m[3]!=='1001'||m[4]!=='1030'||
    m[5]!=='M'||m[6]!=='images/列车/JR西日本/JR西日本_273系.png')
   throw Error('Yakumo review-only number-band source changed unexpectedly');
  return {line:m[1],segment:m[2],
   from:'1001',to:'1030',suffix:'M',format:'full',png:m[6],
   status:'纯号段（JR官方番号；资产review不可选图）'};
 });
}


// Third-sector ToyoRapid 2000 Tozai: mirrors one JS guarded number family.
// Metro-prefixed interpretation and source/date/model checks stay with JS.
const THIRD_FIRST_SQL_MIGRATION='supabase/migrations/20261117084000_seed_png_first_third_toyorapid_2000_tozai_2611.sql';
function thirdFirstSqlSeedBands(){
 const src=read(THIRD_FIRST_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==1)throw Error('ToyoRapid band SQL migration mismatches audit');
 return matches.map(m=>{
  if(m[1]!=='Tozai'||m[3]!=='400'||m[4]!=='2599'||m[5]!=='T'||
    m[6]!=='images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png')
   throw Error('ToyoRapid 2000 number-band scope unexpectedly changed');
  return {line:m[1],segment:m[2],from:'0400',to:'2599',suffix:'T',
   format:'metro-prefixed',png:m[6],status:'纯号段（第三部门铁道原有条件保留）'};
 });
}


// Third-sector second batch: SaitamaRapid 2000 operator-identity 80M..98M.
// 'tail' is essential: A1082M/A680M match 82M/80M, never numeric full.
const THIRD_SECOND_SQL_MIGRATION='supabase/migrations/20261117093000_seed_png_first_saitama_2000_operator_M_tail_2611.sql';
function thirdSecondSqlSeedBands(){
 const src=read(THIRD_SECOND_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==2)throw Error('SaitamaRapid 2000 SQL reference band mismatch');
 const allowed=new Set(['Namboku','SaitamaRapid']);
 return matches.map(m=>{
  if(!allowed.has(m[1])||m[3]!=='80'||m[4]!=='98'||
     m[5]!=='M'||m[6]!=='images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png')
   throw Error('Unexpected SaitamaRapid M-tail source');
  return {line:m[1],segment:m[2],from:'0080',to:'0098',suffix:'M',
    format:'tail',png:m[6],status:'纯号段（第三部门M后两位；来源条件保留）'};
 });
}


// Private first number-batch: two already guarded JS ranges for Odakyu and
// Sotetsu. The pure SQL rows are references ONLY and never skip JS guards.
const PRIVATE_FIRST_SQL_MIGRATION='supabase/migrations/20261117131000_seed_private_odakyu_4000_sotetsu_12000_source_bands_2611.sql';
function privateFirstSqlSeedBands(){
 const src=read(PRIVATE_FIRST_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==2)throw Error('Private first SQL source-band migration mismatch');
 const expected=new Map([
  ['JobanLocal',{from:'0400',to:'2599',min:400,max:2599,suffix:'E',
    format:'full',png:'images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png'}],
  ['SaikyoKawagoe',{from:'0072',to:'0079',min:72,max:79,suffix:'KFS',
    format:'tail',png:'images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png'}]
 ]);
 return matches.map(m=>{
  const e=expected.get(m[1]);
  if(!e||+m[3]!==e.min||+m[4]!==e.max||m[5]!==e.suffix||m[6]!==e.png)
   throw Error('Unexpected private source-number band');
  return {line:m[1],segment:m[2],from:e.from,to:e.to,suffix:e.suffix,
   format:e.format,png:e.png,status:'纯号段（私铁原有JS条件保留）'};
 });
}


// Tobu third private batch: original Koizumi (historical-undated)
// and TH LINER date-scoped illustrations. Reference-only; JS/source guards
// remain authoritative. TH overlap on the SAME PNG compacts to one band.
const PRIVATE_SECOND_SQL_MIGRATION='supabase/migrations/20261117143000_seed_private_tobu_koizumi_thliner_png_bands_2611.sql';
function privateSecondSqlSeedBands(){
 const src=read(PRIVATE_SECOND_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==3)throw Error('Tobu Koizumi/TH source-band SQL count mismatch');
 const expected=new Map([
  ['png_band/Koizumi/0701-0764E',{line:'Koizumi',from:701,to:764,
   suffix:'E',format:'full',png:'images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png',
   status:'纯号段（东武小泉线历史参考；日期车型条件保留）'}],
  ['png_band/TobuSkytree/4041-4945T',{line:'TobuSkytree',from:4041,to:4945,
   suffix:'T',format:'metro-prefixed',png:'images/列车/東武鉄道/東武鉄道_70090型.png',
   status:'纯号段（东武TH LINER；服务类型条件保留）'}],
  ['png_band/TobuSkytree/4045-4947T',{line:'TobuSkytree',from:4045,to:4947,
   suffix:'T',format:'metro-prefixed',png:'images/列车/東武鉄道/東武鉄道_70090型.png',
   status:'纯号段（东武TH LINER；服务类型条件保留）'}]
 ]);
 return matches.map(m=>{
  const e=expected.get(m[2]);
  if(!e||m[1]!==e.line||+m[3]!==e.from||+m[4]!==e.to||
     m[5]!==e.suffix||m[6]!==e.png)
   throw Error('Tobu source number-band reference changed unexpectedly');
  return {line:e.line,segment:m[2],from:String(e.from).padStart(4,'0'),
   to:String(e.to).padStart(4,'0'),suffix:e.suffix,format:e.format,
   png:e.png,status:e.status};
 });
}


// Private fourth batch: Tokyu 2020 original exact 2026-11 frontend rosters.
// The SQL/CSV stores only a reference envelope; runtime remains exact and
// source/route/date/model guarded. K stock suffix alone is NOT proof of 2020.
const PRIVATE_THIRD_SQL_MIGRATION='supabase/migrations/20261117154000_seed_private_tokyu_2020_oshigage_K_bands_2611.sql';
function privateThirdSqlSeedBands(){
 const src=read(PRIVATE_THIRD_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==2)throw Error('Tokyu 2020 source-band SQL count changed');
 const png='images/列车/東急電鉄/東急電鉄_2020系.png';
 const entry=JSON.parse(read('data/audits/png-to-train-number-index-2611.json')).pngIndex.find(x=>x.path===png);
 if(!entry||entry.runtimeNumberRosters.length!==4)throw Error('Tokyu exact roster source changed');
 const expected=new Map([
   ['Hanzomon',{min:501,max:2333,count:478,segment:'png_band/Hanzomon/0501-2333K'}],
   ['TobuSkytree',{min:503,max:4934,count:182,segment:'png_band/TobuSkytree/0503-4934K'}]
 ]);
 return matches.map(m=>{
   const e=expected.get(m[1]);
   if(!e||m[2]!==e.segment||+m[3]!==e.min||+m[4]!==e.max||m[5]!=='K'||m[6]!==png)
     throw Error('Tokyu 2020 K reference SQL boundaries changed');
   const sources=entry.runtimeNumberRosters.filter(x=>x.lineId===m[1]&&
     x.validFrom==='2026-11-02'&&x.validTo==='2026-11-30'&&
     x.referenceOnly===true&&x.actualVehicleConfirmed===false);
   const ends=sources.flatMap(x=>x.exactContiguousBands.flatMap(y=>[y.from,y.to]));
   const nums=ends.map(x=>Number(x.match(/^[A-Z](\d+)K$/)?.[1]));
   if(sources.length!==2||sources.reduce((n,x)=>n+x.explicitDocumentedNumberCount,0)!==e.count||
     nums.some(n=>!Number.isFinite(n))||Math.min(...nums)!==e.min||Math.max(...nums)!==e.max)
       throw Error('Tokyu 2020 documented November number roster changed');
   return {line:m[1],segment:m[2],from:String(e.min).padStart(4,'0'),
     to:String(e.max).padStart(4,'0'),suffix:'K',
     format:'metro-prefixed',png,
     status:'纯号段（东急2020原有精确名单与日期车型守卫保留）'};
 });
}


// Private fifth batch: Tobu 50050 on Hanzomon with numbered 2611
// weekday/holiday helper sources; source exact roster is authoritative.
const PRIVATE_FOURTH_SQL_MIGRATION='supabase/migrations/20261117164500_seed_private_tobu_50050_hanzomon_T_2611.sql';
function privateFourthSqlSeedBands(){
 const src=read(PRIVATE_FOURTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...src.matchAll(pattern)];
 if(matches.length!==1)throw Error('Tobu 50050 original envelope SQL count changed');
 const m=matches[0],png='images/列车/東武鉄道/東武鉄道_50050型.png';
 if(m[1]!=='Hanzomon'||m[2]!=='png_band/Hanzomon/0452-2282T'||
    +m[3]!==452||+m[4]!==2282||m[5]!=='T'||m[6]!==png)
  throw Error('Tobu 50050 Hanzomon SQL source changed');
 const entry=JSON.parse(read('data/audits/png-to-train-number-index-2611.json')).pngIndex.find(x=>x.path===png);
 if(!entry)throw Error('Tobu 50050 original PNG source index missing');
 const rosters=entry.runtimeNumberRosters.filter(x=>x.lineId==='Hanzomon'&&
  x.validFrom==='2026-11-02'&&x.validTo==='2026-11-30'&&
  x.numberFormat==='full_exact'&&x.referenceOnly===true&&x.actualVehicleConfirmed===false);
 const ends=rosters.flatMap(x=>x.exactContiguousBands.flatMap(y=>[y.from,y.to]));
 const nums=ends.map(s=>Number(s.match(/^[A-Z](\d+)T$/)?.[1]));
 if(rosters.length!==2||rosters.reduce((n,x)=>n+x.explicitDocumentedNumberCount,0)!==253||
    nums.some(n=>!Number.isFinite(n))||Math.min(...nums)!==452||Math.max(...nums)!==2282)
  throw Error('Tobu 50050 exact November source numbers changed');
 return [{line:'Hanzomon',segment:m[2],from:'0452',to:'2282',
  suffix:'T',format:'metro-prefixed',png,
  status:'纯号段（东武50050原精确车次和日期车型守卫保留）'}];
}

// Private sixth number batch: reuse the already-active 2026-11 Tobu Nikko
// express train-number rosters for three distinct gallery PNGs. This adds
// audit/reference ranges, not an alternate runtime selector or livery proof.
const PRIVATE_NIKKO_SQL_MIGRATION='supabase/migrations/20261117200000_seed_private_tobu_nikko_express_png_bands_2611.sql';
function privateNikkoSqlSeedBands(){
 const rosterSource=read('data/timetables/train-number-png-ranges.js');
 const match=rosterSource.match(/tobuSkytreeNumbers=(\{[^;]+\});/);
 if(!match)throw Error('Tobu Nikko 2611 family roster missing');
 const rosters=JSON.parse(match[1]);
 const groups=[
  ['spacia_x','images/列车/東武鉄道/東武鉄道_N100系_SPACIA_X.png'],
  ['spacia','images/列车/東武鉄道/東武鉄道_100系_原色.png'],
  ['revaty','images/列车/東武鉄道/東武鉄道_500系_リバティ.png']
 ];
 const expected=[],seen=new Map();
 for(const [family,png] of groups){
  const source=[...(rosters.weekday[family]||[]),...(rosters.holiday[family]||[])];
  const nums=[...new Set(source)].map(Number).sort((a,b)=>a-b);
  for(const n of nums){
   if(seen.has(n)&&seen.get(n)!==png)
    throw Error('Tobu Nikko different-PNG number conflict: '+n);
   seen.set(n,png);
   const prior=expected[expected.length-1];
   if(prior&&prior.png===png&&prior.end+1===n)prior.end=n;
   else expected.push({png,start:n,end:n});
  }
 }
 const migration=read(PRIVATE_NIKKO_SQL_MIGRATION);
 const pattern=/^  \('2611','TobuNikko','(png_band\/TobuNikko\/\d{4}-\d{4})',(\d+),(\d+),'',NULL,'\.\.\/(images\/列车\/東武鉄道\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...migration.matchAll(pattern)];
 if(rows.length!==expected.length||rows.length!==62)
  throw Error('Tobu Nikko PNG band SQL record count changed');
 return expected.map((v,i)=>{
  const row=rows[i];
  const start=String(v.start).padStart(4,'0');
  const end=String(v.end).padStart(4,'0');
  if(row[1]!==`png_band/TobuNikko/${start}-${end}`||
     +row[2]!==v.start||+row[3]!==v.end||row[4]!==v.png)
   throw Error('Tobu Nikko SQL and existing number roster disagree at '+start);
  return {line:'TobuNikko',segment:row[1],from:start,to:end,
   suffix:'',format:'full',png:v.png,
   status:'纯号段（东武日光既有时刻表号码守卫保留；PNG仅供复核）'};
 });
}

// Private eighth batch: exact 2026-11 Tobu Skytree Asakusa / Ryomo
// source rosters. All SQL references stay audit-only; the existing date,
// calendar, operator, type and actual-vehicle checks retain full authority.
const PRIVATE_SKYTREE_SQL_MIGRATION='supabase/migrations/20261117211500_seed_private_tobu_skytree_asakusa_ryomo_png_bands_2611.sql';
function privateSkytreeSqlSeedBands(){
 const source=read('data/timetables/train-number-png-ranges.js');
 const a=source.match(/tobuSkytreeOrdinaryCorridors=(\{[^;]+\});/);
 const b=source.match(/tobuSkytreeNumbers=(\{[^;]+\});/);
 if(!a||!b)throw Error('Original Tobu Skytree rosters missing');
 const corridor=JSON.parse(a[1]),families=JSON.parse(b[1]);
 const groups=[
  {id:'asakusa',png:'images/列车/東武鉄道/東武鉄道_10030型_未更新車.png',
   weekday:corridor.weekday.asakusa,holiday:corridor.holiday.asakusa},
  {id:'ryomo',png:'images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png',
   weekday:families.weekday.ryomo,holiday:families.holiday.ryomo}
 ];
 const expected=[],seen=new Map();
 for(const group of groups){
  const nums=[...new Set([...group.weekday,...group.holiday])].map(Number).sort((x,y)=>x-y);
  if((group.id==='asakusa'&&
      (group.weekday.length!==223||group.holiday.length!==222||nums.length!==241))||
     (group.id==='ryomo'&&
      (group.weekday.length!==26||group.holiday.length!==26||nums.length!==26)))
   throw Error('Original Tobu Skytree source number count changed: '+group.id);
  for(const n of nums){
   const raw=String(n);
   if(!Number.isSafeInteger(n)||n<0||n>9999)
    throw Error('Unsupported Tobu Skytree source number: '+raw);
   if(seen.has(n)&&seen.get(n)!==group.png)
    throw Error('Tobu Skytree number mapped to two PNGs: '+raw);
   seen.set(n,group.png);
   const prev=expected[expected.length-1];
   if(prev&&prev.png===group.png&&prev.end+1===n)prev.end=n;
   else expected.push({png:group.png,start:n,end:n});
  }
 }
 // Other named express families must never inherit this new source band.
 for(const cal of ['weekday','holiday'])for(const [family,nums] of Object.entries(families[cal])){
  if(family==='ordinary'||family==='ryomo')continue;
  for(const raw of nums){
   if(/^\d+$/.test(raw)&&seen.has(+raw))
    throw Error('Conflicting Tobu Skytree number across source families: '+raw);
  }
 }
 const sql=read(PRIVATE_SKYTREE_SQL_MIGRATION);
 const pattern=/^  \('2611','TobuSkytree','(png_band\/TobuSkytree\/\d{4}-\d{4})',(\d+),(\d+),'',NULL,'\.\.\/(images\/列车\/東武鉄道\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...sql.matchAll(pattern)];
 if(rows.length!==61||rows.length!==expected.length)
  throw Error('Tobu Skytree original-roster SQL band count changed');
 return expected.map((item,i)=>{
  const row=rows[i],from=String(item.start).padStart(4,'0');
  const to=String(item.end).padStart(4,'0');
  if(row[1]!=='png_band/TobuSkytree/'+from+'-'+to||
     +row[2]!==item.start||+row[3]!==item.end||row[4]!==item.png)
   throw Error('SQL mismatch with Tobu Skytree source at '+from);
  return {line:'TobuSkytree',segment:row[1],from,to,suffix:'',
   format:'full',png:item.png,
   status:'纯号段（东武晴空塔既有车次／浅草区段守卫保留；PNG仅供复核）'};
 });
}

// Private ninth batch: 20400 and 70000 number PNGs use the existing Tobu
// Utsunomiya and Skytree source rosters, never an independent mapping source.
const PRIVATE_NINTH_SQL_MIGRATION='supabase/migrations/20261117224000_seed_private_tobu_utsunomiya_20400_skytree_70000_2611.sql';
function privateNinthSqlSeedBands(){
 const image20400='images/列车/東武鉄道/東武鉄道_20400型.png';
 const image70000='images/列车/東武鉄道/東武鉄道_70000系.png';
 const context={window:{}};
 vm.runInNewContext(read('data/timetables/tobu-utsunomiya-2611-number-png.js'),
  context,{filename:'tobu-utsunomiya-2611-number-png.js',timeout:15000});
 const u=context.window.TobuUtsunomiya2611Png;
 if(!u||!Array.isArray(u.ranges)||u.ranges.length!==2||
    u.numbersPerCalendar!==86||u.sourceTemplates!==172)
  throw Error('Tobu Utsunomiya source number bands changed');
 const numbered=new Set();
 for(const band of u.ranges){
  if(band.step!==2||!String(band.pngPath).endsWith('/東武鉄道_20400型.png'))
   throw Error('Tobu Utsunomiya source scope changed');
  for(let n=band.min;n<=band.max;n+=band.step)
   numbered.add(n);
 }
 if(numbered.size!==86||Math.min(...numbered)!==401||
    Math.max(...numbered)!==486)
  throw Error('Tobu Utsunomiya sourced bounds changed');
 for(let n=401;n<=486;n++)if(!numbered.has(n))
  throw Error('Tobu Utsunomiya source has an undocumented number gap');
 const expected=[{line:'TobuUtsunomiya',start:401,end:486,
   suffix:'N',png:image20400,format:'full',
   status:'纯号段（东武宇都宫原奇偶方向与历史时刻表限制保留）'}];
 const source=read('data/timetables/train-number-png-ranges.js');
 const match=source.match(/tobuSkytreeOrdinaryCorridors=(\{[^;]+\});/);
 const familyMatch=source.match(/tobuSkytreeNumbers=(\{[^;]+\});/);
 if(!match||!familyMatch)throw Error('Tobu Skytree original source missing');
 const corridor=JSON.parse(match[1]),families=JSON.parse(familyMatch[1]);
 const byNumeric=new Map();
 for(const cal of ['weekday','holiday']){
  const hibiya=corridor[cal].hibiya;
  const ordinary=new Set(families[cal].ordinary);
  for(const number of hibiya){
   const m=/^[AB](\d{3,4})T$/.exec(number);
   if(!m)continue;
   const operation=Number(number.slice(-3,-1));
   if(operation>=41&&operation<=49)continue;
   if(!ordinary.has(number))
    throw Error('Tobu 70000 number outside original ordinary roster: '+number);
   const numeric=+m[1],was=byNumeric.get(numeric)||new Set();
   was.add(number);byNumeric.set(numeric,was);
  }
 }
 const nums=[...byNumeric.keys()].sort((a,b)=>a-b);
 if(nums.length!==186||nums[0]!==405||nums[nums.length-1]!==2331)
  throw Error('Tobu Skytree 70000 exact original number list changed');
 for(const n of nums){
  expected.push({line:'TobuSkytree',start:n,end:n,suffix:'T',
   png:image70000,format:'metro-prefixed',
   status:'纯号段（东武70000原日比谷直通运营号和车型条件保留）'});
 }
 const sql=read(PRIVATE_NINTH_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/東武鉄道\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(pattern)];
 if(found.length!==187||found.length!==expected.length)
  throw Error('Tobu ninth source-only SQL row count changed');
 return expected.map((value,i)=>{
  const item=found[i],from=String(value.start).padStart(4,'0');
  const to=String(value.end).padStart(4,'0');
  const segment='png_band/'+value.line+'/'+from+'-'+to+value.suffix;
  if(item[1]!==value.line||item[2]!==segment||
    +item[3]!==value.start||+item[4]!==value.end||
    item[5]!==value.suffix||item[6]!==value.png)
   throw Error('Tobu ninth source/SQL mismatch: '+segment);
  return {line:value.line,segment,from,to,suffix:value.suffix,
   format:value.format,png:value.png,status:value.status};
 });
}


// JR twenty-third batch: number islands of the *existing* November
// E353 LimitedExpress roster only. No holes, no runtime authority.
const JR_CHUO_E353_SQL_MIGRATION='supabase/migrations/20261118015000_seed_jr_chuo_e353_limited_express_reference_bands_2611.sql';
function jrChuoE353SqlSeedBands(c){
 const ids=['js-0105','js-0106','js-0107','js-0108'];
 const png='images/列车/JR東日本/JR東日本_E353系.png';
 const rules=ids.map(id=>c.rules.find(r=>r.id===id));
 if(rules.some((r,i)=>!r||r.id!==ids[i]||r.origin!=='frontend_js'||
    r.png!==png||r.line_ids.join()!=='ChuoRapid,ChuoMain'||
    r.suffix!=='M'||r.format!=='full'||r.train_type!=='LimitedExpress'||
    r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
    r.actual_vehicle_confirmed!==false||
    !Array.isArray(r.weekday_numbers)||!Array.isArray(r.holiday_numbers)))
  throw Error('E353 original LimitedExpress roster and guards changed');
 const ordinary=c.rules.find(r=>r.id==='js-0060');
 if(!ordinary||ordinary.png!=='images/列车/JR東日本/JR東日本_E233系_0番台.png'||
    ordinary.runtime_guards?.excludeTrainType!=='LimitedExpress')
  throw Error('E233 ordinary-train exclusion no longer protects E353 references');
 const names=[...new Set(rules.flatMap(r=>
   r.weekday_numbers.concat(r.holiday_numbers)))];
 if(names.length!==59||names.some(n=>!/^\d{1,4}M$/.test(n)))
  throw Error('E353 original published-number list changed');
 const values=names.map(n=>Number(n.slice(0,-1))).sort((a,b)=>a-b);
 const islands=[];
 for(const n of values){
  const prior=islands[islands.length-1];
  if(prior&&prior.to===n-1)prior.to=n;
  else islands.push({from:n,to:n});
 }
 if(islands.length!==47||islands.reduce((n,r)=>n+r.to-r.from+1,0)!==59)
  throw Error('E353 no-gap intervals are inconsistent');
 const expected=['ChuoMain','ChuoRapid'].flatMap(line=>islands.map(r=>{
  const from=String(r.from).padStart(4,'0');
  const to=String(r.to).padStart(4,'0');
  return {line,segment:'png_band/'+line+'/'+from+'-'+to+'M',
   from,to,suffix:'M',format:'full',png,
   status:'纯号段（JR特急原车次及车型条件保留）'};
 }));
 const source=read(JR_CHUO_E353_SQL_MIGRATION);
 const rx=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'M',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const saved=[...source.matchAll(rx)];
 if(saved.length!==94||expected.length!==94)
  throw Error('E353 SQL entry count changed');
 expected.forEach((x,i)=>{
  const row=saved[i];
  if(row[1]!==x.line||row[2]!==x.segment||
     +row[3]!==+x.from||+row[4]!==+x.to||row[5]!==x.png)
   throw Error('E353 SQL interval does not match source list: '+x.segment);
 });
 return expected;
}


// JR twenty-fourth batch: Chuo E233 0 subseries and Fujikyu E233
// original Nov 2026 full published service numbers only. Never broaden
// to ChuoMain M regular numbers overlapping the E353 2152/2166 M band.
const JR_CHUO_E233_FUJIKYU_SQL_MIGRATION='supabase/migrations/20261118020500_seed_jr_chuo_e233_th_and_fujikyu_m_png_bands_2611.sql';
function jrChuoE233ThFujikyuSqlSeedBands(c){
 const png='images/列车/JR東日本/JR東日本_E233系_0番台.png';
 const f=c.rules.find(r=>r.id==='js-0004');
 const chuo=c.rules.find(r=>r.id==='js-0062');
 if(!f||!chuo||f.png!==png||chuo.png!==png||
    f.origin!=='frontend_js'||chuo.origin!=='frontend_js'||
    f.line_ids.join()!=='Fujikyu'||chuo.line_ids.join()!=='ChuoMain'||
    f.suffix!=='M'||chuo.suffix!=='TH'||f.format!=='full'||chuo.format!=='full'||
    f.train_type!=='Local'||f.published_numbers?.join()!=='1455M,1456M'||
    chuo.operator!=='JR-East'||
    chuo.train_types?.join()!=='Rapid,ChuoSpecialRapid,CommuterRapid'||
    chuo.runtime_guards?.allowedModelLabels?.join()!=='E233系0番台'||
    chuo.weekday_numbers?.length!==39||chuo.holiday_numbers?.length!==40||
    [f,chuo].some(r=>r.valid_from!=='2026-11-01'||
       r.valid_to!=='2026-11-30'||r.actual_vehicle_confirmed!==false))
  throw Error('JR E233 Chuo/Fujikyu original source guards changed');
 const full=[...new Set(chuo.weekday_numbers.concat(chuo.holiday_numbers))];
 if(full.length!==71||full.some(n=>!/^\d{3,4}[TH]$/.test(n)))
  throw Error('JR E233 Chuo explicit T/H source count changed');
 function bands(list,suffix){
  const numbers=[...new Set(list.map(n=>+n.slice(0,-1)))].sort((a,b)=>a-b);
  const result=[];
  for(const n of numbers){
   const last=result[result.length-1];
   if(last&&last.end+1===n)last.end=n;
   else result.push({start:n,end:n,suffix});
  }
  return result;
 }
 const segments=['T','H'].flatMap(s=>bands(full.filter(n=>n.endsWith(s)),s)
   .map(b=>({...b,line:'ChuoMain'})));
 if(segments.length!==70||
   segments.reduce((n,b)=>n+b.end-b.start+1,0)!==71)
  throw Error('JR E233 Chuo referenced bands contain missing services');
 segments.push({line:'Fujikyu',start:1455,end:1456,suffix:'M'});
 const expected=segments.map(b=>{
  const from=String(b.start).padStart(4,'0');
  const to=String(b.end).padStart(4,'0');
  return {line:b.line,segment:'png_band/'+b.line+'/'+from+'-'+to+b.suffix,
   from,to,suffix:b.suffix,format:'full',png,
   status:'纯号段（JR原始车型和日历条件保留）'};
 });
 const sql=read(JR_CHUO_E233_FUJIKYU_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(pattern)];
 if(found.length!==71||expected.length!==71)
  throw Error('JR E233 Chuo source migration row count drift');
 for(let i=0;i<71;i++){
  const row=found[i],item=expected[i];
  if(row[1]!==item.line||row[2]!==item.segment||
    +row[3]!==+item.from||+row[4]!==+item.to||
    row[5]!==item.suffix||row[6]!==item.png)
   throw Error('JR E233 source/SQL interval mismatch: '+item.segment);
 }
 return expected;
}


// JR batch 25: two original JR East 211 theme PNGs with guarded Nov 2026
// published train numbers. No gap-fill, no actual vehicle confirmation.
const JR_211_SHONAN_NAGANO_SQL_MIGRATION=
 'supabase/migrations/20261118023000_seed_jr_211_shonan_nagano_png_number_bands_2611.sql';
function jr211ShonanNaganoSqlSeedBands(c){
 const specs=[
  {id:'js-0043',line:'Takasaki',count:163,islands:13,
    png:'images/列车/JR東日本/JR東日本_211系_湘南色.png'},
  {id:'js-0044',line:'Agatsuma',count:28,islands:1,
    png:'images/列车/JR東日本/JR東日本_211系_湘南色.png'},
  {id:'js-0065',line:'ChuoMain',count:47,islands:2,
    png:'images/列车/JR東日本/JR東日本_211系_長野色.png'}
 ];
 const expected=[];
 for(const spec of specs){
  const r=c.rules.find(x=>x.id===spec.id);
  if(!r||r.origin!=='frontend_js'||r.png!==spec.png||
     r.line_ids.join()!==spec.line||r.suffix!=='M'||r.format!=='full'||
     r.train_type!=='Local'||r.operator!=='JR-East'||
     r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
     r.actual_vehicle_confirmed!==false||
     !r.runtime_guards?.rejectAmbiguousPlan||
     !r.runtime_guards?.sourceOperatorFallback||
     r.runtime_guards?.requireCandidateOverlap!==(spec.id==='js-0044'?true:undefined)||
     !r.runtime_guards?.allowedModelLabels?.length)
   throw Error('JR 211 original train-number guards changed: '+spec.id);
  const all=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
  if(all.length!==spec.count||all.some(n=>!/^\d+M$/.test(n)))
   throw Error('JR 211 original published roster changed: '+spec.id);
  const numbers=all.map(n=>+n.slice(0,-1)).sort((a,b)=>a-b);
  const islands=[];
  for(const n of numbers){
   const last=islands[islands.length-1];
   if(last&&last.end+1===n)last.end=n;
   else islands.push({start:n,end:n});
  }
  if(islands.length!==spec.islands||
     islands.reduce((n,b)=>n+b.end-b.start+1,0)!==spec.count)
   throw Error('JR 211 gap-free island count drift: '+spec.id);
  for(const band of islands){
   const from=String(band.start).padStart(4,'0');
   const to=String(band.end).padStart(4,'0');
   expected.push({png:spec.png,line:spec.line,
    segment:'png_band/'+spec.line+'/'+from+'-'+to+'M',
    from,to,suffix:'M',format:'full',
    status:'纯号段（JR原始车型及候选条件保留）'});
  }
 }
 const sql=read(JR_211_SHONAN_NAGANO_SQL_MIGRATION);
 const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'M',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...sql.matchAll(pattern)];
 if(rows.length!==16||expected.length!==16)
  throw Error('JR 211 source migration row count drift');
 for(let i=0;i<16;i++){
  const row=rows[i],item=expected[i];
  if(row[1]!==item.line||row[2]!==item.segment||
     +row[3]!==+item.from||+row[4]!==+item.to||
     row[5]!==item.png)
   throw Error('JR 211 SQL does not match original train number: '+item.segment);
 }
 return expected;
}


// JR batch 26: BanetsuWest original JS train numbers only, with no gaps
// invented and no assertion of actual vehicle identity or confirmed livery.
const JR_BANETSU_WEST_SQL_MIGRATION=
 'supabase/migrations/20261118024500_seed_jr_banetsu_west_reference_number_bands_2611.sql';
function jrBanetsuWestSqlSeedBands(c){
 const specs=[
  {id:'js-0025',count:22,bands:2,type:'Local',suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E721系_仙台地区.png'},
  {id:'js-0026',count:14,bands:1,type:'Rapid',suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E721系_仙台地区.png'},
  {id:'js-0027',count:39,bands:16,type:'Local',suffix:'D',
   png:'images/列车/JR東日本/JR東日本_GV-E400系.png'},
  {id:'js-0030',count:18,bands:11,type:'Local',suffix:'D',
   png:'images/列车/JR東日本/JR東日本_キハ110系.png'},
  {id:'js-0031',count:2,bands:1,type:'LimitedExpress',suffix:'D',
   png:'images/列车/JR東日本/JR東日本_キハ110系.png'}
 ];
 const expected=[];
 for(const spec of specs){
  const r=c.rules.find(x=>x.id===spec.id);
  if(!r||r.origin!=='frontend_js'||r.png!==spec.png||
     r.line_ids.join()!=='BanetsuWest'||r.format!=='full'||
     r.suffix!==spec.suffix||r.train_type!==null||
     r.operator!=='JR-East'||r.train_types?.join()!==spec.type||
     r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
     r.actual_vehicle_confirmed!==false||
     !r.runtime_guards?.sourceOperatorFallback||
     !r.runtime_guards?.allowedModelLabels?.length||
     (spec.id!=='js-0031'&&!r.runtime_guards?.requiredCandidateModelPrefix))
   throw Error('BanetsuWest source rule changed: '+spec.id);
  const names=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
  if(names.length!==spec.count||
     names.some(n=>!/^\d+[MD]$/.test(n)||!n.endsWith(spec.suffix)))
   throw Error('BanetsuWest original train numbers changed: '+spec.id);
  const numbers=names.map(n=>+n.slice(0,-1)).sort((a,b)=>a-b);
  const bands=[];
  for(const n of numbers){
   const last=bands[bands.length-1];
   if(last&&last.end+1===n)last.end=n;
   else bands.push({start:n,end:n});
  }
  if(bands.length!==spec.bands||
     bands.reduce((n,b)=>n+b.end-b.start+1,0)!==spec.count)
   throw Error('BanetsuWest number gap check failed: '+spec.id);
  for(const b of bands){
   const from=String(b.start).padStart(4,'0');
   const to=String(b.end).padStart(4,'0');
   expected.push({line:'BanetsuWest',png:spec.png,
    segment:'png_band/BanetsuWest/'+from+'-'+to+spec.suffix,
    from,to,suffix:spec.suffix,format:'full',
    status:'纯号段（JR原始车型与日期条件保留）'});
  }
 }
 const source=read(JR_BANETSU_WEST_SQL_MIGRATION);
 const pattern=/^  \('2611','BanetsuWest','(png_band\/BanetsuWest\/[^']+)',(\d+),(\d+),'([MD])',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...source.matchAll(pattern)];
 if(found.length!==31||expected.length!==31)
  throw Error('BanetsuWest SQL row count drift');
 for(let i=0;i<31;i++){
  const row=found[i],item=expected[i];
  if(row[1]!==item.segment||+row[2]!==+item.from||
     +row[3]!==+item.to||row[4]!==item.suffix||
     row[5]!==item.png)
   throw Error('BanetsuWest source/SQL difference: '+item.segment);
 }
 return expected;
}


// JR batch 27: original ChuoTatsuno E127 number 159M, image remains REVIEW.
// This is a number reference, never a checked livery or an actual trainset.
const JR_E127_CHUO_TATSUNO_SQL_MIGRATION=
 'supabase/migrations/20261118030000_seed_jr_chuo_tatsuno_e127_review_png_band_2611.sql';
function jrChuoTatsunoE127ReviewSqlSeedBands(c){
 const png='images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png';
 const r=c.rules.find(x=>x.id==='js-0061');
 if(!r||r.origin!=='frontend_js'||r.png!==png||
    r.line_ids.join()!=='ChuoTatsuno'||r.format!=='full'||
    r.min!==159||r.max!==159||r.suffix!=='M'||
    r.train_type!=='Local'||r.operator!=='JR-East'||
    r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
    r.actual_vehicle_confirmed!==false||
    r.direction_number_parity!=='inbound-even'||
    r.runtime_guards?.requiredCandidateModelPrefix!=='E127系'||
    r.runtime_guards?.sourceOperatorFallback!==true||
    r.published_numbers?.join()!=='159M'||
    r.weekday_numbers?.join()!=='159M'||
    r.holiday_numbers?.join()!=='159M')
  throw Error('JR E127 ChuoTatsuno original source or guards drift');
 const sql=read(JR_E127_CHUO_TATSUNO_SQL_MIGRATION);
 const pattern=/^  \('2611','ChuoTatsuno','png_band\/ChuoTatsuno\/0159-0159M',159,159,'M',NULL,'\.\.\/images\/列车\/JR東日本\/JR東日本_E127系_100番台_長野色\.png',NULL,FALSE,FALSE\)$/gm;
 if([...sql.matchAll(pattern)].length!==1||
    !sql.includes("AND asset_status='review'")||
    !sql.includes("AND asset_scope='review'"))
  throw Error('JR E127 original reference SQL/asset review mismatch');
 return [{line:'ChuoTatsuno',png,from:'0159',to:'0159',suffix:'M',
  format:'full',status:'纯号段（PNG待审查・原有候选条件保留）'}];
}


const METRO_TOEI_ASAKUSA_5500_MIGRATION='supabase/migrations/20261118031500_seed_metro_asakusa_5500_reference_train_number_bands_2611.sql';
function metroAsakusa5500StagedSqlSeedBands(c){
 const r=c.rules.find(x=>x.id==='js-0124');
 const png='images/列车/都営地下鉄/都営地下鉄_5500形.png';
 if(!r||r.origin!=='frontend_js'||r.png!==png||
    r.line_ids.join()!=='Asakusa'||r.format!=='toei-asakusa'||
    r.operator!=='Toei'||r.suffix!=='T'||
    r.runtime_guards?.sourceEvidence!=='staged-tokyo-gtfs-20261112-unverified'||
    r.runtime_guards?.allowedModelLabels?.join()!=='都営5500形'||
    r.runtime_guards?.requireRealtimeToeiOwner!==true||
    r.runtime_guards?.illustrative!==true||
    r.runtime_guards?.referenceOnly!==true||
    r.runtime_guards?.sourceOperatorFallback!==true||
    r.valid_from!=='2026-11-02'||r.valid_to!=='2026-11-20'||
    r.actual_vehicle_confirmed!==false)
   throw Error('Toei Asakusa 5500 staged number/guard source changed');
 const original=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
 if(original.length!==370||original.some(x=>!/^\d+(T|TA|TB)$/.test(x)))
   throw Error('Toei Asakusa 5500 original roster changed');
 const expected=[];
 for(const suffix of ['T','TA','TB']){
  const values=[...new Set(original.filter(n=>n.endsWith(suffix))
   .map(n=>+n.slice(0,-suffix.length)))].sort((a,b)=>a-b);
  const islands=[];
  for(const n of values){
   const last=islands[islands.length-1];
   if(last&&last.end+1===n)last.end=n;
   else islands.push({start:n,end:n});
  }
  for(const b of islands){
   const from=String(b.start).padStart(4,'0');
   const to=String(b.end).padStart(4,'0');
   expected.push({png,line:'Asakusa',from,to,suffix,
    segment:'png_band/Asakusa/'+from+'-'+to+suffix,
    format:'toei-asakusa',
    status:'纯号段（都营归属与车型限制保留・来源待复核）'});
  }
 }
 if(expected.length!==277||
    expected.filter(x=>x.suffix==='T').length!==206||
    expected.filter(x=>x.suffix==='TA').length!==36||
    expected.filter(x=>x.suffix==='TB').length!==35||
    expected.reduce((a,b)=>a+Number(b.to)-Number(b.from)+1,0)!==370)
  throw Error('Toei Asakusa 5500 documented islands count changed');
 const sql=read(METRO_TOEI_ASAKUSA_5500_MIGRATION);
 const re=/^  \('2611','Asakusa','(png_band\/Asakusa\/[^']+)',(\d+),(\d+),'(T|TA|TB)',NULL,'\.\.\/(images\/列车\/都営地下鉄\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(re)];
 if(found.length!==277)throw Error('Toei Asakusa SQL count drift');
 for(let i=0;i<277;i++){
  const a=found[i],b=expected[i];
  if(a[1]!==b.segment||+a[2]!==+b.from||
     +a[3]!==+b.to||a[4]!==b.suffix||a[5]!==b.png)
   throw Error('Toei Asakusa staged SQL row mismatch '+b.segment);
 }
 return expected;
}


// Private-railway batch 10, two Fujikyu REVIEW PNG assets.
// These bare train numbers are original illustrative/plan-gated references,
// not proof of the exact wrap, face panel or physical rolling stock.
const FUJIKYU_PRIVATE_REVIEW_BANDS_MIGRATION='supabase/migrations/20261118033000_seed_private_fujikyu_6000_8000_bare_number_png_bands_2611.sql';
function privateFujikyuReviewSqlSeedBands(c){
 const specs=[
  {id:'js-0002',png:'images/列车/富士急行/富士急行_6000系_標準色.png',count:52,bands:1},
  {id:'js-0003',png:'images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',count:7,bands:2}
 ];
 const expected=[];
 for(const s of specs){
  const r=c.rules.find(x=>x.id===s.id);
  if(!r||r.png!==s.png||r.origin!=='frontend_js'||
    r.line_ids.join()!=='Fujikyu'||r.format!=='bare'||
    r.operator!=='FujisanrokuElectricRailway'||r.suffix!==''||
    r.requires_compatible_plan!==true||
    r.runtime_guards?.referenceOnly!==true||
    r.runtime_guards?.illustrative!==true||
    r.runtime_guards?.sourceOperatorFallback!==true||
    r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
    r.actual_vehicle_confirmed!==false)
   throw Error('Fujikyu original bare-number guard changed '+s.id);
  const names=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
  if(names.length!==s.count||names.some(n=>!/^\d+$/.test(n)))
   throw Error('Fujikyu published numbers changed '+s.id);
  const nums=names.map(Number).sort((a,b)=>a-b),bands=[];
  for(const n of nums){
   const last=bands[bands.length-1];
   if(last&&last.end+1===n)last.end=n;
   else bands.push({start:n,end:n});
  }
  if(bands.length!==s.bands||
   bands.reduce((a,b)=>a+b.end-b.start+1,0)!==s.count)
   throw Error('Fujikyu no-gap count invalid '+s.id);
  for(const b of bands){
   const from=String(b.start).padStart(4,'0');
   const to=String(b.end).padStart(4,'0');
   expected.push({line:'Fujikyu',png:s.png,from,to,suffix:'',
    segment:'png_band/Fujikyu/'+from+'-'+to,format:'bare',
    status:'纯号段（PNG待审查・原条件保留）'});
  }
 }
 const sql=read(FUJIKYU_PRIVATE_REVIEW_BANDS_MIGRATION);
 const re=/^  \('2611','Fujikyu','(png_band\/Fujikyu\/[^']+)',(\d+),(\d+),'',NULL,'\.\.\/(images\/列车\/富士急行\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(re)];
 if(found.length!==3||expected.length!==3||
    !sql.includes("AND asset_status='review'"))
   throw Error('Fujikyu original review image migration drift');
 for(let i=0;i<3;i++){
  const a=found[i],b=expected[i];
  if(a[1]!==b.segment||+a[2]!==+b.from||+a[3]!==+b.to||
    a[4]!==b.png)
   throw Error('Fujikyu original number SQL mismatch '+b.segment);
 }
 return expected;
}


const JR29_E233_M_MIGRATION="supabase/migrations/20261118040000_seed_jr_chuo_e233_m_unambiguous_number_bands_2611.sql";
function jr29ChuoE233UnambiguousMBands(c){
 const png="images/列车/JR東日本/JR東日本_E233系_0番台.png";
 const r=c.rules.find(x=>x.id==="js-0060");
 if(!r||r.origin!=="frontend_js"||r.png!==png||
    r.line_ids.join()!=="ChuoMain"||r.operator!=="JR-East"||
    r.min!==600||r.max!==2399||r.suffix!=="M"||r.format!=="full"||
    r.train_type!==null||r.train_types!==null||
    r.evidence_kind!=="exact-list"||
    r.actual_vehicle_confirmed!==false||
    r.valid_from!=="2026-11-01"||r.valid_to!=="2026-11-30"||
    r.runtime_guards?.allowedModelLabels?.join()!=="E233系0番台"||
    r.runtime_guards?.excludeTrainType!=="LimitedExpress"||
    r.runtime_guards?.sourceOperatorFallback!==true)
   throw Error("JR29 E233 ChuoMain original guard changed");
 const source=[...new Set(r.published_numbers||[])];
 if(source.length!==71||
    source.some(n=>!n.endsWith("M")||!Number.isInteger(Number(n.slice(0,-1))))||
    !source.includes("2152M")||!source.includes("2166M"))
   throw Error("JR29 original published roster drift");
 // 2152M and 2166M collide with E353 LimitedExpress reference bands.
 const excluded=new Set(["2152M","2166M"]);
 const numbers=source.filter(n=>!excluded.has(n)).map(n=>Number(n.slice(0,-1)))
  .sort((a,b)=>a-b);
 const islands=[];
 for(const n of numbers){
  const b=islands[islands.length-1];
  if(b&&b.end+1===n)b.end=n;
  else islands.push({start:n,end:n});
 }
 if(numbers.length!==69||islands.length!==65||
    islands.reduce((n,b)=>n+b.end-b.start+1,0)!==69)
   throw Error("JR29 E233 documented no-gap bands drift");
 const expected=islands.map(b=>{
  const from=String(b.start).padStart(4,"0");
  const to=String(b.end).padStart(4,"0");
  return {png,line:"ChuoMain",from,to,suffix:"M",format:"full",
   segment:"png_band/ChuoMain/"+from+"-"+to+"M",
   status:"纯号段（JR原始车型与列车类别守卫保留）"};
 });
 const sql=read(JR29_E233_M_MIGRATION);
 const inserted=sql.split("\n").filter(x=>x.startsWith("  ('2611',"));
 if(inserted.length!==65)throw Error("JR29 migration row count drift");
 for(let i=0;i<65;i++){
  const b=expected[i];
  const row="  ('2611','ChuoMain','"+b.segment+"',"+Number(b.from)+","+Number(b.to)+
    ",'M',NULL,'../"+png+"',NULL,FALSE,FALSE)"+(i===64?"":",");
  if(inserted[i]!==row)throw Error("JR29 source/SQL row mismatch "+b.segment);
 }
 return expected;
}

// JR31: retire the old unvalidated Yamada D-number envelope in the audit
// projection; keep source JS guards intact and check 19 original numbers.
function jrYamadaExactReplacementSqlBands(c){
 const r=c.rules.find(x=>x.id==='js-0010');
 const png='images/列车/JR東日本/JR東日本_キハ110系.png';
 if(!r||r.origin!=='frontend_js'||r.png!==png||
 r.line_ids.join()!=='Yamada'||r.format!=='full'||
 r.suffix!=='D'||r.min!==631||r.max!==9642||
 r.number_index!=='jreast-yamada-2611'||
 r.operator!=='JR-East'||r.valid_from!=='2026-11-01'||
 r.valid_to!=='2026-11-30'||
 r.runtime_guards?.rejectAmbiguousPlan!==true||
 r.runtime_guards?.requiredCandidateModelPrefix!=='キハ110系'||
 r.actual_vehicle_confirmed!==false)
 throw Error('JR31 Yamada JS number/guard drift');
 const roster=[...new Set([...(r.published_numbers||[]),
  ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
 if(roster.length!==19||roster.some(x=>!/^\d{3,4}D$/.test(x)))
 throw Error('JR31 Yamada exact roster changed');
 const numbers=roster.map(x=>+x.slice(0,-1)).sort((a,b)=>a-b),runs=[];
 for(const n of numbers){const last=runs[runs.length-1];
  if(last&&last.to+1===n)last.to=n;else runs.push({from:n,to:n});
 }
 if(runs.length!==12||runs.reduce((n,x)=>n+x.to-x.from+1,0)!==19)
 throw Error('JR31 Yamada gap-free bands drift');
 const expected=runs.map(x=>{
  const from=String(x.from).padStart(4,'0'),to=String(x.to).padStart(4,'0');
  return {line:'Yamada',png,from,to,suffix:'D',format:'full',
   segment:'png_band/Yamada/'+from+'-'+to+'D',
   status:'纯号段（JR专用原始条件保留）'};
 });
 const legacy=jrFirstSqlSeedBands().filter(x=>x.line==='Yamada');
 if(legacy.length!==1||legacy[0].segment!=='png_band/Yamada/0631-9642D')
 throw Error('JR31 Yamada original SQL seed changed');
 const sql=read('supabase/migrations/20261118050000_replace_jr_yamada_broad_d_with_exact_number_bands_2611.sql');
 if(!sql.includes("segment_key='png_band/Yamada/0631-9642D'")||
 !sql.includes('DELETE FROM public.published_train_png_number_ranges'))
 throw Error('JR31 Yamada old broad SQL band not retired');
 const re=/^  \('2611','Yamada','(png_band\/Yamada\/[^']+)',(\d+),(\d+),'D',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:[,;])?$/gm;
 const found=[...sql.matchAll(re)];
 if(found.length!==12)throw Error('JR31 Yamada SQL band count mismatch');
 for(let i=0;i<12;i++){
  const a=found[i],b=expected[i];
  if(a[1]!==b.segment||+a[2]!==+b.from||+a[3]!==+b.to||a[4]!==b.png)
   throw Error('JR31 source/SQL mismatched Yamada band '+b.segment);
 }
 return expected;
}


// JR32-35: audit-only reuse of existing official-number lists and SQL.
function jr32to35ExactSqlSeedBands(c){
 const defs=[
  {line:'Gono',ids:['js-0034','js-0035'],old:[[122,2839],[3524,3526]],
   suffix:'D',png:'images/列车/JR東日本/JR東日本_GV-E400系.png',
   count:47,bands:26,file:'20261118051000_replace_jr_gono_broad_png_bands_with_exact_roster_2611.sql'},
  {line:'Echigo',ids:['js-0039','js-0041','js-0042'],old:[[120,1999],[8132,8637],[9630,9630]],
   suffix:'M',png:'images/列车/JR東日本/JR東日本_E129系.png',
   count:126,bands:31,file:'20261118052000_replace_jr_echigo_broad_png_bands_with_exact_roster_2611.sql'},
  {line:'Sagami',ids:['js-0038'],old:[[400,2599]],
   suffix:'F',png:'images/列车/JR東日本/JR東日本_E131系_500番台.png',
   count:165,bands:121,file:'20261118053000_replace_jr_sagami_broad_f_with_exact_png_numbers_2611.sql'},
  {line:'Nambu',ids:['js-0088'],old:[[400,4999]],
   suffix:'F',png:'images/列车/JR東日本/JR東日本_E233系_8000番台.png',
   count:628,bands:380,file:'20261118054000_replace_jr_nambu_broad_f_with_exact_png_numbers_2611.sql'}
 ];
 const output=[];
 for(const d of defs){
  const rules=d.ids.map(id=>c.rules.find(x=>x.id===id));
  rules.forEach((r,i)=>{
   if(!r||r.origin!=='frontend_js'||r.line_ids.join()!==d.line||
      r.png!==d.png||r.min!==d.old[i][0]||r.max!==d.old[i][1]||
      r.suffix!==d.suffix||r.format!=='full'||r.operator!=='JR-East'||
      r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
      r.actual_vehicle_confirmed!==false||
      r.runtime_guards?.sourceOperatorFallback!==true)
    throw Error('JR32-35 source scope/guard drift: '+d.line);
  });
  const names=[...new Set(rules.flatMap(r=>[...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])]))];
  if(names.length!==d.count||
     names.some(n=>!new RegExp('^\\d{3,4}'+d.suffix+'$').test(n)))
   throw Error('JR32-35 exact-number roster drift: '+d.line);
  const numbers=names.map(n=>parseInt(n,10)).sort((a,b)=>a-b),bands=[];
  for(const n of numbers){
   const last=bands[bands.length-1];
   if(last&&last.to+1===n)last.to=n;else bands.push({from:n,to:n});
  }
  if(bands.length!==d.bands||
     bands.reduce((n,b)=>n+b.to-b.from+1,0)!==d.count)
   throw Error('JR32-35 grouped islands drift: '+d.line);
  const expected=bands.map(({from,to})=>{
   const a=String(from).padStart(4,'0'),b=String(to).padStart(4,'0');
   return {line:d.line,png:d.png,from:a,to:b,suffix:d.suffix,format:'full',
    segment:'png_band/'+d.line+'/'+a+'-'+b+d.suffix,
    status:'纯号段（JR专用原始条件保留）'};
  });
  const sql=read('supabase/migrations/'+d.file);
  const rows=[...sql.matchAll(/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,|;)?$/gm)];
  if(rows.length!==d.bands)throw Error('JR32-35 SQL row count changed: '+d.line);
  expected.forEach((x,i)=>{
   const m=rows[i];
   if(m[1]!==x.line||m[2]!==x.segment||+m[3]!==+x.from||
      +m[4]!==+x.to||m[5]!==x.suffix||m[6]!==x.png)
    throw Error('JR32-35 SQL/JS mismatch: '+x.segment);
  });
  output.push(...expected);
 }
 return output;
}


// JR36–41: no-gap PNG references projected from the original Nov 2026 JS lists.
// Preserve the original runtime fleet, date, train-type and source guards.
function jr36to41ExactSqlSeedBands(c){
 const defs=[
  ['js-0036','Senseki','images/列车/JR東日本/JR東日本_E131系_800番台.png','S',400,2599,191,93,'20261118055000_replace_jr_senseki_broad_s_with_exact_191_numbers_2611.sql'],
  ['js-0102','Tsurumi','images/列车/JR東日本/JR東日本_E131系_1000番台.png','B',400,2599,83,57,'20261118060000_replace_jr_tsurumi_three_broad_b_with_exact_119_numbers_2611.sql'],
  ['js-0103','TsurumiUmiShibaura','images/列车/JR東日本/JR東日本_E131系_1000番台.png','B',400,2599,29,23,'20261118060000_replace_jr_tsurumi_three_broad_b_with_exact_119_numbers_2611.sql'],
  ['js-0104','TsurumiOkawa','images/列车/JR東日本/JR東日本_E131系_1000番台.png','B',400,2599,7,6,'20261118060000_replace_jr_tsurumi_three_broad_b_with_exact_119_numbers_2611.sql'],
  ['js-0011','Iiyama','images/列车/JR東日本/JR東日本_キハ110系.png','D',120,1123,54,14,'20261118061000_replace_jr_iiyama_broad_d_with_exact_54_numbers_2611.sql'],
  ['js-0018','Hachinohe','images/列车/JR東日本/JR東日本_キハE130系500番台.png','D',424,1463,41,21,'20261118062000_replace_jr_hachinohe_regular_broad_d_with_exact_41_numbers_2611.sql'],
  ['js-0024','BanetsuEast','images/列车/JR東日本/JR東日本_キハ110系.png','D',720,1756,35,4,'20261118063000_replace_jr_banetsu_east_broad_d_with_exact_35_numbers_2611.sql'],
  ['js-0040','SensekiTohoku','images/列车/JR東日本/JR東日本_HB-E210系.png','D',5500,5599,28,6,'20261118064000_replace_jr_senseki_tohoku_broad_d_with_exact_28_numbers_2611.sql']
 ];
 const result=[];
 for(const [id,line,png,suffix,min,max,count,expectedCount,file] of defs){
  const r=c.rules.find(x=>x.id===id);
  if(!r||r.origin!=='frontend_js'||r.line_ids.join()!==line||
   r.png!==png||r.min!==min||r.max!==max||r.suffix!==suffix||
   r.format!=='full'||r.operator!=='JR-East'||r.valid_from!=='2026-11-01'||
   r.valid_to!=='2026-11-30'||r.actual_vehicle_confirmed!==false||
   r.runtime_guards?.sourceOperatorFallback!==true)
   throw Error('JR36-41 original JS rule/guard changed: '+id);
  const names=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
  if(names.length!==count||
    names.some(n=>!new RegExp('^\\d{3,4}'+suffix+'$').test(n)))
   throw Error('JR36-41 original train-number list changed: '+id);
  const ns=names.map(n=>parseInt(n,10)).sort((a,b)=>a-b),groups=[];
  for(const n of ns){const last=groups[groups.length-1];
   if(last&&last.to+1===n)last.to=n;else groups.push({from:n,to:n});}
  if(groups.length!==expectedCount||
     groups.reduce((n,b)=>n+b.to-b.from+1,0)!==count)
   throw Error('JR36-41 grouped number islands changed: '+id);
  const expected=groups.map(({from,to})=>{
   const a=String(from).padStart(4,'0'),b=String(to).padStart(4,'0');
   return {line,png,from:a,to:b,suffix,format:'full',
    segment:'png_band/'+line+'/'+a+'-'+b+suffix,
    status:'纯号段（JR专用原始条件保留）'};
  });
  const sql=read('supabase/migrations/'+file);
  const matches=[...sql.matchAll(/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,|;)?$/gm)].filter(m=>m[1]===line);
  if(matches.length!==expectedCount)throw Error('JR36-41 migration rows changed: '+id);
  expected.forEach((x,i)=>{
   const m=matches[i];
   if(m[2]!==x.segment||+m[3]!==+x.from||+m[4]!==+x.to||
     m[5]!==x.suffix||m[6]!==x.png)
    throw Error('JR36-41 original numbers vs SQL differ: '+x.segment);
  });
  result.push(...expected);
 }
 return result;
}


// JR42–47: read-only exact-number reconstruction of the original November JS
// rules, checked against each deployed migration; no new runtime mapping source.
function jr42to47ExactSqlSeedBands(c){
 const defs=[
  {line:'Hachiko',ids:['js-0072'],old:[[220,249],[2223,2294]],suffix:'D',
   png:'images/列车/JR東日本/JR東日本_HB-E220系.png',numbers:54,bands:9,inserted:9,
   file:'20261118065000_jr42_hachiko_hbe220_exact_png_numbers_2611.sql'},
  {line:'UtsunomiyaJR',ids:['js-0053','js-0054'],old:[[620,699],[2823,2823]],suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E131系_600番台.png',numbers:79,bands:4,inserted:3,
   file:'20261118070000_jr43_utsunomiya_e131_600_exact_png_numbers_2611.sql'},
  {line:'Hakushin',ids:['js-0005','js-0006'],old:[[623,681],[920,950],[1620,1682],[1924,1951],[3921,3921]],suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E129系.png',numbers:91,bands:42,inserted:41,
   file:'20261118071000_jr44_hakushin_e129_exact_png_numbers_2611.sql'},
  {line:'Sotobo',ids:['js-0076'],old:[[3680,5983]],suffix:'Y',
   png:'images/列车/JR東日本/JR東日本_E233系5000番台.png',numbers:4,bands:4,inserted:4,
   file:'20261118072000_jr45_sotobo_togane_e233_5000_exact_y_2611.sql'},
  {line:'Togane',ids:['js-0077'],old:[[5680,5983]],suffix:'Y',
   png:'images/列车/JR東日本/JR東日本_E233系5000番台.png',numbers:2,bands:2,inserted:2,
   file:'20261118072000_jr45_sotobo_togane_e233_5000_exact_y_2611.sql'},
  {line:'Ito',ids:['js-0069'],old:[[3021,3031]],suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E257系_2000番台.png',numbers:8,bands:3,inserted:3,
   file:'20261118073000_jr46_ito_tokaido_e257_2000_exact_m_2611.sql'},
  {line:'Tokaido',ids:['js-0070'],old:[[3021,3031]],suffix:'M',
   png:'images/列车/JR東日本/JR東日本_E257系_2000番台.png',numbers:8,bands:3,inserted:3,
   file:'20261118073000_jr46_ito_tokaido_e257_2000_exact_m_2611.sql'},
  {line:'RikutoEast',ids:['js-0014'],old:[[1720,1747],[2725,2725],[4725,4734],[5720,5735]],suffix:'D',
   png:'images/列车/JR東日本/JR東日本_キハ110系.png',numbers:45,bands:9,inserted:7,
   file:'20261118074000_jr47_rikuto_east_kiha110_exact_d_2611.sql'}
 ];
 const result=[];
 for(const d of defs){
  const rules=d.ids.map(id=>c.rules.find(r=>r.id===id));
  if(rules.some(r=>!r||r.origin!=='frontend_js'||
    r.line_ids.join()!==d.line||r.png!==d.png||r.operator!=='JR-East'||
    r.suffix!==d.suffix||r.format!=='full'||r.valid_from!=='2026-11-01'||
    r.valid_to!=='2026-11-30'||r.actual_vehicle_confirmed!==false||
    r.runtime_guards?.sourceOperatorFallback!==true))
    throw Error('JR42–47 original JS scope changed: '+d.line);
  const names=[...new Set(rules.flatMap(r=>[...(r.published_numbers||[]),
    ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])]))];
  if(names.length!==d.numbers||
    names.some(n=>!new RegExp('^\\d{3,4}'+d.suffix+'$').test(n)))
    throw Error('JR42–47 original JS number list changed: '+d.line);
  const nums=names.map(n=>parseInt(n,10)).sort((a,b)=>a-b);
  if(nums.some(n=>!d.old.some(([lo,hi])=>n>=lo&&n<=hi)))
    throw Error('JR42–47 original JS number not in source ranges: '+d.line);
  const all=[],inserted=[];
  for(const [lo,hi] of d.old){
   const inside=nums.filter(n=>n>=lo&&n<=hi),islands=[];
   for(const n of inside){const last=islands[islands.length-1];
    if(last&&last.to+1===n)last.to=n;else islands.push({from:n,to:n});}
   if(!islands.length)throw Error('JR42–47 empty source band: '+d.line);
   all.push(...islands);
   if(islands.length===1&&islands[0].from===lo&&islands[0].to===hi)
    continue; // Preserve the already exact old 2823M / 3921M / 2725D / 5720–5735D rows.
   inserted.push(...islands);
  }
  if(all.length!==d.bands||inserted.length!==d.inserted||
    all.reduce((s,b)=>s+b.to-b.from+1,0)!==d.numbers)
    throw Error('JR42–47 source number islands changed: '+d.line);
  const expected=inserted.map(({from,to})=>{
   const a=String(from).padStart(4,'0'),b=String(to).padStart(4,'0');
   return {line:d.line,png:d.png,from:a,to:b,suffix:d.suffix,format:'full',
    segment:'png_band/'+d.line+'/'+a+'-'+b+d.suffix,
    status:'纯号段（JR专用原始条件保留）'};
  });
  const sql=read('supabase/migrations/'+d.file);
  const found=[...sql.matchAll(/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,|;)?$/gm)]
    .filter(m=>m[1]===d.line);
  if(found.length!==d.inserted)throw Error('JR42–47 SQL row count changed: '+d.line);
  expected.forEach((x,i)=>{
   const m=found[i];
   if(m[2]!==x.segment||+m[3]!==+x.from||+m[4]!==+x.to||
     m[5]!==x.suffix||m[6]!==x.png)
    throw Error('JR42–47 SQL/source mismatch: '+x.segment);
  });
  result.push(...expected);
 }
 return result;
}


// JR48: both E257-5500 PNG candidates advertise 4031M/4034M only.
// The previously broad 4031-4034M cannot be presented as an exact number band.
function jr48ExactSqlSeedBands(c){
 const png='images/列车/JR東日本/JR東日本_E257系_5500番台.png';
 const lines=[['Agatsuma','js-0046'],['Takasaki','js-0051']];
 const expected=[];
 for(const [line,id] of lines){
  const r=c.rules.find(x=>x.id===id);
  if(!r||r.origin!=='frontend_js'||r.line_ids.join()!==line||
    r.png!==png||r.operator!=='JR-East'||r.suffix!=='M'||r.format!=='full'||
    r.min!==4031||r.max!==4034||r.train_type!=='LimitedExpress'||
    r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
    r.actual_vehicle_confirmed!==false||
    r.runtime_guards?.sourceOperatorFallback!==true)
   throw Error('JR48 original guarded number source changed: '+id);
  const names=[...new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])].sort();
  if(names.join()!=='4031M,4034M')
   throw Error('JR48 original train-number list changed: '+id);
  for(const number of names){
   const s=number.slice(0,-1);
   expected.push({line,png,from:s,to:s,suffix:'M',format:'full',
    segment:'png_band/'+line+'/'+s+'-'+s+'M',
    status:'纯号段（JR专用原始条件保留）'});
  }
 }
 const sql=read('supabase/migrations/20261118075000_jr48_agatsuma_takasaki_e257_5500_exact_4031_4034_2611.sql');
 const found=[...sql.matchAll(/^ \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'M',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,|;)?$/gm)];
 if(found.length!==expected.length)throw Error('JR48 migration row count changed');
 expected.forEach((x,i)=>{
  const m=found[i];
  if(m[1]!==x.line||m[2]!==x.segment||
    +m[3]!==+x.from||+m[4]!==+x.to||m[5]!==x.png)
   throw Error('JR48 JS/SQL mismatch: '+x.segment);
 });
 return expected;
}


// Nov 2026 Tokyo Metro A/B public train-number roster, pure NUMERIC references.
// The JS owner continues to enforce raw A/B prefixes, weekday/holiday sources,
// operator/model requirements, reference-only and illustrative conditions.
function metroABExactSqlSeedBands(c){
 const specs=[
  ['js-0114','Chiyoda','東京メトロ_16000系.png','S','metro-prefixed',501,2496,469,399,388,'20261118080000_metro_chiyoda_ab_exact_reference_2611.sql'],
  ['js-0117','Namboku','東京メトロ_9000系.png','S','metro-prefixed',530,2456,327,276,276,'20261118081000_metro_namboku_ab_exact_reference_2611.sql'],
  ['js-0111','Ginza','東京メトロ_1000系.png','','metro-bare',501,6152,1009,598,596,'20261118082000_metro_ginza_ab_exact_reference_2611.sql'],
  ['js-0112','Marunouchi','東京メトロ_2000系.png','','metro-bare',427,21153,1003,775,770,'20261118083000_metro_marunouchi_ab_exact_reference_2611.sql'],
  ['js-0113','MarunouchiBranch','東京メトロ_2000系.png','','metro-bare',543,23632,612,414,281,'20261118084000_metro_marunouchi_branch_ab_exact_reference_2611.sql']
 ];
 const out=[];
 for(const [id,line,filename,suffix,format,min,max,rawCount,uniqCount,bandCount,file] of specs){
  const png='images/列车/東京メトロ/'+filename,r=c.rules.find(x=>x.id===id);
  if(!r||r.origin!=='frontend_js'||r.line_ids.join()!==line||
     r.png!==png||r.operator!=='TokyoMetro'||r.suffix!==suffix||
     r.format!==format||r.min!==min||r.max!==max||
     r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
     r.actual_vehicle_confirmed!==false||
     r.runtime_guards?.referenceOnly!==true||r.runtime_guards?.illustrative!==true||
     r.runtime_guards?.sourceOperatorFallback!==true||
     (line==='MarunouchiBranch'&&r.runtime_guards?.requireExplicitModelEvidence!==true))
   throw Error('Metro A/B JS source or guard changed: '+id);
  const raw=[...new Set([...(r.published_numbers||[]),
    ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
  const regex=suffix?/^[AB]\d+S$/:/^[AB]\d+$/;
  if(raw.length!==rawCount||raw.some(n=>!regex.test(n)))
   throw Error('Metro A/B raw number list changed: '+id);
  const values=[...new Set(raw.map(n=>Number(n.slice(1,suffix?-1:undefined))))].sort((a,b)=>a-b);
  if(values.length!==uniqCount||values[0]!==min||values.at(-1)!==max)
   throw Error('Metro A/B numeric-only reference coverage changed: '+id);
  const islands=[];
  for(const num of values){const last=islands[islands.length-1];
   if(last&&last.to+1===num)last.to=num;else islands.push({from:num,to:num});}
  if(islands.length!==bandCount||islands.reduce((n,b)=>n+b.to-b.from+1,0)!==uniqCount)
   throw Error('Metro A/B source number islands changed: '+id);
  const sql=read('supabase/migrations/'+file);
  const arrays=[...sql.matchAll(/ARRAY\[([0-9,]+)\]::int\[\]/g)].map(m=>m[1]);
  if(arrays.length!==2||arrays.some(x=>x!==values.join(',')))
   throw Error('Metro A/B SQL number arrays differ from raw JS source: '+id);
  for(const {from,to} of islands){
   const lo=String(from).padStart(4,'0'),hi=String(to).padStart(4,'0');
   out.push({line,png,from:lo,to:hi,suffix,format,
    segment:'png_band/'+line+'/'+lo+'-'+hi+suffix,
    status:'纯号段（地铁原有条件保留）'});
  }
 }
 return out;
}

// Tobu 634 is a historic, scoped CSV number reference only (2026 summer).
// This does NOT grant automatic PNG rendering or a November 2026 carset.
// Derive it from the already-checked SQL migration so inventory regeneration
// cannot silently turn the existing 5181/5182 references into "unmapped".
function privateTobu634HistoricalSqlSeedBands(){
 const sql=read('supabase/migrations/20261118131000_private18_tobu_634_skytree_5181_5182_historical_reference.sql');
 const png='images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png';
 if(!sql.includes('July 18/20, August 8/11/15, 2026')||
    !sql.includes('Not Nov 2026 or a live consist.'))
   throw Error('Tobu 634 historic date scope missing');
 const re=/\('2611','(TobuNikko|TobuSkytree)','(png_band\/[^']+)',(\d+),(\d+),'',NULL,'\.\.\/(images\/列车\/東武鉄道\/東武鉄道_634型_スカイツリートレイン\.png)',NULL,FALSE,FALSE\)/g;
 const matches=[...sql.matchAll(re)];
 const expected=[['TobuNikko',5181,5181],['TobuNikko',5182,5182],['TobuSkytree',5182,5182]];
 if(matches.length!==expected.length ||
    matches.some((m,i)=>m[1]!==expected[i][0]||+m[3]!==expected[i][1]||
      +m[4]!==expected[i][2]||m[5]!==png||
      m[2]!=='png_band/'+m[1]+'/'+m[3]+'-'+m[4]))
   throw Error('Tobu 634 source-only bands changed; review historical scope');
 return matches.map(m=>({line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
   to:String(m[4]).padStart(4,'0'),suffix:'',png,format:'full',
   status:'纯号段（东武官方2026夏季历史临时番号；现行运行日及实际车辆未证）'}));
}
// Late source-backed PNG references are derived from the actual migration SQL,
// never from a hand-maintained CSV. The old 2026-11-16 Supabase snapshot cannot
// include these commits. Each source is a single-PNG, source-scoped batch.
// These are REFERENCE records only: do not infer live formations/service days.
function lateVerifiedSourceSqlSeedBands(){
 const specs=[
  ['20261118080000_jr49_shinetsu_shirayuki_e653_51_58_reference_2611.sql',1,'JR東日本/JR東日本_E653系.png','纯号段（官方番号参考/日期及实车守卫保留）'],
  ['20261118081000_jr50_tokaido_fujikawa_373_4001_4014_reference_2611.sql',1,'JR東海/JR東海_373系.png','纯号段（特急ふじかわ/原运行条件保留）'],
  ['20261118122000_third05_oarai_kashima_8000_official_normal_service_refs.sql',8,'鹿島臨海鉄道/鹿島臨海鉄道_8000形.png','纯号段（官网常用8000形；可能临时改用6000形，不等于实车确认）'],
  ['20261118101000_private14_keisei_ae_9ae06_10ae04_exact_train_number_references.sql',2,'京成電鉄/京成電鉄_AE形.png',''],
  ['20261118125500_private17_keikyu_2100_10_exact_A_C_numbers_two_corridors.sql',20,'京浜急行電鉄/京浜急行電鉄_2100形.png','纯号段（京急官方322・323行路；实际运转日期和编组待核）'],
  ['20261118112500_private16_keio_5000_7732_7736_number_references.sql',2,'京王電鉄/京王電鉄_5000系.png','纯号段（历史完整番号参考；当期日期及实车待核）'],
  ['20261118104000_private15_izukyu_resort21_ito_official_2611_number_refs.sql',5,'伊豆急行/伊豆急行_2100系.png','纯号段（伊豆急官方2026年11月A・B行路／8000系代行日须排除）'],
  ['20261118140000_private19_izukyu_aloha_3000_exact_timetable_references.sql',5,'伊豆急行/伊豆急行_3000系.png','纯号段（伊豆急2026年3月14日时刻表・アロハ电车；素材仍review、实际车辆未确认）'],
  ['20261118152000_private20_odakyu_mse_official_20260314_7_exact_numbers.sql',5,'小田急電鉄/小田急電鉄_60000形_MSE.png','纯号段（小田急2026年3月14日官方MSE参考；素材仍review且非当日实车）'],
  ['20261118082500_private11_odakyu_gse_2611_exact_november_number_bands.sql',26,'小田急電鉄/小田急電鉄_70000形_GSE.png','纯号段（官方2026年11月GSE参考／日期条件另核）'],
  ['20261118155500_private21_tobu_tojo_50090_tjliner_20_dated_reference_numbers.sql',20,'東武鉄道/東武鉄道_50090型.png','纯号段（2024年50090运用+东武2025年TJ时刻表历史参考；非当日实车）'],
  ['20261118164000_jr51_hachinohe_tohoku_emotion_8421_8422_historical_refs.sql',1,'JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png','纯号段（2026年6月TOHOKU EMOTION 8421D/8422D历史参考；不是2026年11月当日车辆确认）'],
  ['20261118171000_jr52_sanyo_westexpress_ginga_8076_8079_official_reference.sql',2,'JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png','纯号段（JR西日本2026年11月官方山阳银河8076M与8079M；PNG尚待外观验收，不代表当日实车）'],
  ['20261118173000_jr53_sanyo_hanaakari_9510_9511_dated_reference.sql',1,'JR西日本/JR西日本_キハ189系_はなあかり.png','纯号段（JR西日本2026年秋山阳本线はなあかり9510D・9511D；PNG仍需素材审计且不等于当日实车）'],
  ['20261118180500_jr54_takasaki_shikishima_e001_8011m_historical_reference.sql',1,'JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png','纯号段（2026年9月5日・26日四季島8011M高崎线历史目击参考；并非运营方公布的正式号表，非当日编组）'],
  ['20261118183000_jr55_sanin_kiha187_superoki_3001_3002_reference.sql',1,'JR西日本/JR西日本_187系.png','纯号段（JR西日本2026年10・11月官方スーパーおき3001D/3002D参考；PNG仍为review且实际车辆未经确认）'],
  ['20261118190000_jr56_bantan_kiha189_hamakaze_1_2_official_reference.sql',1,'JR西日本/JR西日本_キハ189系.png','纯号段（JR西日本2026年11月官方はまかぜ1D・2D播但线参考；PNG仍review、非当日实车确认）'],
  ['20261118194500_private23_chichibu_c58_paleo_5001_5002_official_historical_reference.sql',1,'秩父鉄道/秩父鉄道_C58形_363号機.png','纯号段（秩父铁道2025年官方SL番号5001/5002与2026年C58运营交叉参考；不得混淆5000系编组号或确认今日实车）'],
  ['20261118201000_jr57_283_ocean_arrow_three_official_numbers_four_corridors.sql',4,'JR西日本/JR西日本_283系.png','纯号段（2026年11月JR西日本官方283系オーシャンアロー：2052M・2085M・6055M；按阪和／纪势途经线路入库，PNG仍review，非当日实车）'],
  ['20261118085000_private12_seibu_laview_2026_official_chichibu_number_references.sql',8,'西武鉄道/西武鉄道_001系_Laview.png','纯号段（官方ちちぶ公开号数／实际车次及运行日待核）'],
  ['20261118092000_private13_seibu_shinjuku_nra_koedo_number_references.sql',5,'西武鉄道/西武鉄道_10000系_ニューレッドアロー.png','纯号段（2026小江户服务与2025列车番号交叉参考／运行日待核）']
 ];
 const correction=read('supabase/migrations/20261118141000_private19_aloha_remove_unproven_5653_number.sql');
 if(!correction.includes("SET segment_key='png_band/Ito/5652-5652M',max_number=5652"))
  throw Error('Aloha 5653M revocation is missing; re-audit before publishing CSV');
 const refs=[];
 const re=/\('2611','([^']+)','(png_band\/[^']+)',\s*(\d+),\s*(\d+),'([^']*)',NULL,\s*'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)/g;
 for(const [file,expected,partialPng,defaultStatus] of specs){
  const sql=read('supabase/migrations/'+file);
  const png='images/列车/'+partialPng;
  const hits=[...sql.matchAll(re)];
  if(hits.length!==expected)
   throw Error('Changed SQL source band count in '+file+': '+hits.length+' vs '+expected);
  for(const m of hits){
   const line=m[1],suffix=m[5],from=Number(m[3]),to=Number(m[4]);
   if(m[6]!==png || !m[2].startsWith('png_band/'+line+'/') || to<from)
    throw Error('Invalid dated SQL source band in '+file);
   const isAlohaCorrection=file.includes('private19_izukyu_aloha') &&
      line==='Ito' && from===5652 && to===5653;
   const actualTo=isAlohaCorrection?5652:to;
   const segment=isAlohaCorrection?'png_band/Ito/5652-5652M':m[2];
   const status=file.includes('private14_keisei_ae')
      ?'纯号段（2026实拍'+from+suffix+'／当期日期守卫保留）'
      :defaultStatus;
   refs.push({line,segment,from:String(from).padStart(4,'0'),
     to:String(actualTo).padStart(4,'0'),suffix,png,format:'full',status});
  }
 }
 if(refs.length!==120)throw Error('Late sourced SQL bands must total 120 rows');
 return refs;
}

function pngFirstInventoryCsv(paths,c){
 const uniq=[...new Set(paths.filter(p=>/^images\/列车\/.+\.png$/i.test(p)))];
 const metro=new Set(['東京メトロ','都営地下鉄','横浜市交通局']);
 const third=new Set(['東京臨海高速鉄道','埼玉高速鉄道','東葉高速鉄道','首都圏新都市鉄道','北総鉄道','横浜高速鉄道','埼玉新都市交通','鹿島臨海鉄道','真岡鐵道','いすみ鉄道','わたらせ渓谷鉄道','ひたちなか海浜鉄道']);
 const other=new Set(['函館市電','東京モノレール','千葉都市モノレール','多摩都市モノレール','湘南モノレール','ゆりかもめ','山万','宇都宮ライトレール']);
 const operator=p=>p.split('/')[2];
 const category=op=>/^JR/.test(op)?'JR':metro.has(op)?'地铁':third.has(op)?'第三部门铁道':other.has(op)?'其他铁路':'私铁';
 const order=['JR','地铁','第三部门铁道','私铁','其他铁路'];
 const byPng=new Map(uniq.map(p=>[p,[]]));
 for(const r of c.rules){
  const variants=[{path:r.png,conditional:false}];
  for(const extra of Object.values(r.runtime_guards?.exactModelArtworkMap||{}))
   variants.push({path:String(extra).replace(/^(\.\.\/|\.\/|\/)+/,''),conditional:true});
  for(const v of variants){
   if(!byPng.has(v.path))continue;
   const status=v.conditional&&v.path!==r.png?'额外车型条件':
     r.pure_number_band?'纯号段':'原有条件约束';
   for(const line of r.line_ids)byPng.get(v.path).push([
    line,String(r.min).padStart(4,'0'),String(r.max).padStart(4,'0'),
    String(r.suffix||''),String(r.format||'full'),status]);
  }
 }
 // Special JR illustrated numbers are strictly date/line/source-gated in the
 // existing modules; these rows do NOT authorize otherwise unsupported trips.
 for(const ref of jrEastScopedNumberBands().concat(jrEastAdditionalNumberBands())){
  if(!byPng.has(ref.png))throw Error('JR source PNG missing from gallery: '+ref.png);
  byPng.get(ref.png).push([ref.line,ref.from,ref.to,ref.suffix,ref.format,ref.status]);
 }
 for(const ref of jrFirstSqlSeedBands().filter(x=>!(x.line==='Yamada'&&x.segment==='png_band/Yamada/0631-9642D')).concat(jrScopedSqlSeedBands(),jrThirdSqlSeedBands(),jrFourthSqlSeedBands(),jrFifthSqlSeedBands(),jrSixthSqlSeedBands(),jrSeventhSqlSeedBands(),jrEighthSqlSeedBands(),jrNinthSqlSeedBands(),jrTenthSqlSeedBands(),jrEleventhSqlSeedBands(),jrTwelfthSqlSeedBands(),jrThirteenthSqlSeedBands(),metroSecondSqlSeedBands(),metro13000And18000SqlSeedBands(),metroAsakusa5500StagedSqlSeedBands(c),metroABExactSqlSeedBands(c),jrBoso209BanetsuC57SqlSeedBands(c),jrE233Saikyo315GotembaSqlSeedBands(c),jrGotemba315ExactReplacementSqlBands(c),jrYamadaExactReplacementSqlBands(c),jr32to35ExactSqlSeedBands(c),jr36to41ExactSqlSeedBands(c),jr42to47ExactSqlSeedBands(c),jr48ExactSqlSeedBands(c),jrHachikoE231AndDe10ExactSqlSeedBands(c),jrChuoE353SqlSeedBands(c),jrChuoE233ThFujikyuSqlSeedBands(c),jr211ShonanNaganoSqlSeedBands(c),jrBanetsuWestSqlSeedBands(c),jrChuoTatsunoE127ReviewSqlSeedBands(c),jrResidualTwentyEighthSqlSeedBands(c),jr29ChuoE233UnambiguousMBands(c),jrSeventeenthSqlSeedBands(),jrEighteenthSqlSeedBands(),jrNineteenthSqlSeedBands(),thirdFirstSqlSeedBands(),thirdSecondSqlSeedBands(),privateFirstSqlSeedBands(),privateSecondSqlSeedBands(),privateThirdSqlSeedBands(),privateFourthSqlSeedBands(),privateNikkoSqlSeedBands(),privateSkytreeSqlSeedBands(),privateNinthSqlSeedBands(),privateFujikyuReviewSqlSeedBands(c),privateTobu634HistoricalSqlSeedBands(),lateVerifiedSourceSqlSeedBands()).filter(x=>!["png_band/Gono/0122-2839D","png_band/Gono/3524-3526D","png_band/Echigo/0120-1999M","png_band/Echigo/8132-8637M","png_band/Sagami/0400-2599F","png_band/Nambu/0400-4999F","png_band/Senseki/0400-2599S","png_band/Tsurumi/0400-2599B","png_band/TsurumiUmiShibaura/0400-2599B","png_band/TsurumiOkawa/0400-2599B","png_band/Iiyama/0120-1123D","png_band/Hachinohe/0424-1463D","png_band/BanetsuEast/0720-1756D","png_band/SensekiTohoku/5500-5599D","png_band/Hachiko/0220-0249D","png_band/Hachiko/2223-2294D","png_band/UtsunomiyaJR/0620-0699M","png_band/Hakushin/0623-0681M","png_band/Hakushin/0920-0950M","png_band/Hakushin/1620-1682M","png_band/Hakushin/1924-1951M","png_band/Sotobo/3680-5983Y","png_band/Togane/5680-5983Y","png_band/Ito/3021-3031M","png_band/Tokaido/3021-3031M","png_band/RikutoEast/1720-1747D","png_band/RikutoEast/4725-4734D","png_band/Agatsuma/4031-4034M","png_band/Takasaki/4031-4034M","png_band/Chiyoda/0501-2496S","png_band/Namboku/0530-2456S","png_band/Ginza/0501-6152","png_band/Marunouchi/0427-21153","png_band/MarunouchiBranch/0543-23632"].includes(x.segment))){
  if(!byPng.has(ref.png))throw Error('SQL source PNG missing from gallery: '+ref.png);
  byPng.get(ref.png).push([ref.line,ref.from,ref.to,ref.suffix,ref.format,ref.status]);
 }
 const records=[['分类','运营方目录','PNG路径','线路','起始番号','结束番号','后缀','号码格式','状态']];
 uniq.sort((a,b)=>order.indexOf(category(operator(a)))-order.indexOf(category(operator(b)))||
  (a<b?-1:a>b?1:0));
 for(const png of uniq){
  const op=operator(png);
  // Compact ONLY adjacent/overlapping documented intervals with identical
  // line, suffix, number interpretation and guard category. Gaps stay gaps.
  // This is a read-only inventory; source evidence must still be enforced.
  const bands=compactNumberBands(byPng.get(png));
  if(!bands.length)records.push([category(op),op,png,'','','','','','无号段']);
  for(const band of bands)records.push([category(op),op,png,...band]);
 }
 const quote=v=>{const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 return records.map(r=>r.map(quote).join(',')).join('\n')+'\n';
}
function galleryPngPaths(){
 const result=[];
 function traverse(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const absolute=path.join(dir,entry.name);
   if(entry.isDirectory())traverse(absolute);
   else if(entry.isFile()&&/\.png$/i.test(entry.name))
    result.push(path.relative(ROOT,absolute).split(path.sep).join('/'));
  }
 }
 traverse(path.join(ROOT,'images','列车'));return result;
}
function run(args){
 const catalog=buildCatalog(JSON.parse(read(SNAP)),getRows());
 const errors=audit(catalog),output=JSON.stringify(catalog,null,2)+'\n';
 if(args.includes('--write'))fs.writeFileSync(path.join(ROOT,OUT),output);
 if(args.includes('--write-inventory')||args.includes('--check-inventory')){
  const text=pngFirstInventoryCsv(galleryPngPaths(),catalog);
  if(args.includes('--write-inventory'))fs.writeFileSync(path.join(ROOT,PNG_INVENTORY),text);
  if(args.includes('--check-inventory')&&(!fs.existsSync(path.join(ROOT,PNG_INVENTORY))||
    read(PNG_INVENTORY)!==text))errors.push('stale PNG-first inventory');
 }
 if(args.includes('--check')&&(!fs.existsSync(path.join(ROOT,OUT))||read(OUT)!==output))
  errors.push('stale catalog: regenerate with --write');
 console.log(JSON.stringify({catalog:OUT,summary:catalog.summary,errors},null,2));
 if(args.includes('--strict')&&errors.length)process.exitCode=1;
 return {catalog,errors};
}
if(require.main===module)run(process.argv.slice(2));
module.exports={getRows,buildCatalog,crossSourceNumberAudit,collectCandidateOverlaps,audit,compactNumberBands,jrEastScopedNumberBands,jrEastAdditionalNumberBands,jrScopedSqlSeedBands,privateNikkoSqlSeedBands,privateSkytreeSqlSeedBands,privateNinthSqlSeedBands,pngFirstInventoryCsv,galleryPngPaths,run};


// JR 28 read-only audit: 15 gap-free source-exact bands across six JS rules.
// Original model, date, class and candidate restrictions stay in runtime.
function jrResidualTwentyEighthSqlSeedBands(c){
 const cfg=[
  ['js-0016','Kururi','JR東日本_キハE130系100番台.png','D','Local',40,6],
  ['js-0028','BanetsuWest','JR東日本_GV-E400系.png','D','Rapid',1,1],
  ['js-0029','BanetsuWest','JR東日本_GV-E400系.png','D','Rapid',1,1],
  ['js-0037','Senseki','JR東日本_HB-E210系.png','D','Rapid,SpecialRapid',28,28],
  ['js-0063','ChuoMain','JR東日本_211系_長野色.png','M','Local',1,1],
  ['js-0064','ChuoMain','JR東日本_211系_長野色.png','M','Local',1,1]
 ];
 const refs=cfg.map(([id,line,name,suffix,type,count])=>{
  const r=c.rules.find(x=>x.id===id);
  if(!r||r.origin!=='frontend_js'||r.png!=='images/列车/JR東日本/'+name||
   r.line_ids.join()!==line||r.suffix!==suffix||r.format!=='full'||
   r.operator!=='JR-East'||r.valid_from!=='2026-11-01'||
   r.valid_to!=='2026-11-30'||r.actual_vehicle_confirmed!==false||
   r.runtime_guards?.sourceOperatorFallback!==true||
   !r.runtime_guards?.allowedModelLabels?.length||
   (['js-0063','js-0064'].includes(id)?
    r.train_type!=='Local'||r.runtime_guards?.requireCandidateOverlap!==true:
    r.train_types?.join()!==type))
   throw Error('JR28 original number guards changed '+id);
  const names=new Set([...(r.published_numbers||[]),
   ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])]);
  if(names.size!==count||[...names].some(v=>!new RegExp('^\\d+'+suffix+'$').test(v)))
   throw Error('JR28 source number catalog changed '+id);
  return {r,names,line,suffix,id};
 });
 const sql=read('supabase/migrations/20261118034500_seed_jr_residual_exact_png_number_bands_2611.sql');
 const re=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([DM])',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...sql.matchAll(re)],result=[],counts=new Map();
 if(rows.length!==15)throw Error('JR28 expected 15 source intervals');
 for(const m of rows){
  const [line,segment,start,end,suffix,png]=[m[1],m[2],+m[3],+m[4],m[5],m[6]];
  const matching=refs.filter(x=>x.line===line&&x.r.png===png&&x.suffix===suffix);
  if(start>end||!matching.length||
   segment!=='png_band/'+line+'/'+String(start).padStart(4,'0')+'-'+String(end).padStart(4,'0')+suffix)
   throw Error('JR28 invalid SQL segment '+segment);
  for(let n=start;n<=end;n++){
   const hit=matching.find(x=>x.names.has(n+suffix));
   if(!hit)throw Error('JR28 unknown number or gap: '+n+suffix);
   counts.set(hit.id,(counts.get(hit.id)||0)+1);
  }
  result.push({line,segment,from:String(start).padStart(4,'0'),
   to:String(end).padStart(4,'0'),suffix,png,format:'full',
   status:'纯号段（JR既有原号码与车型守卫保留）'});
 }
 for(const [id,,, , , ,covered] of cfg)if((counts.get(id)||0)!==covered)
  throw Error('JR28 incomplete documented source '+id);
 return result;
}


// JR29 correction: historical Gotemba 2226-5550MG filled gaps and mixed
// alternate suffixes; only 88 original JS service numbers may be referenced.
function jrGotemba315ExactReplacementSqlBands(c){
 const png='images/列车/JR東海/JR東海_315系.png',r=c.rules.find(x=>x.id==='js-0001');
 if(!r||r.origin!=='frontend_js'||r.png!==png||
 r.line_ids.join()!=='Gotemba'||r.suffix!=='MG'||r.format!=='full'||
 r.operator!=='JR-Central'||r.train_type!=='Local'||
 r.valid_from!=='2026-11-01'||r.valid_to!=='2026-11-30'||
 r.actual_vehicle_confirmed!==false||
 r.runtime_guards?.illustrative!==true||
 r.runtime_guards?.referenceOnly!==true||
 r.runtime_guards?.sourceOperatorFallback!==true||
 r.published_numbers?.length!==88)
 throw Error('Gotemba 315 source/guard drift');
 const roster=[...new Set([...(r.published_numbers||[]),
 ...(r.weekday_numbers||[]),...(r.holiday_numbers||[])])];
 if(roster.length!==88||roster.some(x=>!/^\d{4}[MG]$/.test(x)))
 throw Error('Gotemba 315 roster drift');
 const expected=[];
 for(const suffix of ['M','G']){
  const ns=[...new Set(roster.filter(x=>x.endsWith(suffix))
   .map(x=>+x.slice(0,-1)))].sort((a,b)=>a-b),runs=[];
  for(const n of ns){const last=runs[runs.length-1];
   if(last&&last.to+1===n)last.to=n;else runs.push({from:n,to:n});}
  for(const b of runs){
   const from=String(b.from).padStart(4,'0'),to=String(b.to).padStart(4,'0');
   expected.push({line:'Gotemba',png,from,to,suffix,format:'full',
    segment:'png_band/Gotemba/'+from+'-'+to+suffix,
    status:'纯号段（御殿场线原始号码与日期守卫保留）'});
  }
 }
 if(expected.length!==35||
 expected.filter(x=>x.suffix==='M').length!==23||
 expected.filter(x=>x.suffix==='G').length!==12||
 expected.reduce((n,x)=>n+Number(x.to)-Number(x.from)+1,0)!==88)
 throw Error('Gotemba 315 no-gap source groups drift');
 const sql=read('supabase/migrations/20261118040000_replace_jr_gotemba_315_broad_mg_with_exact_number_bands_2611.sql');
 if(!sql.includes("DELETE FROM public.published_train_png_number_ranges")||
 !sql.includes("segment_key='png_band/Gotemba/2226-5550MG'"))
 throw Error('Gotemba broad legacy row not retired');
 const re=/^  \('2611','Gotemba','(png_band\/Gotemba\/[^']+)',(\d+),(\d+),'([MG])',NULL,'\.\.\/(images\/列车\/JR東海\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const found=[...sql.matchAll(re)];
 if(found.length!==35)throw Error('Gotemba 315 SQL rows drift');
 for(let i=0;i<35;i++){const a=found[i],b=expected[i];
  if(a[1]!==b.segment||+a[2]!==+b.from||
   +a[3]!==+b.to||a[4]!==b.suffix||a[5]!==b.png)
   throw Error('Gotemba 315 exact source SQL mismatch '+b.segment);}
 return expected;
}
