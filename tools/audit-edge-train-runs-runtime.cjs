'use strict';
/*
 * READ-ONLY live train-runs -> actual browser _trainRunToTimetable ->
 * existing TrainVehicle / SVG marker selector audit.
 *
 * node tools/audit-edge-train-runs-runtime.cjs \
 *   --date=2026-11-16 --lines=SaikyoKawagoe,Gotemba,ChuoCentral --strict
 *
 * No Edge key and no database credentials. Only aggregates are printed;
 * the public response and image data are never persisted in this script.
 * This is a contract and minimum-position replay, NOT the full
 * TrainPositionEstimator/DataFusion/ODPT browser pipeline.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const value=(key,defaultValue)=>{
  const arg=args.find(x=>x.startsWith('--'+key+'='));
  return arg?arg.slice(key.length+3):defaultValue;
};
const day=value('date','2026-11-16');
const lines=value('lines','SaikyoKawagoe,Gotemba,ChuoCentral')
 .split(',').map(x=>x.trim()).filter(Boolean);
if(!/^\d{4}-\d{2}-\d{2}$/.test(day) ||
   new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day ||
   !lines.length || lines.length>10 ||
   lines.some(x=>!/^[A-Za-z0-9._:-]{1,80}$/.test(x)))
  throw Error('Explicit service date and 1-10 line IDs required');
const strict=args.includes('--strict');

// Read only the REAL browser adapter, not a near-equivalent reimplementation.
const client=fs.readFileSync(path.join(root,'data/api/odpt-unified.js'),'utf8');
const endpoint=client.match(/var TRAIN_RUN_CACHE_ENDPOINT\s*=\s*"([^"]+)"/)?.[1]||'';
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/train-runs$/.test(endpoint))
  throw Error('Unexpected production read-only train-runs endpoint');
const begin=client.indexOf('    function _dbStopClock(');
const end=client.indexOf('    function getTimetableIdentity(',begin);
if(begin<0 || end<=begin)throw Error('Canonical SQL adapter moved');
const adapter=vm.createContext({
  LINE_TO_OPERATOR:{},LINE_RAILWAY_CODE:{},
  Date,Array,String,Number,Math,encodeURIComponent,console:{
    log(){},debug(){},warn(){},error(){}
  }
});
vm.runInContext(client.slice(begin,end),adapter,
  {filename:'data/api/odpt-unified.js:train-run-adapter',timeout:15000});
if(typeof adapter._trainRunToTimetable!=='function')
  throw Error('Production train-run adapter did not initialize');
// Avoid duplicate SVG selection implementation; import the prior audited
// module (which in turn loads the production JS files once).
const runtime=require('./audit-train-number-png-runtime.cjs');
const garage=runtime.window.VehicleGaragePngMap;
assert.equal(typeof runtime.replay,'function');
assert.equal(typeof garage.isQuarantinedPng,'function');

const report={
  serviceDate:day,probeType:'public-live-edge-browser-adapter-minimum-position',
  deployedFunctionVersion:'not claimed; retrieve from Supabase separately',
  caveat:'Live Edge response through the real _trainRunToTimetable, then a reconstructed minimal position via existing SVG selector. Not full DataFusion/TrainPositionEstimator, not observed rolling stock.',
  checkedLines:lines.slice(),receivedLines:0,sourceTotal:0,
  adapterAcceptedTotal:0,referencePngTotal:0,neutralTotal:0,
  plannedPngTotal:0,uniquePngPaths:[],trustIssues:[],
  byLine:{},requestErrors:[]
};
const seenPng=new Set();
const minorIssue=(line,kind,number)=>{if(report.trustIssues.length<25)
  report.trustIssues.push({line,kind,number:String(number||'')});};
const cal=(t,r)=>{
  const source=String(t['odpt:calendar']||r.calendar_type||'');
  if(/(?:^|[.:])Weekday$/.test(source)||source==='weekday')return 'weekday';
  if(/(?:SaturdayHoliday|Saturday|Holiday|Sunday)$/.test(source)||
    ['holiday','saturday_holiday','saturday','sunday'].includes(source))return 'holiday';
  return '';
};
function position(run,tt){
  const operator=run.operator || '';
  return {
    trainNumber:String(tt['odpt:trainNumber']||''),
    trainId:String(tt['@id']||run.trip_id||''),
    serviceDate:String(run.service_date||''),
    sourceRailway:String(tt['odpt:railway']||''),
    positionLineId:String(run.line_id||''),
    trainOperator:operator,
    trainType:String(tt['odpt:trainType']||''),
    railDirection:String(tt['odpt:railDirection']||''),
    calendarType:cal(tt,run),
    serviceId:String(tt._serviceId||tt['odpt:calendar']||''),
    positionSource:'supabase-train-run',
    estimated:true,
    timetableValidity:String(tt._timetableValidity||''),
    timetableDateVerified:tt._timetableDateVerified===true,
    // Do not invent official-number verification (Edge returns a provenance
    // string; a browser verifier is responsible for upgrading it).
    officialNumberVerified:false,
    canonicalTimetableId:tt._canonicalTrainTimetableId||null,
    canonicalGroupEvidence:tt._canonicalGroupEvidence||'source_only',
    canonicalLineIds:tt._canonicalLineIds||[],
    _sqlVehicleMappingLevel:tt._sqlVehicleMappingLevel,
    _sqlVehicleArtworkPath:tt._sqlVehicleArtworkPath,
    _sqlVehiclePlanConfirmed:tt._sqlVehiclePlanConfirmed,
    _sqlVehicleCandidateLabel:tt._sqlVehicleCandidateLabel,
    _sqlVehicleCandidateSourceUrl:tt._sqlVehicleCandidateSourceUrl,
    _sqlVehicleCandidateSourceId:tt._sqlVehicleCandidateSourceId,
    _sqlVerifiedPublishedVehicleType:tt._sqlVerifiedPublishedVehicleType,
    _sqlVerifiedPublishedVehicleSourceUrl:tt._sqlVerifiedPublishedVehicleSourceUrl,
    _sqlPublishedNumberFleetReference:tt._sqlPublishedNumberFleetReference,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false,
    vehicleType:tt.vehicleType
  };
}
async function fetchLine(line){
  const url=endpoint+'?line_id='+encodeURIComponent(line)+
    '&service_date='+encodeURIComponent(day);
  const result={sourceStatus:'',runCount:0,adapterAccepted:0,
    adapterRejected:0,referencePng:0,neutral:0,plannedPng:0,
    sourceConfirmedPlan:0,sourceDateVerified:0,sourceCandidate:0,
    sourcePng:0,clientPng:0,complete:false,partial:false,
    completeReason:'',sourceCoverage:'',responseCalendar:'',
    pngPaths:[],wrongLineImages:0,missingRailwayImages:0};
  report.byLine[line]=result;
  let body;
  try {
    const resp=await fetch(url,{method:'GET',headers:{accept:'application/json'},
      signal:AbortSignal.timeout(30000)});
    if(!resp.ok)throw Error('HTTP_'+resp.status);
    const max=12*1024*1024;
    if(Number(resp.headers.get('content-length')||0)>max)
      throw Error('RESPONSE_TOO_LARGE');
    const raw=await resp.text();
    if(raw.length>max)throw Error('RESPONSE_TOO_LARGE');
    body=JSON.parse(raw);
    if(body.ok!==true || body.line_id!==line || body.service_date!==day ||
       !Array.isArray(body.runs))throw Error('BAD_EDGE_RESPONSE_IDENTITY');
    result.sourceStatus='ok';
    result.sourceCoverage=String(body.source_coverage||'');
    result.responseCalendar=String(body.selected_calendar||'');
    result.complete=body.complete===true;
    result.partial=body.partial===true;
    result.runCount=body.runs.length;
    result.sourceDateVerified=Number(body.date_verified_runs)||0;
    report.sourceTotal+=body.runs.length;
    ++report.receivedLines;
  }catch(e){
    result.sourceStatus='error';
    report.requestErrors.push({line,error:String(e&&e.message||e).slice(0,130)});
    return;
  }

  for(const run of body.runs){
    const number=String(run?.train_number||'');
    if(!run || run.line_id!==line || run.service_date!==day){
      minorIssue(line,'edge_row_identity_mismatch',number);continue;
    }
    if(run.vehicle_plan_confirmed===true)++result.sourceConfirmedPlan;
    if(run.vehicle_mapping_level==='source_single_type_candidate')++result.sourceCandidate;
    if(run.vehicle_artwork_path)++result.sourcePng;
    if(!Array.isArray(run.stops)||run.stops.length<2){
      ++result.adapterRejected;continue;
    }
    const tt=adapter._trainRunToTimetable(run);
    if(!tt){++result.adapterRejected;continue;}
    ++result.adapterAccepted;++report.adapterAcceptedTotal;
    if(tt._sqlVehicleArtworkPath)++result.clientPng;
    if(tt._sqlVehicleArtworkPath!==(run.vehicle_artwork_path||null))
      minorIssue(line,'artwork_path_dropped',number);
    if(tt._sqlVehiclePlanConfirmed!==(run.vehicle_plan_confirmed===true))
      minorIssue(line,'plan_confirmed_lost',number);
    if(tt._timetableDateVerified!==(run.timetable_date_verified===true))
      minorIssue(line,'date_verified_lost',number);
    if(tt._sqlVehicleMappingLevel!==(run.vehicle_mapping_level||'unresolved'))
      minorIssue(line,'mapping_level_lost',number);
    if(run.vehicle_mapping_level==='source_single_type_candidate' && tt.vehicleType)
      minorIssue(line,'candidate_promoted_to_exact',number);
    if(tt['odpt:trainNumber']!==number)
      minorIssue(line,'train_number_changed_in_adapter',number);
    if(tt._positionSource!=='supabase-train-run')
      minorIssue(line,'source_changed_in_adapter',number);

    const p=position(run,tt);
    let spec;
    try{spec=runtime.replay(p);}catch(e){
      minorIssue(line,'svg_replay_error',number);continue;
    }
    if(spec.kind==='vehicle' && spec.iconSrc){
      ++result.referencePng;++report.referencePngTotal;
      if(spec.planned===true){++result.plannedPng;++report.plannedPngTotal;}
      else minorIssue(line,'unconfirmed_input_rendered_as_exact',number);
      if(garage.isQuarantinedPng(spec.iconSrc))
        minorIssue(line,'quarantined_artwork',number);
      const normalized=path.resolve(root,'pages',spec.iconSrc);
      if(!fs.existsSync(normalized))
        minorIssue(line,'missing_local_artwork',number);
      seenPng.add(spec.iconSrc);
      if(result.pngPaths.length<15 && !result.pngPaths.includes(spec.iconSrc))
        result.pngPaths.push(spec.iconSrc);
      const cross=runtime.replay({...p},'Yamanote');
      if(cross.kind==='vehicle')++result.wrongLineImages;
      const noSource=runtime.replay({...p,sourceRailway:''});
      if(noSource.kind==='vehicle')++result.missingRailwayImages;
    }else {++result.neutral;++report.neutralTotal;}
  }
  if(result.wrongLineImages>0)minorIssue(line,'cross_line_artwork',result.wrongLineImages);
  if(result.missingRailwayImages>0)minorIssue(line,'source_free_artwork',result.missingRailwayImages);
}
(async()=>{
  for(const line of lines)await fetchLine(line);
  report.uniquePngPaths=[...seenPng].sort();
  console.log(JSON.stringify(report,null,2));
  if(strict&&(report.requestErrors.length || report.trustIssues.length ||
    report.receivedLines!==lines.length))process.exitCode=1;
})().catch(e=>{console.error('AUDIT_FATAL',String(e));process.exitCode=1;});
