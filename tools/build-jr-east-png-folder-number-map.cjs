'use strict';
/* Derived read-only JR East PNG / train-number source audit.
 * This is NOT a third runtime authority. node tools/build-jr-east-png-folder-number-map.cjs --check|--write */
function build(index,current,sources){
 if(index.edition!=='2611'||index.pngIndex.length!==601||current.date!=='2026-11-16')
  throw Error('Unsupported source editions');
 const images=index.pngIndex.filter(x=>x.operatorDirectory==='JR東日本');
 if(images.length!==131)throw Error('JR East PNG inventory changed');
 const byProof=new Map([...current.mapped,...current.activeWithoutNumber].map(x=>[x.png,x.fleetEvidence]));
 const load=src=>{const root={};new Function('window',src)(root);return root;};
 const gono=load(sources.gono).JREastGonoNumberIndex202611;
 const iiyama=load(sources.iiyama).JREastIiyamaNumberIndex202611;
 const senzan=load(sources.senzan).JREastSenzanNumberIndex202611;
 const tazawako=load(sources.tazawako).JREastTazawakoNumberIndex202611;
 const suigun=load(sources.suigun).JREastSuigunNumberIndex202611;
 const tadami=load(sources.tadami).JREastTadamiNumberIndex202611;
 const yamagata=load(sources.yamagata).JREastYamagataNumberIndex202611;
 const isHoliday=d=>{
  const wd=new Date(d+'T12:00:00Z').getUTCDay();
  return wd===0||wd===6||d==='2026-11-03'||d==='2026-11-23';
 };
 const historic=new Set(['JR東日本_205系_1100番台_鶴見線.png',
  'JR東日本_209系_3000番台.png','JR東日本_209系_3100番台.png']);
 const nonPassenger=new Set(['JR東日本_E926形_East-i.png',
  'JR東日本_FV-E991系_HYBARI.png']);
 const specialCaution={
  'JR東日本_E131系_長野地区.png':'Autumn 2026 introduction announced, not proof of each November ordinary train.',
  'JR東日本_E235系_0番台_B31編成_中央・総武線.png':'Transfer/testing does not establish dated B/C passenger workings.',
  'JR東日本_GV-E400系_米坂線.png':'Yonesaka-specific art must not inherit Gono/Uetsu GV-E400 numbers.',
  'JR東日本_E233系_5000番台.png':'Alternate-only file, not a selectable standard PNG.',
  'JR東日本_209系_500番台_京葉線.png':'Current specific formation and livery requires a dated per-asset check.',
  'JR東日本_E501系_さきがけ.png':'Alternative SAKIGAKE artwork: verify exact appearance independently.',
  'JR東日本_E231系_0番台_中央・総武線各駅停車.png':'Do not substitute early 0-series for currently verified 500-series or E235 candidates.'
 };
 function datedFor(png){
  const name=png.split('/').pop(),groups=new Map();
  function add(line,number,dir,date,url,service,kind){
   const key=line+'|'+number+'|'+dir;
   let x=groups.get(key);
   if(!x){x={lineId:line,trainNumber:number,direction:dir,serviceName:service,
     kind,sourceUrl:url,operatingDates:[],referenceOnly:true,authorizesRuntimePNG:false,
     actualVehicleConfirmed:false};groups.set(key,x);}
   x.operatingDates.push(date);
  }
  for(let n=1;n<=30;n++){
   const date='2026-11-'+String(n).padStart(2,'0');
   const cal=isHoliday(date)?'SaturdayHoliday':'Weekday';
   if(name.startsWith('JR東日本_HB-E300系_リゾートしらかみ「橅」_')){
    for(const [number,dir] of [['8521D','Outbound'],['8522D','Inbound'],['8524D','Inbound'],['8525D','Outbound']]){
     const x=gono.verify(number,'odpt.Railway:JR-East.Gono',dir,'Rapid',cal,date);
     if(x&&x.livery==='buna')add('Gono',number,dir,date,
       'https://www.jreast.co.jp/railway/joyful/shirakami.html',x.serviceName,
       'exact_dated_buna_service_both_ends_ambiguous');
    }
   }
   if(name.startsWith('JR東日本_HB-E300系_SATONO_')){
    for(const [number,dir] of [['8821D','Outbound'],['8822D','Inbound']]){
     const x=senzan.resolve({positionLineId:'Senzan',displayLineId:'Senzan',
       sourceRailway:'odpt.Railway:JR-East.Senzan',positionSource:'supabase-train-run',
       estimated:true,serviceDate:date,calendarType:'odpt.Calendar:'+cal,
       trainNumber:number,railDirection:dir,trainType:'Rapid',
       trainOperator:'JR-East',vehicleIdentityStatus:'UNRESOLVED'});
     if(x&&x.serviceKind==='satono')add('Senzan',number,dir,date,x.sourceUrl,
       'いろどりSATONO','dated_planned_artwork_reference_only');
    }
   }
   if(name==='JR東日本_キハ110系_おいこっと.png'||
      name==='JR東日本_キハ40・48形_越乃Shu＊Kura.png'){
    const oykot=name.includes('おいこっと');
    const numbers=oykot?[['8140D','Inbound'],['8141D','Outbound']]:
                        [['8124D','Inbound'],['8133D','Outbound']];
    for(const [number,dir] of numbers){
     const x=iiyama.verify(number,'odpt.Railway:JR-East.Iiyama',dir,'Rapid',cal,date);
     if(x&&x.kind===(oykot?'oykot':'shukura'))add('Iiyama',number,dir,date,
       oykot?'https://www.jreast.co.jp/railway/joyful/oykot.html':
       'https://timetables.jreast.co.jp/2611/timetable-v/229u1.html',
       x.serviceName,'date_verified_named_service_not_formation');
    }
   }
  }
  return [...groups.values()].sort((a,b)=>a.trainNumber.localeCompare(b.trainNumber));
 }

 // These items are derived from existing runtime source validators, not new live mappings.
 function adapterRefs(name){
  const out=[];
  const add=(line,cal,dir,num,url,guard,dates)=>{
   out.push({lineId:line,calendar:cal,direction:dir,trainNumber:num,
    sourceUrl:url,requiredGuards:guard,operatingDates:dates||[],
    referenceOnly:true,actualVehicleConfirmed:false,authorizesRuntimePNG:false});
  };
  const fmt=(id,dir,cal,withP=false)=>
   'https://timetables.jreast.co.jp/2611/timetable-v/'+id+
    (dir==='Inbound'?'u':'d')+(cal==='Weekday'?'1':'2')+(withP?'p':'')+'.html';
  if(name==='JR東日本_701系_5000番台.png'){
   for(const cal of ['Weekday','SaturdayHoliday'])for(const dir of ['Inbound','Outbound']){
    for(const number of Object.keys(tazawako.source[cal][dir])){
     add('Tazawako',cal,dir,number,fmt('258',dir,cal,true),
      'Official 8xxM number + exact stops, date, railway and calendar verified by original runtime adapter');
    }
   }
  }
  if(name==='JR東日本_キハE130系0番台.png'){
   for(const line of ['Suigun','SuigunBranch'])
   for(const cal of ['Weekday','SaturdayHoliday'])for(const dir of ['Inbound','Outbound']){
    for(const number of suigun.listNumbers(line,cal,dir)){
     let sourceUrl='';const days=[];
     for(let day=1;day<=30;day++){
      const date='2026-11-'+String(day).padStart(2,'0');
      if((isHoliday(date)?'SaturdayHoliday':'Weekday')!==cal)continue;
      const p={positionLineId:line,displayLineId:line,
       sourceRailway:'odpt.Railway:JR-East.'+line,positionSource:'supabase-train-run',
       estimated:true,serviceDate:date,calendarType:'odpt.Calendar:'+cal,
       railDirection:dir,trainNumber:number,trainType:'Local',trainOperator:'JR-East',
       vehicleIdentityStatus:'UNRESOLVED'};
      const ref=suigun.resolve(p);
      if(ref&&ref.illustrationPng.endsWith('/'+name)){days.push(date);sourceUrl=ref.sourceUrl;}
     }
     if(days.length)add(line,cal,dir,number,sourceUrl,
      'Exact source line, calendar, day, direction, service kind, non-Kazekko and vehicle identity guards',
      days);
    }
   }
  }
  if(name==='JR東日本_キハE120形_只見線色.png'||name==='JR東日本_キハ110系（只見線）.png'){
   for(const cal of ['Weekday','SaturdayHoliday'])for(const dir of ['Inbound','Outbound']){
    for(const number of tadami.regular[cal][dir]){
     add('Tadami',cal,dir,number,fmt('262',dir,cal),
      'Original Tadami adapter requires exact timetable stops plus segment position and east/west image territory');
    }
   }
  }
  return out.sort((a,b)=>a.lineId.localeCompare(b.lineId)||a.trainNumber.localeCompare(b.trainNumber)||a.calendar.localeCompare(b.calendar));
 }
 function mixedYamagataCandidates(name){
  if(!['JR東日本_701系_5500番台.png','JR東日本_719系_5000番台.png',
    'JR東日本_E723系_5000番台.png'].includes(name))return [];
  const rows=[];
  for(const cal of ['Weekday','SaturdayHoliday'])
   for(const [number,rec] of Object.entries(yamagata.roster[cal])){
    rows.push({lineId:'Yamagata',calendar:cal,trainNumber:number,direction:rec[0],
      possibleModels:yamagata.candidates.slice(),sourceUrl:
       'https://timetables.jreast.co.jp/2611/timetable-v/249'+
       (rec[0]==='Inbound'?'u':'d')+(cal==='Weekday'?'1':'2')+'.html',
      evidenceGrade:'mixed_fleet_line_number_only_NOT_model_assignment',
      referenceOnly:true,authorizesRuntimePNG:false,actualVehicleConfirmed:false});
   }
  return rows.sort((a,b)=>a.trainNumber.localeCompare(b.trainNumber)||a.calendar.localeCompare(b.calendar));
 }
 function datedYamagataObservation(name){
  if(name!=='JR東日本_E723系_5000番台.png')return [];
  return ['1426M','424M'].map(number=>{
   const rec=yamagata.roster.Weekday[number];
   if(!rec)throw Error('Missing dated Yamagata number in official 2611 index: '+number);
   return {lineId:'Yamagata',trainNumber:number,serviceDate:'2026-11-13',
    direction:rec[0],calendar:'Weekday',sourceUrl:'https://4gousya.net/forums/post/137048',
    sourceKind:'third_party_eyewitness_report_NOT_JR_official_formation_confirmation',
    reportDetail:number==='1426M'?'B-4+B-2 reported':'B-3 reported',
    referenceOnly:true,authorizesRuntimePNG:false,actualVehicleConfirmed:false};
  });
 }

 const records=images.map(a=>{
  const name=a.path.split('/').pop(),fleet=byProof.get(a.path)||null;
  const rules=a.directNumberRules.filter(r=>r.actualVehicleConfirmed===false&&
    (!r.validFrom||r.validFrom<='2026-11-16')&&
    (!r.validTo||r.validTo>='2026-11-16'));
  const rosters=a.runtimeNumberRosters.filter(r=>r.actualVehicleConfirmed===false);
  const dated=datedFor(a.path),adapter=adapterRefs(name),
   mixed=mixedYamagataCandidates(name),observed=datedYamagataObservation(name),
   hasNumbers=!!(rules.length+rosters.length+dated.length+adapter.length+observed.length);
  const status=a.quarantined?'quarantined':
    historic.has(name)?'historic_not_2026_service':
    nonPassenger.has(name)?'non_passenger_stock':
    fleet?(hasNumbers?'active_family_with_number_reference':'active_family_without_number_reference'):
    hasNumbers?'number_source_pending_fleet_verification':'no_qualified_number_mapping';
  return {
   png:a.path,name,models:a.canonicalModels,lineScopes:a.lineScopes,
   status,note:a.quarantined?'Unsafe visual identity: canonical gallery quarantine':
    historic.has(name)?'Retired from depicted historical route; 2026 current line uses different stock':
    nonPassenger.has(name)?'Inspection or experimental stock, not scheduled passenger service':
    specialCaution[name]||(!fleet?'Current image/livery identity and train number not sufficiently established':
      hasNumbers?'Number association is reference-only, not an observed physical set':
      'Operating fleet family verified, but individual numbered services not mapped'),
   fleetEvidence:fleet?{sourceUrl:fleet.evidence_source_url,
      scope:fleet.evidence_scope,note:fleet.note}:null,
   originalNumberRules:rules.map(r=>({ruleId:r.ruleId,authority:r.authority,
     grade:r.grade,lineIds:r.lineIds,model:r.model,numberFormat:r.numberFormat,
     minNumber:r.minNumber,maxNumber:r.maxNumber,suffix:r.suffix,
     exactSingleNumber:r.exactSingleNumber||null,
     explicitDocumentedNumberCount:r.explicitDocumentedNumberCount||0,
     explicitShortNumberList:r.explicitShortNumberList||[],
     sourceUrl:r.sourceUrl||null,validFrom:r.validFrom||null,validTo:r.validTo||null,
     requiresExactRoster:r.requiresExactRoster===true,
     requiresCompatiblePlan:r.requiresCompatiblePlan===true,
     actualVehicleConfirmed:false})),
   originalRuntimeNumberRosters:rosters.map(r=>({authority:r.authority,lineId:r.lineId,
     calendarType:r.calendarType,numberFamily:r.numberFamily,
     exactContiguousBands:r.exactContiguousBands,sourceUrl:r.sourceUrl,
     validFrom:r.validFrom,validTo:r.validTo,actualVehicleConfirmed:false})),
   datedNamedServiceNumbers:dated,
   existingAdapterExactNumberRefs:adapter,
   ambiguousYamagataLineNumberCandidates:mixed,
   thirdPartyOneDateObservedRefs:observed,
   actualVehicleConfirmed:false,allowSelectByBandAlone:false};
 });
 const count=s=>records.filter(r=>r.status===s).length;
 const summary={totalPng:records.length,
   activeWithNumberReference:count('active_family_with_number_reference'),
   activeWithoutNumberReference:count('active_family_without_number_reference'),
   priorNumberRefNeedsCurrentVerification:count('number_source_pending_fleet_verification'),
   historical:count('historic_not_2026_service'),
   nonPassenger:count('non_passenger_stock'),
   quarantined:count('quarantined'),
   remainingUnverified:count('no_qualified_number_mapping'),
   withSpecificDatedNamedService:records.filter(x=>x.datedNamedServiceNumbers.length).length,
   datedNumberServiceGroups:records.reduce((n,r)=>n+r.datedNamedServiceNumbers.length,0),
   observedPhysicalCarsets:0,
   pngsRecoveredFromExistingRuntimeAdapter:records.filter(x=>x.existingAdapterExactNumberRefs.length).length,
   sourceAdapterNumberRows:records.reduce((n,x)=>n+x.existingAdapterExactNumberRefs.length,0),
   pngsWithMixedYamagataCandidates:records.filter(x=>x.ambiguousYamagataLineNumberCandidates.length).length,
   datedE723EyewitnessNumberRows:records.reduce((n,x)=>n+x.thirdPartyOneDateObservedRefs.length,0)};
 if(summary.totalPng!==131||summary.activeWithNumberReference+
   summary.activeWithoutNumberReference+summary.priorNumberRefNeedsCurrentVerification+
   summary.historical+summary.nonPassenger+summary.quarantined+
   summary.remainingUnverified!==131)throw Error('Status coverage integrity failure');
 return {schemaVersion:1,edition:'2611',asOf:'2026-11-16',
  role:'Read-only exhaustive JR East PNG -> sourced number scopes. NOT runtime dispatch authority.',
  guards:['Never infer that all min/max numbers exist or use the PNG',
    'Never convert model-family operation into per-train physical formation confirmation',
    'Calendar, railway, direction, service type and exact source identity remain mandatory',
    'Shirakami Buna end-A vs end-B image choice not established by train number'],
  sources:['data/audits/png-to-train-number-index-2611.json',
    'data/audits/png-current-service-number-map-20261116.json',
    'data/timetables/jreast-gono-2611-number-index.js',
    'data/timetables/jreast-senzan-2611-number-index.js',
    'data/timetables/jreast-iiyama-2611-number-index.js',
    'data/timetables/jreast-tazawako-2611-number-index.js',
    'data/timetables/jreast-suigun-2611-number-index.js',
    'data/timetables/jreast-tadami-2611-number-index.js',
    'data/timetables/jreast-yamagata-2611-number-index.js'],
  summary,records};
}
function csvOf(a){
 const rows=[['png','status','models','lines','ruleCount','originalNumberRanges',
   'datedSpecialNumbers','datedSpecialOperatingDays','existingAdapterExactNumberRefs',
   'ambiguousYamagataLineCandidates','oneDateObservedNumbers','note','fleetEvidenceUrl','observedCarset']];
 const esc=x=>{const s=String(x==null?'':x);
   return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 for(const r of a.records){
  const ranges=r.originalNumberRules.map(x=>
   (x.exactSingleNumber||(x.minNumber===x.maxNumber?String(x.minNumber):
    String(x.minNumber)+'~'+String(x.maxNumber))+(x.suffix||''))+'@'+x.lineIds.join('/'));
  const owner=r.originalRuntimeNumberRosters.map(x=>x.numberFamily+'@'+x.lineId+'('+x.calendarType+')');
  rows.push([r.png,r.status,r.models.join(' | '),r.lineScopes.join(' | '),
   r.originalNumberRules.length+r.originalRuntimeNumberRosters.length+
    r.datedNamedServiceNumbers.length+r.existingAdapterExactNumberRefs.length+
    r.thirdPartyOneDateObservedRefs.length,
   ranges.concat(owner).join(' | '),
   r.datedNamedServiceNumbers.map(x=>x.trainNumber+'@'+x.lineId).join(' | '),
   r.datedNamedServiceNumbers.map(x=>x.trainNumber+':'+x.operatingDates.join(';')).join(' | '),
   r.existingAdapterExactNumberRefs.map(x=>x.trainNumber+'@'+x.lineId+'/'+x.calendar+
    (x.operatingDates.length?' ['+x.operatingDates.join(';')+']':'')).join(' | '),
   r.ambiguousYamagataLineNumberCandidates.map(x=>x.trainNumber+'/'+x.calendar).join(' | '),
   r.thirdPartyOneDateObservedRefs.map(x=>x.trainNumber+'@'+x.serviceDate).join(' | '),
   r.note,r.fleetEvidence?.sourceUrl||'','no']);
 }
 return '\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n')+'\n';
}
module.exports={build,csvOf};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const report=build(JSON.parse(read('data/audits/png-to-train-number-index-2611.json')),
   JSON.parse(read('data/audits/png-current-service-number-map-20261116.json')),
   {gono:read('data/timetables/jreast-gono-2611-number-index.js'),
    iiyama:read('data/timetables/jreast-iiyama-2611-number-index.js'),
    senzan:read('data/timetables/jreast-senzan-2611-number-index.js'),
    tazawako:read('data/timetables/jreast-tazawako-2611-number-index.js'),
    suigun:read('data/timetables/jreast-suigun-2611-number-index.js'),
    tadami:read('data/timetables/jreast-tadami-2611-number-index.js'),
    yamagata:read('data/timetables/jreast-yamagata-2611-number-index.js')});
 const jsonPath='data/audits/jr-east-png-folder-number-map-2611.json',
   csvPath='data/audits/jr-east-png-folder-number-map-2611.csv';
 const j=JSON.stringify(report,null,2)+'\n',c=csvOf(report);
 if(process.argv.includes('--write')){fs.writeFileSync(path.join(root,jsonPath),j);
   fs.writeFileSync(path.join(root,csvPath),c);}
 if(process.argv.includes('--check')&&(read(jsonPath)!==j||read(csvPath)!==c))
  throw Error('JR East PNG map artifacts are stale');
 console.log(JSON.stringify(report.summary,null,2));
}
