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
 for(const ref of jrFirstSqlSeedBands().concat(jrScopedSqlSeedBands(),jrThirdSqlSeedBands(),jrFourthSqlSeedBands(),jrFifthSqlSeedBands(),jrSixthSqlSeedBands(),jrSeventhSqlSeedBands(),jrEighthSqlSeedBands(),jrNinthSqlSeedBands(),jrTenthSqlSeedBands(),jrEleventhSqlSeedBands(),jrTwelfthSqlSeedBands(),jrThirteenthSqlSeedBands(),metroSecondSqlSeedBands(),metro13000And18000SqlSeedBands(),jrBoso209BanetsuC57SqlSeedBands(c),jrSeventeenthSqlSeedBands(),jrEighteenthSqlSeedBands(),jrNineteenthSqlSeedBands(),thirdFirstSqlSeedBands(),thirdSecondSqlSeedBands(),privateFirstSqlSeedBands(),privateSecondSqlSeedBands(),privateThirdSqlSeedBands(),privateFourthSqlSeedBands(),privateNikkoSqlSeedBands(),privateSkytreeSqlSeedBands(),privateNinthSqlSeedBands())){
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
