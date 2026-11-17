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
 return matches.map((m)=>({
  line:m[1],segment:m[2],from:String(m[3]).padStart(4,'0'),
  to:String(m[4]).padStart(4,'0'),suffix:m[5],format:'full',png:m[6],
  status:'纯号段（JR专用原始条件保留）'
 }));
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
 for(const ref of jrFirstSqlSeedBands().concat(jrScopedSqlSeedBands(),jrThirdSqlSeedBands(),jrFourthSqlSeedBands(),jrFifthSqlSeedBands(),jrSixthSqlSeedBands(),jrSeventhSqlSeedBands(),jrEighthSqlSeedBands(),jrNinthSqlSeedBands(),jrTenthSqlSeedBands(),jrEleventhSqlSeedBands(),jrTwelfthSqlSeedBands(),jrThirteenthSqlSeedBands(),metroSecondSqlSeedBands(),jrSeventeenthSqlSeedBands(),jrEighteenthSqlSeedBands(),jrNineteenthSqlSeedBands(),thirdFirstSqlSeedBands(),thirdSecondSqlSeedBands())){
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
module.exports={getRows,buildCatalog,crossSourceNumberAudit,collectCandidateOverlaps,audit,compactNumberBands,jrEastScopedNumberBands,jrEastAdditionalNumberBands,jrScopedSqlSeedBands,pngFirstInventoryCsv,galleryPngPaths,run};
