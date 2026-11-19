'use strict';
/* Read-only PNG first / train-number runtime regression, no new mapping truth.
 * Usage:
 *   node tools/audit-train-number-png-runtime.cjs
 *   node tools/audit-train-number-png-runtime.cjs data/audits/train-number-png-runtime-sample-20261116.json --strict
 *
 * Replays the actual TrainVehicle -> trains-render _trainMarkerSpec selection
 * from explicitly dated SQL SOURCE snapshots, not invented train models.
 * This harness reconstructs the minimal position object only; it does NOT
 * execute the complete Supabase train-runs adapter, live ODPT, or image loads.
 * Neutral outputs may need additional, legitimately issued position metadata.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const strict=args.includes('--strict');
const input=args.find(s=>!s.startsWith('--')) ||
  'data/audits/train-number-png-runtime-sample-20261116.json';
const data=JSON.parse(fs.readFileSync(path.resolve(root,input),'utf8'));
if(!Array.isArray(data.rows) || !/^\d{4}-\d{2}-\d{2}$/.test(data.serviceDate))
  throw Error('Expected {serviceDate,rows:[]} from the read-only source-resolution SQL');
const date=data.serviceDate;
const window={};
const silentConsole={debug(){},log(){},warn(){},error(){}};
const context=vm.createContext({
  window,Date,console:silentConsole,
  _isTrainArtworkFailureActive(){return false;}
});
const modules=[
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/nambu-branch-official-202611.js',
  'data/timetables/joban-e231-h-202611-index.js',
  'data/timetables/jreast-keihin-2611-number-index.js',
  'data/timetables/jreast-yokohama-2611-number-index.js',
  'data/timetables/jreast-yamanote-2611-number-index.js',
  'data/timetables/jreast-regional-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
];
for(const file of modules){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),
    context,{filename:file,timeout:15000});
}
if(!window.TrainVehicle || !window.VehicleGaragePngMap)
  throw Error('Production PNG owner not loaded');
const render=fs.readFileSync(path.join(root,'js/trains-render.js'),'utf8');
const from=render.indexOf('  function _trainMarkerDomKind(');
const to=render.indexOf('  // Public identification boundary:',from);
if(from<0 || to<=from)throw Error('Renderer selector moved: update audit');
vm.runInContext(render.slice(from,to),context,{filename:'js/trains-render.js:marker',timeout:15000});
if(typeof context._trainMarkerSpec!=='function')
  throw Error('SVG train marker spec not loaded');

function calendarOf(urn){
  const str=String(urn||'');
  if(/Weekday$/.test(str))return 'weekday';
  if(/(?:SaturdayHoliday|Holiday|Sunday)$/.test(str))return 'holiday';
  return '';
}
function position(row){
  const operator=String(row.railway_urn||'').match(/^odpt\.Railway:([^.]+)/)?.[1]||'';
  return {
    // Original full public train number; never derive an operation code.
    trainNumber:row.train_number,
    trainId:row.source_trip_id || 'audit-source:'+row.source_id,
    serviceDate:date,
    calendarType:calendarOf(row.calendar_urn),
    serviceId:row.calendar_urn,
    timetableCalendar:row.calendar_urn,
    positionLineId:row.line_key,
    sourceRailway:row.railway_urn,
    railDirection:row.direction_urn,
    trainType:row.train_type_urn||'',
    trainOperator:operator,
    positionSource:'supabase-train-run',estimated:true,
    timetableValidity:row.timetable_validity||'',
    timetableDateVerified:row.timetable_validity==='date_verified',
    // Source-resolution has no independent official-number bool; do not fake.
    officialNumberVerified:false,
    _sqlVehicleMappingLevel:row.mapping_level||'unresolved',
    _sqlVehicleArtworkPath:row.sql_png_path||'',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false
  };
}
function replay(p,displayLineId){
  return context._trainMarkerSpec(p,p.trainId,displayLineId||p.positionLineId);
}
function serviceKey(r){
  return [r.line_key,r.railway_urn,r.calendar_urn,
    r.direction_urn,r.train_number].join('|');
}
function probe(p,kind){
  const q={...p};
  let target=q.positionLineId;
  if(kind==='wrong-display-line')target='Yamanote';
  if(kind==='missing-source-railway')q.sourceRailway='';
  if(kind==='future-service-date')q.serviceDate='2027-11-16';
  if(kind==='reversed-direction')
    q.railDirection=q.railDirection==='odpt.RailDirection:Inbound'
      ?'odpt.RailDirection:Outbound':'odpt.RailDirection:Inbound';
  if(kind==='removed-validity'){
    q.timetableValidity='';q.timetableDateVerified=false;
  }
  if(kind==='opposite-calendar'){
    q.calendarType=p.calendarType==='weekday'?'holiday':'weekday';
    q.serviceId='odpt.Calendar:'+
      (q.calendarType==='weekday'?'Weekday':'SaturdayHoliday');
    q.timetableCalendar=q.serviceId;
  }
  return replay(q,target);
}
function isExpectedAllDateNumberBand(p,spec){
  if(!spec||spec.kind!=='vehicle'||!spec.iconSrc)return false;
  const rules=window.TrainNumberPngRanges;
  if(!rules||typeof rules.match!=='function')return false;
  const q={...p,serviceDate:'2027-11-16'};
  const match=rules.match(q.trainNumber,q.positionLineId,q);
  return !!(match&&match.dateScope==='all-dates'&&
    String(match.pngPath||'')===String(spec.iconSrc||''));
}

// Reuse the same production module loader from the live Edge audit; do not
// introduce a separate PNG selector or a second train-number authority.
module.exports={position,replay,calendarOf,window};

if(require.main===module){
const report={
  schemaVersion:1,serviceDate:date,
  scope:'explicit operating_dates source templates ONLY; reconstructed minimal SQL position; not total daily services, not live browser rendering',
  sampleRows:data.rows.length,
  sourceLineCount:0,distinctServiceKeys:0,
  sourceMappingLevelCounts:{},
  returnVehicleRows:0,returnNeutralRows:0,
  plannedReferenceRows:0,illustrativeReferenceRows:0,
  confirmedFormationRows:0,uniqueVisibleServiceKeys:0,
  imagePaths:[],byLine:{},negativeProbes:{},safetyIssues:[],
  caveats:[
    'Source date membership does not prove every day of a broad timetable.',
    'Extra adapter fields, issued vehiclePlan evidence and browser image-load success are not replayed.',
    'A representative PNG never proves the exact model, livery, formation or physical train.'
  ]
};
const allKeys=new Set(),positiveKeys=new Set(),assetPaths=new Set();
const probes=[
  'wrong-display-line','missing-source-railway','future-service-date',
  'reversed-direction','removed-validity','opposite-calendar'
];
for(const kind of probes)report.negativeProbes[kind]={tested:0,stillImage:0,allowedStillImage:0,unexpectedStillImage:0};
for(const row of data.rows){
  const key=serviceKey(row);allKeys.add(key);
  const line=report.byLine[row.line_key]||(
    report.byLine[row.line_key]={sourceRows:0,referencePng:0,neutral:0,
      directSqlPng:0,modelCandidateRows:0,examples:[]});
  ++line.sourceRows;
  if(row.sql_png_path)++line.directSqlPng;
  if(row.sql_vehicle_type)++line.modelCandidateRows;
  const ml=row.mapping_level||'unresolved';
  report.sourceMappingLevelCounts[ml]=(report.sourceMappingLevelCounts[ml]||0)+1;
  const p=position(row),spec=replay(p);
  const isImage=spec && spec.kind==='vehicle' && !!spec.iconSrc;
  if(isImage){
    ++report.returnVehicleRows;++line.referencePng;positiveKeys.add(key);
    if(spec.planned===true)++report.plannedReferenceRows;
    if(spec.illustrative===true)++report.illustrativeReferenceRows;
    if(spec.planned!==true)
      report.safetyIssues.push({sourceId:row.source_id,number:row.train_number,
        issue:'unverified input acquired non-planned vehicle identity'});
    if(window.VehicleGaragePngMap.isQuarantinedPng(spec.iconSrc))
      report.safetyIssues.push({sourceId:row.source_id,issue:'quarantined PNG displayed'});
    if(!window.VehicleGaragePngMap.hasPng(spec.iconSrc) ||
      !fs.existsSync(path.resolve(root,'pages',spec.iconSrc)))
      report.safetyIssues.push({sourceId:row.source_id,issue:'PNG path missing in gallery'});
    assetPaths.add(spec.iconSrc);
    for(const kind of probes){
      ++report.negativeProbes[kind].tested;
      const probed=probe(p,kind);
      if(probed.kind==='vehicle'){
        ++report.negativeProbes[kind].stillImage;
        if(kind==='future-service-date'&&isExpectedAllDateNumberBand(p,probed))
          ++report.negativeProbes[kind].allowedStillImage;
        else ++report.negativeProbes[kind].unexpectedStillImage;
      }
    }
  }else{++report.returnNeutralRows;++line.neutral;}
  if(line.examples.length<4)line.examples.push({
    trainNumber:row.train_number,sourceId:row.source_id,
    mappingLevel:ml,timetableValidity:row.timetable_validity,
    result:isImage?'planned-png':'neutral',
    png:isImage?spec.iconSrc:null
  });
}
report.sourceLineCount=Object.keys(report.byLine).length;
report.distinctServiceKeys=allKeys.size;
report.uniqueVisibleServiceKeys=positiveKeys.size;
report.imagePaths=[...assetPaths].sort();
if(report.returnVehicleRows+report.returnNeutralRows!==report.sampleRows)
  report.safetyIssues.push({issue:'not all samples classified'});
for(const kind of ['wrong-display-line','missing-source-railway','future-service-date']){
  if(report.negativeProbes[kind].unexpectedStillImage>0)
    report.safetyIssues.push({issue:'source boundary not enforced',probe:kind});
}
console.log(JSON.stringify(report,null,2));
if(strict && report.safetyIssues.length)process.exitCode=1;
}
