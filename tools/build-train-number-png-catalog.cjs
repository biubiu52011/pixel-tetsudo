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
function buildCatalog(snapshot, rows) {
 const norm = p => String(p||'').replace(/^(\.\.\/|\.\/|\/)+/,'');
 const sql=(snapshot.published_train_png_number_ranges||[]).map((r,i)=>({
  id:'sql-'+String(i+1).padStart(4,'0'),origin:'sql_snapshot',
  line_ids:[r.line_key],segment:r.segment_key,format:'full',
  min:r.min_number,max:r.max_number,suffix:r.suffix||'',
  model:r.vehicle_model,png:norm(r.png_reference),
  requires_exact_roster:r.requires_exact_roster===true,
  actual_vehicle_confirmed:r.actual_vehicle_confirmed===true
 }));
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
  evidence_kind:(r.publishedNumbers||r.weekdayNumbers||r.holidayNumbers)?'exact-list':
    r.numberIndex?'external-index':'range-with-runtime-guards',
  actual_vehicle_confirmed:false
 }));
 const index={};
 for(const r of sql.concat(js))for(const line of r.line_ids){
  if(!index[line])index[line]={sql:[],js:[]};
  index[line][r.origin==='sql_snapshot'?'sql':'js'].push(r.id);
 }
 const sortedIndex=Object.fromEntries(Object.entries(index).sort((a,b)=>a[0].localeCompare(b[0],'en')));
 const assets=new Map(snapshot.vehicle_image_assets.map(a=>[norm(a.image_path),a]));
 const missing=[],labels=[],overlaps=[];
 for(const r of sql){
  const a=assets.get(r.png);
  if(!a)missing.push({rule:r.id,line:r.line_ids[0],segment:r.segment,png:r.png});
  else if(a.vehicle_type!==r.model)labels.push({rule:r.id,line:r.line_ids[0],rule_model:r.model,asset_model:a.vehicle_type,png:r.png});
 }
 for(let i=0;i<sql.length;i++)for(let j=i+1;j<sql.length;j++){
  const a=sql[i],b=sql[j];
  if(a.line_ids[0]!==b.line_ids[0]||a.suffix!==b.suffix||a.min>b.max||b.min>a.max)continue;
  overlaps.push({a:a.id,b:b.id,line:a.line_ids[0],
   segment_a:a.segment,segment_b:b.segment,
   min:Math.max(a.min,b.min),max:Math.min(a.max,b.max),
   same_model_png:a.model===b.model&&a.png===b.png});
 }
 return {schema_version:1,edition:'2611',snapshot_date:snapshot.snapshot_date,
  role:'derived read-only catalog; never exact physical formation evidence',
  sources:['data/timetables/train-number-png-ranges.js','data/audits/supabase-railway-audit-snapshot-20261116.json',
   'data/timetables/vehicle-garage-png-map.js'],
  summary:{sql_rules:sql.length,js_rules:js.length,js_line_assignments:js.reduce((n,r)=>n+r.line_ids.length,0),
   total_line_keys:Object.keys(sortedIndex).length,
   sql_lines:new Set(sql.map(r=>r.line_ids[0])).size,
   js_lines:new Set(js.flatMap(r=>r.line_ids)).size,
   unregistered_sql_png_rules:missing.length,model_label_differences:labels.length,
   overlapping_sql_bands:overlaps.length,
   overlapping_different_model_bands:overlaps.filter(x=>!x.same_model_png).length},
  line_index:sortedIndex,rules:sql.concat(js),
  review:{missing_sql_asset_registration:missing,sql_asset_label_differences:labels,sql_range_overlaps:overlaps}};
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
 }
 const knownMissing=new Set([
  'images/列车/富士急行/富士急行_6000系_標準色.png',
  'images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',
  'images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',
  'images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png'
 ]);
 for(const r of c.review.missing_sql_asset_registration)
  if(!knownMissing.has(r.png))errors.push('new unregistered SQL artwork '+r.png);
 if(c.review.missing_sql_asset_registration.length>5)
  errors.push('new SQL artwork registry gaps');
 if(c.review.sql_asset_label_differences.length>14)
  errors.push('new model-label inconsistencies');
 const allowed=new Set([
  'east_211_family|east_e353_azusa_hakuba',
  'east_211_family|east_e127_100_family',
  'east_e127_100_family|east_e353_azusa_hakuba'
 ]);
 for(const r of c.review.sql_range_overlaps){
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
module.exports={getRows,buildCatalog,audit,run};
