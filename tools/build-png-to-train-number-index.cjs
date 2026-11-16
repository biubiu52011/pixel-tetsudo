'use strict';
/*
 * PNG -> sourced full train-number / bounded-range lookup for the 601 vehicle
 * gallery files. This is a GENERATED, READ-ONLY reverse index.
 *
 * It NEVER authorizes a vehicle image on its own. Live rendering keeps the
 * existing TrainNumberPngRanges, SQL and TrainVehicle guards as the owner.
 * Numeric min/max are scope bounds, not evidence every intervening number
 * exists or uses that model.
 *
 * node tools/build-png-to-train-number-index.cjs --write
 * node tools/build-png-to-train-number-index.cjs --check
 * node tools/build-png-to-train-number-index.cjs --lookup=JR東海/JR東海_383系.png
 */
function buildIndex(input) {
  const {garageSource,rangesSource,catalog,datedSource} = input;
  if(catalog.edition!=='2611'||datedSource.edition!=='2611')
    throw Error('Unexpected existing source catalog edition');
  function instrument(source,needle,insert){
    if(!source.includes(needle))throw Error('Existing number/gallery owner moved: '+needle);
    return source.replace(needle,insert+needle);
  }
  // Observe actual runtime internals in an isolated *generator* context.
  // No monkey patch is written to the website or canonical owners.
  const win={},silence={log(){},warn(){},debug(){},error(){}};
  const garageCode=instrument(garageSource,
    'root.VehicleGaragePngMap=Object.freeze({',
    'root.__pngIndexGarageRows=table.slice(); root.__pngIndexQuarantine=Object.keys(quarantinedPng);');
  new Function('window','console',garageCode)(win,silence);
  const rangeCode=instrument(rangesSource,
    'root.TrainNumberPngRanges=Object.freeze({',
    'root.__pngIndexTobuNumbers=tobuSkytreeNumbers;');
  new Function('window','console',rangeCode)(win,silence);
  const prefix='images/列车/';
  const normalized=(p)=>String(p||'').replace(/^(?:\.\.\/|\.\/|\/)+/,'');
  const rows=win.__pngIndexGarageRows;
  if(!Array.isArray(rows)||!win.TrainNumberPngRanges||!win.VehicleGaragePngMap)
    throw Error('Runtime gallery or number-mapper unavailable');
  const byPath=new Map();
  const quarantine=new Set((win.__pngIndexQuarantine||[]).map(p=>prefix+p));
  for(const row of rows){
    const path=prefix+row[2];
    let asset=byPath.get(path);
    if(!asset){
      asset={path,operatorDirectory:String(row[2]).split('/')[0],
        canonicalModels:[],lineScopes:[],galleryIds:[],
        quarantined:quarantine.has(path),
        status:'no_verified_number_mapping',
        directNumberRules:[],runtimeNumberRosters:[],historicalNumberedSources:[]};
      byPath.set(path,asset);
    }
    if(!asset.galleryIds.includes(row[0]))asset.galleryIds.push(row[0]);
    if(!asset.canonicalModels.includes(row[1]))asset.canonicalModels.push(row[1]);
    for(const line of String(row[3]||'').split('|').filter(Boolean))
      if(!asset.lineScopes.includes(line))asset.lineScopes.push(line);
  }
  if(byPath.size!==601)
    throw Error('Physical gallery inventory changed: expected 601, got '+byPath.size);
  const unknownPaths=[];
  const get=(p,ruleId)=>{
    const normalizedPath=normalized(p);
    const record=byPath.get(normalizedPath);
    if(!record){unknownPaths.push({path:normalizedPath,ruleId});return null;}
    return record;
  };
  // 421 SQL/JS rules from the EXISTING shared verified source catalog.
  // Preserve explicit-number rosters and numeric bounds as distinct fields.
  for(const rule of catalog.rules){
    const asset=get(rule.png,rule.id);if(!asset)continue;
    const explicit={};
    for(const key of ['published_numbers','weekday_numbers',
      'holiday_numbers','official_month_numbers']){
      if(rule[key] && (Array.isArray(rule[key]) || typeof rule[key]==='object'))
        explicit[key]=rule[key];
    }
    const exact=rule.min===rule.max && /^\d+$/.test(String(rule.min))
      ? String(rule.min)+String(rule.suffix||'') : null;
    const hasRoster=!!(rule.published_numbers?.length ||
      rule.weekday_numbers?.length || rule.holiday_numbers?.length ||
      (rule.official_month_numbers&&Object.keys(rule.official_month_numbers).length));
    const grade=hasRoster?'explicit_number_roster' :
      exact?'single_number_bounds' : 'guarded_number_bounds_only';
    asset.directNumberRules.push({
      ruleId:rule.id,authority:rule.origin,grade,
      lineIds:rule.line_ids||[],model:rule.model||'',
      numberFormat:rule.format||'full',
      minNumber:rule.min,maxNumber:rule.max,suffix:rule.suffix||'',
      exactSingleNumber:exact,
      explicitNumbers:explicit,
      sourceUrl:rule.source_url||null,
      validFrom:rule.valid_from||null,validTo:rule.valid_to||null,
      evidenceKind:rule.evidence_kind||null,
      requiresExactRoster:rule.requires_exact_roster===true,
      requiresCompatiblePlan:rule.requires_compatible_plan===true,
      runtimeGuards:rule.runtime_guards||null,
      actualVehicleConfirmed:rule.actual_vehicle_confirmed===true
    });
  }
  // The Tobu 2611 exact-number roster exists IN the actual front-end module,
  // but its helper-generated PNGs are not represented by static rule objects.
  // Resolve only its PUBLISHED numbers through the original matcher, with
  // calendar/line/source/number/type guards. Do not fill ranges between them.
  const tobuNumbers=win.__pngIndexTobuNumbers;
  const tobuCalendarDates={weekday:'2026-11-16',holiday:'2026-11-15'};
  let tobuAccepted=0,tobuMissed=0;
  const rosterGroups=new Map();
  for(const calendar of ['weekday','holiday']){
    const familyGroups=tobuNumbers[calendar]||{};
    for(const [family,numbers] of Object.entries(familyGroups)){
      for(const lineId of ['TobuSkytree','TobuNikko']){
        if(lineId==='TobuNikko'&&!['revaty','spacia','spacia_x'].includes(family))continue;
        const type=family==='ordinary'?'Local':
          family==='th_liner'?'THLiner':'LimitedExpress';
        for(const number of numbers){
          const data={
            trainNumber:number,positionLineId:lineId,displayLineId:lineId,
            sourceRailway:lineId==='TobuNikko'
              ?'odpt.Railway:Tobu.Nikko':'odpt.Railway:Tobu.TobuSkytree',
            trainOperator:'Tobu',trainType:'odpt.TrainType:Tobu.'+type,
            calendarType:calendar,serviceDate:tobuCalendarDates[calendar],
            positionSource:'supabase-train-run',estimated:true,
            vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
            vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false
          };
          const matched=win.TrainNumberPngRanges.match(number,lineId,data);
          if(!matched||!matched.pngPath){++tobuMissed;continue;}
          const asset=get(matched.pngPath,'runtime-tobu-'+family);
          if(!asset||asset.quarantined){++tobuMissed;continue;}
          if(!matched.planned || matched.actualVehicleConfirmed!==false)
            throw Error('Existing Tobu matcher role changed unexpectedly');
          ++tobuAccepted;
          const id=[asset.path,lineId,calendar,family,matched.referenceCorridor||''].join('|');
          let g=rosterGroups.get(id);
          if(!g){
            g={authority:'existing_frontend_helper',lineId,
              calendarType:calendar,numberFamily:family,
              corridor:matched.referenceCorridor||null,
              model:matched.model||null,
              sourceUrl:matched.sourceUrl||null,
              validFrom:'2026-11-02',validTo:'2026-11-30',
              numberFormat:'full_exact',numbers:[],
              referenceOnly:true,illustrative:true,actualVehicleConfirmed:false,
              guardDescription:'Production match() additionally checks operator, railway, display line, train type, evidence and identity'};
            rosterGroups.set(id,g);
            asset.runtimeNumberRosters.push(g);
          }
          g.numbers.push(number);
        }
      }
    }
  }
  // Historic SOURCE-level SQL vehicle evidence: keep its original number,
  // operator, calendar, direction and revision, never promote a July source
  // to an authorized November carset or a broad train number range.
  const historicalGroups=new Map();
  for(const source of datedSource.rows){
    if(!source.vehicle_artwork_path||source.mapping_level!=='dated_schedule_rule')
      continue;
    const asset=get(source.vehicle_artwork_path,'dated-source-'+source.source_template_id);
    if(!asset||asset.quarantined)continue;
    const id=[asset.path,source.line_key,source.calendar_urn,
      source.source_revision_date,source.vehicle_type].join('|');
    let g=historicalGroups.get(id);
    if(!g){
      g={authority:'source_resolution_sql',lineId:source.line_key,
        calendarUrn:source.calendar_urn,model:source.vehicle_type||null,
        sourceRevisionDate:source.source_revision_date||null,
        sourceUrl:source.vehicle_source_url||null,
        sourceRole:'dated_schedule_rule',sourceNumbers:[],
        dateVerifiedServiceNumbers:[],referenceOnly:true,
        actualVehicleConfirmed:false,
        note:'Source timetable association only; NULL operating_dates does not certify 2026-11-16'}
      historicalGroups.set(id,g);asset.historicalNumberedSources.push(g);
    }
    if(!g.sourceNumbers.includes(source.train_number))g.sourceNumbers.push(source.train_number);
    if(source.listed_on_2026_11_16===true)
      g.dateVerifiedServiceNumbers.push(source.train_number);
  }
  const assets=[...byPath.values()].sort((a,b)=>a.path.localeCompare(b.path));
  let direct=0,runtime=0,historical=0,any=0,none=0,quarantined=0;
  for(const asset of assets){
    if(asset.directNumberRules.length)++direct;
    if(asset.runtimeNumberRosters.length)++runtime;
    if(asset.historicalNumberedSources.length)++historical;
    if(asset.quarantined){++quarantined;asset.status='quarantined_visual_identity';}
    else if(asset.directNumberRules.length||asset.runtimeNumberRosters.length){
      ++any;asset.status='number_scoped_reference_requires_runtime_evidence';
    }else if(asset.historicalNumberedSources.length){
      ++any;asset.status='historical_source_number_only_not_current_verified';
    }else{++none;asset.status='no_verified_number_mapping';}
  }
  if(catalog.rules.length!==421||datedSource.rows.length!==200)
    throw Error('Source evidence counts changed; refresh and reassess');
  // Quarantined paths may still have suspicious legacy rules; keep them
  // visible for remediation but never declare them authorized for display.
  return {
    schemaVersion:1,edition:'2611',snapshotDate:'2026-11-16',
    sourceOfTruth:'derived read-only PNG-first index: never consumed as train identity authority',
    sources:[
      'data/timetables/vehicle-garage-png-map.js',
      'data/audits/train-number-png-catalog-2611.json',
      'data/timetables/train-number-png-ranges.js',
      'data/audits/train-png-dated-source-links-2611.json'
    ],
    semantics:{
      minMax:'CANDIDATE BOUNDS only, never all numbers inside the range',
      directNumbers:'Exact number lists still need source/line/date/calendar/formation guards',
      historical:'Historical dated_schedule_rule is source-scoped, not proof that that train operated today',
      Tobu:'Helper rules are existing production references; family and operator are not physical vehicle confirmations',
      missing:'No supported number evidence for this image; preserve neutral marker',
      observedTrainset:'No map here asserts an actual vehicle/carset or livery'
    },
    summary:{
      galleryPng:assets.length,catalogRules:catalog.rules.length,
      imagesInDirectRules:direct,imagesInTobuRuntimeRosters:runtime,
      imagesWithHistoricalSqlLinks:historical,
      imagesWithAnyNumberReferenceIncludingHistory:any,
      quarantinedImages:quarantined,imagesWithNoNumberEvidence:none,
      tobuMatcherAcceptedCalls:tobuAccepted,tobuMatcherRejectedCalls:tobuMissed,
      missingPhysicalPngReferences:unknownPaths.length
    },
    missingPhysicalPngReferences:unknownPaths,
    pngIndex:assets
  };
}
if(typeof module!=='undefined')module.exports={buildIndex};
if(typeof require==='function' && require.main===module){
  const fs=require('node:fs'),path=require('node:path');
  const root=path.resolve(__dirname,'..');
  const get=p=>fs.readFileSync(path.join(root,p),'utf8');
  const index=buildIndex({
    garageSource:get('data/timetables/vehicle-garage-png-map.js'),
    rangesSource:get('data/timetables/train-number-png-ranges.js'),
    catalog:JSON.parse(get('data/audits/train-number-png-catalog-2611.json')),
    datedSource:JSON.parse(get('data/audits/train-png-dated-source-links-2611.json'))
  });
  const args=process.argv.slice(2);
  const target='data/audits/png-to-train-number-index-2611.json';
  const out=JSON.stringify(index,null,2)+'\n';
  if(args.includes('--write'))fs.writeFileSync(path.join(root,target),out);
  if(args.includes('--check')&&(!fs.existsSync(path.join(root,target))||
      get(target)!==out))throw Error('Generated PNG->number index is stale');
  const lookupArg=args.find(s=>s.startsWith('--lookup='));
  if(lookupArg){
    const query=lookupArg.slice('--lookup='.length);
    console.log(JSON.stringify(index.pngIndex.filter(p=>p.path.includes(query)),null,2));
  }else console.log(JSON.stringify(index.summary,null,2));
}
