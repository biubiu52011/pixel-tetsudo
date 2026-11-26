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
    'root.__pngIndexGarageRows=table.slice(); root.__pngIndexGarageAlternates=alternates.slice(); root.__pngIndexQuarantine=Object.keys(quarantinedPng);');
  new Function('window','console',garageCode)(win,silence);
  const rangeCode=instrument(rangesSource,
    'root.TrainNumberPngRanges=Object.freeze({',
    'root.__pngIndexTobuNumbers=tobuSkytreeNumbers; root.__pngIndexMetroThrough=tobuMetroThroughNumberRoster; root.__pngIndexJrcKansai202603=jrcKansai202603NumberRoster; root.__pngIndexJrcChuo202603=jrcChuo202603NumberRoster;');
  new Function('window','console',rangeCode)(win,silence);
  // 2611 M-03 guard fixtures: not claims that a train used these cars.
  // A shared S train number is insufficient if vehicle sources disagree.
  const metroContext={
    serviceDate:'2026-11-20',calendarType:'weekday',
    trainOperator:'TokyoMetro',
    sourceRailway:'odpt.Railway:TokyoMetro.Yurakucho'
  };
  const metroMatch=more=>win.TrainNumberPngRanges.match(
    'A1023S','Yurakucho',Object.assign({},metroContext,more));
  const m10000=metroMatch({realtimeVehicleType:'東京メトロ10000系'});
  const m17000=metroMatch({realtimeVehicleType:'東京メトロ17000系'});
  if(!m10000||!m10000.pngPath.endsWith('/東京メトロ_10000系.png')||
     !m17000||!m17000.pngPath.endsWith('/東京メトロ_17000系.png'))
    throw Error('M-03: explicit Metro model reference regressed');
  if(metroMatch({realtimeVehicleType:'東京メトロ10000系',
      realtimeDerivedVehicleType:'東京メトロ17000系'}) ||
     metroMatch({realtimeVehicleType:'東京メトロ10000系',
      vehiclePlan:{confirmed:true,models:['東京メトロ17000系']}}) ||
     metroMatch({vehiclePlan:{status:'PLANNED_MODEL',
      models:['東京メトロ10000系','東京メトロ17000系']}}))
    throw Error('M-03: contradictory Metro evidence must yield null');
  // T-01: a planned, single-model TWR reference must outrank the
  // optional 3/4-digit T display default. Distinct model sources must agree.
  // Fixture train numbers are synthetic guard checks, not live car assignments.
  const rinkaiContext={
    serviceDate:'2026-11-20',calendarType:'weekday',
    sourceRailway:'odpt.Railway:TWR.Rinkai',trainType:'Local',
    positionSource:'realtime-api',railDirection:'Inbound'
  };
  const rinkaiMatch=more=>win.TrainNumberPngRanges.match(
    '1638T','Rinkai',Object.assign({},rinkaiContext,more));
  const plan70={status:'PLANNED_MODEL',
    models:['東京臨海高速鉄道70-000形']};
  const plan71={status:'PLANNED_MODEL',
    models:['東京臨海高速鉄道71-000形']};
  const from70=rinkaiMatch({vehiclePlan:plan70});
  const from71=rinkaiMatch({vehiclePlan:plan71});
  if(!from70||from70.model!=='東京臨海高速鉄道70-000形' ||
     !from71||from71.model!=='東京臨海高速鉄道71-000形' ||
     rinkaiMatch({realtimeVehicleType:'東京臨海高速鉄道70-000形',
       vehiclePlan:plan71}) ||
     rinkaiMatch({vehiclePlan:{status:'PLANNED_MODEL',
       models:['東京臨海高速鉄道70-000形','東京臨海高速鉄道71-000形']}}))
    throw Error('T-01: TWR scoped model-plan or conflict regression');
  // T-01 provenance regression. SQL manual annotations are candidates,
  // not an independently verified single-model dispatch. A candidate must
  // suppress conflicting 3/4-digit T reference defaults, never authorize
  // a vehicle image. Realtime/confirmed plan examples are tested above.
  const rinkaiWeakSource={source:'sql-timetable-plan',
    evidenceRole:'unverified-source-candidate',
    status:'PLANNED_CANDIDATES'};
  const weak70=rinkaiMatch({vehiclePlan:Object.assign({},rinkaiWeakSource,
    {models:['東京臨海高速鉄道70-000形']})});
  const weak71=rinkaiMatch({vehiclePlan:Object.assign({},rinkaiWeakSource,
    {models:['東京臨海高速鉄道71-000形']})});
  const weakMixed=rinkaiMatch({vehiclePlan:Object.assign({},rinkaiWeakSource,
    {models:['東京臨海高速鉄道70-000形','東京臨海高速鉄道71-000形']})});
  const trusted70=rinkaiMatch({vehiclePlan:{
    status:'PLANNED_MODEL',models:['東京臨海高速鉄道70-000形'],
    source:'database-verified-published-plan',confirmed:true}});
  const weakAndRealtime=rinkaiMatch({
    realtimeVehicleType:'東京臨海高速鉄道70-000形',
    vehiclePlan:Object.assign({},rinkaiWeakSource,
      {models:['東京臨海高速鉄道71-000形']})});
  if(weak70||weak71||weakMixed ||
     !trusted70 || trusted70.model!=='東京臨海高速鉄道70-000形' ||
     !weakAndRealtime || weakAndRealtime.model!=='東京臨海高速鉄道70-000形')
    throw Error('T-01: undated SQL fleet candidate must not become a number PNG');
  // M-01/M-02: two inventory paths share one Git blob. Keep both
  // quarantined, with no train-number authorization.
  const duplicateToei=[
    '../images/列车/都営地下鉄/都営地下鉄_8500形（別）.png',
    '../images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png'
  ];
  if(duplicateToei.some(p=>!win.VehicleGaragePngMap.isQuarantinedPng(p)))
    throw Error('M-02: duplicate Toei PNG quarantine regressed');
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
  // The original gallery also declares one alternate-only physical file
  // outside the canonical entries. Keep it in the 601 PNG inventory but
  // NEVER treat its alternate-only alias as display authorization.
  for(const row of (win.__pngIndexGarageAlternates||[])){
    const physical=prefix+row[2];
    if(byPath.has(physical))continue;
    byPath.set(physical,{path:physical,
      operatorDirectory:String(row[2]).split('/')[0],
      canonicalModels:[String(row[1])],
      lineScopes:String(row[3]||'').split('|').filter(Boolean),
      galleryIds:[String(row[0])],alternateOnly:true,
      quarantined:quarantine.has(physical),
      status:'no_verified_number_mapping',
      directNumberRules:[],runtimeNumberRosters:[],historicalNumberedSources:[]});
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
  // 423 SQL/JS rules from the EXISTING shared verified source catalog.
  // Preserve explicit-number rosters and numeric bounds as distinct fields.
  for(const rule of catalog.rules){
    // Also project every explicit exact-model PNG choice into the READ-ONLY
    // evidence index. This is not permission to render either model from a
    // shared operating-number family; the runtime still requires corroboration.
    const variants=[{path:rule.png,model:rule.model||''}];
    for(const [model,path] of Object.entries(rule.runtime_guards?.exactModelArtworkMap||{})){
      const normalizedPath=normalized(path);
      if(!variants.some(v=>v.path===normalizedPath))
        variants.push({path:normalizedPath,model});
    }
    const targets=variants.map(v=>({asset:get(v.path,rule.id),model:v.model}))
      .filter(v=>!!v.asset);
    if(!targets.length)continue;
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
    for(const {asset,model} of targets)asset.directNumberRules.push({
      ruleId:rule.id,authority:rule.origin,grade,
      lineIds:rule.line_ids||[],model,
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
  // Separate exact service-number rosters already used by the same
  // front-end through-service matcher for Hibiya and Hanzomon. The Tokyu
  // DenEnToshi branch is excluded: its matcher explicitly lacks a certified
  // Tokyu-Metro exact timetable crosswalk and requires realtime input.
  for(const lineId of ['Hibiya','Hanzomon']){
    const groups=win.__pngIndexMetroThrough[lineId]||{};
    for(const calendar of ['weekday','holiday']){
      for(const number of groups[calendar]||[]){
        const rail=lineId==='Hibiya'
          ?'odpt.Railway:TokyoMetro.Hibiya':'odpt.Railway:TokyoMetro.Hanzomon';
        const data={
          trainNumber:number,positionLineId:lineId,displayLineId:lineId,
          sourceRailway:rail,trainOperator:'TokyoMetro',
          trainType:'odpt.TrainType:TokyoMetro.Local',
          calendarType:calendar,serviceDate:tobuCalendarDates[calendar],
          positionSource:'supabase-train-run',estimated:true,
          vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
          vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false
        };
        let result=win.TrainNumberPngRanges.match(number,lineId,data);
        // 仍由运行时完整番号和车种守卫裁定，不在反向索引另建名册。
        if(!result&&lineId==='Hibiya')result=win.TrainNumberPngRanges.match(number,lineId,
          {...data,trainType:'odpt.TrainType:TokyoMetro.TH-LINER'});
        if(!result||!result.pngPath)continue;
        const family=result.serviceFamily==='th_liner'?'th_liner':'through';
        const asset=get(result.pngPath,'runtime-metro-through-'+lineId);
        if(!asset||asset.quarantined)continue;
        if(result.planned!==true||result.actualVehicleConfirmed!==false)
          throw Error('Existing through matcher roles changed');
        ++tobuAccepted;
        const key=[asset.path,lineId,calendar,family,result.referenceCorridor||''].join('|');
        let group=rosterGroups.get(key);
        if(!group){
          group={authority:'existing_frontend_helper',lineId,
            calendarType:calendar,numberFamily:family,
            corridor:result.referenceCorridor||null,
            model:result.model||null,sourceUrl:result.sourceUrl||null,
            validFrom:'2026-11-02',validTo:'2026-11-30',
            numberFormat:'full_exact',numbers:[],
            referenceOnly:true,illustrative:true,actualVehicleConfirmed:false,
            guardDescription:'Existing through matcher enforces owner suffix, source railway, service date, operator, train type, image/model compatibility'};
          rosterGroups.set(key,group);asset.runtimeNumberRosters.push(group);
        }
        group.numbers.push(number);
      }
    }
  }
  // 浅草线新版官方名册使用同一运行时责任规则；历史SQL/静态JS条目不改写。
  const asakusa=win.TrainNumberPngRanges.toeiAsakusaOfficialRoster;
  const asakusaPng=get('../images/列车/都営地下鉄/都営地下鉄_5500形.png','runtime-asakusa-official');
  if(!asakusa||!asakusaPng||asakusaPng.quarantined)throw Error('Asakusa official evidence missing');
  for(const calendar of ['weekday','holiday']){
    const numbers=asakusa[calendar],date=calendar==='weekday'?'2026-11-26':'2026-11-29';
    for(const number of numbers){
      const match=win.TrainNumberPngRanges.match(number,'Asakusa',{
        trainNumber:number,positionLineId:'Asakusa',displayLineId:'Asakusa',
        trainOwner:'odpt.TrainOwner:Toei',trainOperator:'Toei',
        sourceRailway:'odpt.Railway:Toei.Asakusa',positionSource:'realtime-api',
        estimated:false,calendarType:calendar,serviceDate:date,vehicleIdentityStatus:'UNKNOWN'
      });
      if(!match||match.pngPath!=='../'+asakusaPng.path||match.actualVehicleConfirmed!==false||match.referenceOnly!==true)
        throw Error('Official Asakusa replay rejected '+calendar+' '+number);
    }
    asakusaPng.runtimeNumberRosters.push({authority:'official_operator_timetable_live_owner_guarded',
      lineId:'Asakusa',calendarType:calendar,numberFamily:'5500-live-owner-reference',corridor:null,
      model:'都営5500形',sourceUrl:asakusa.sourceUrl,validFrom:asakusa.sourceRevisionDate,validTo:null,
      numberFormat:'full_exact',numbers:numbers.slice(),referenceOnly:true,illustrative:true,
      actualVehicleConfirmed:false,guardDescription:'Requires exact full ODPT number, realtime Toei trainOwner, exact source railway and nonconflicting model; not future timetable verification'});
  }
  // JR Central Kansai 2026-03 exact public-number roster. The private source
  // supplies number/calendar/direction and vehicle family, but not a complete
  // all-stop timetable. Keep it as a finite runtime reference and replay the
  // production matcher's SQL/date/route guards for every number. Rapid Mie is
  // recorded by the front-end roster but deliberately has no PNG index entry
  // while its KiHa75 artwork remains under review.
  const jrcKansai=win.__pngIndexJrcKansai202603;
  const jrc315=get('../images/列车/JR東海/JR東海_315系.png',
    'runtime-jrc-kansai-315');
  if(!jrcKansai||!jrc315||jrc315.quarantined)
    throw Error('JR Central Kansai exact number roster unavailable');
  let jrcKansaiAccepted=0;
  const jrcDates={weekday:'2026-11-11',holiday:'2026-11-23'};
  const jrcRoute=['Nagoya','Hatta','Kuwana','Yokkaichi','Kameyama'];
  for(const calendar of ['weekday','holiday']){
    for(const direction of ['Outbound','Inbound']){
      const numbers=jrcKansai.ordinary315[calendar][direction]||[];
      const group={authority:'private_unofficial_exact_roster',
        lineId:'KansaiCentral',calendarType:calendar,
        direction,numberFamily:'ordinary-315',model:'315系',
        sourceUrl:calendar==='holiday'
          ?'https://yoke4000.main.jp/jru/kansaiH.html'
          :'https://yoke4000.main.jp/jru/kansaiW.html',
        validFrom:'2026-03-14',validTo:null,numberFormat:'full_exact',
        numbers:[],referenceOnly:true,illustrative:true,
        actualVehicleConfirmed:false,
        guardDescription:'Production match() additionally requires dated JR-Central SQL, exact source railway, calendar, direction, type and ordered canonical stops'};
      for(const number of numbers){
        const numeric=Number(String(number).slice(0,-1));
        const type=(numeric>=2350&&numeric<=2361)||
          (numeric>=5351&&numeric<=5361)?'SectionRapid':
          (numeric>=2300&&numeric<=2315)||
          (numeric>=5300&&numeric<=5315)?'Rapid':'Local';
        const stops=direction==='Outbound'?jrcRoute:jrcRoute.slice().reverse();
        const result=win.TrainNumberPngRanges.match(number,'KansaiCentral',{
          trainNumber:number,positionLineId:'KansaiCentral',
          displayLineId:'KansaiCentral',serviceDate:jrcDates[calendar],
          calendarType:calendar,positionSource:'supabase-train-run',
          estimated:true,officialNumberVerified:true,
          timetableDateVerified:true,timetableValidity:'date_verified',
          sourceRailway:'odpt.Railway:JR-Central.Kansai',
          trainOperator:'JR-Central',
          trainType:'odpt.TrainType:JR-Central.'+type,
          railDirection:'odpt.RailDirection:'+direction,
          scheduledStopKeys:stops
        });
        if(!result||result.pngPath!=='../images/列车/JR東海/JR東海_315系.png'||
           result.numberReference?.exactRoster!==true)
          throw Error('JR Central Kansai exact number rejected: '+
            calendar+' '+direction+' '+number);
        group.numbers.push(number);++jrcKansaiAccepted;
      }
      jrc315.runtimeNumberRosters.push(group);
    }
  }
  // JR Central Chuo 2026-03 exact public-number roster. As with Kansai,
  // this is a finite private-source reference rather than an all-stop
  // timetable or a physical formation observation. Replay the production
  // SQL/date/route guards for every 315 and 383 Home Liner number.
  const jrcChuo=win.__pngIndexJrcChuo202603;
  const jrcChuo315=get('../images/列车/JR東海/JR東海_315系.png',
    'runtime-jrc-chuo-315');
  const jrcChuo383=get('../images/列车/JR東海/JR東海_383系.png',
    'runtime-jrc-chuo-383');
  if(!jrcChuo||!jrcChuo315||jrcChuo315.quarantined||
     !jrcChuo383||jrcChuo383.quarantined)
    throw Error('JR Central Chuo exact number roster unavailable');
  let jrcChuo315Accepted=0,jrcChuo383Accepted=0;
  const chuoRoute=['Nagoya','JRC-TokaidoCentral-067'];
  for(let i=3;i<=20;i++)
    chuoRoute.push('JRC-ChuoCentral-'+String(i).padStart(3,'0'));
  for(const calendar of ['weekday','holiday']){
    for(const direction of ['Outbound','Inbound']){
      const stops=direction==='Outbound'?chuoRoute:chuoRoute.slice().reverse();
      const common={lineId:'ChuoCentral',calendarType:calendar,direction,
        validFrom:'2026-03-14',validTo:null,numberFormat:'full_exact',
        referenceOnly:true,illustrative:true,actualVehicleConfirmed:false,
        guardDescription:'Production match() additionally requires dated JR-Central SQL, exact source railway, calendar, direction, type and ordered canonical stops'};
      const sourceUrl='https://yoke4000.main.jp/jru/chuou'+
        (calendar==='holiday'?'H':'W')+(direction==='Outbound'?'D':'U')+'.html';
      const ordinary={...common,authority:'private_unofficial_exact_roster',
        numberFamily:'ordinary-315',model:'315系',sourceUrl,numbers:[]};
      for(const number of jrcChuo.ordinary315[calendar][direction]||[]){
        const result=win.TrainNumberPngRanges.match(number,'ChuoCentral',{
          trainNumber:number,positionLineId:'ChuoCentral',
          displayLineId:'ChuoCentral',serviceDate:jrcDates[calendar],
          calendarType:calendar,positionSource:'supabase-train-run',
          estimated:true,officialNumberVerified:true,
          timetableDateVerified:true,timetableValidity:'date_verified',
          sourceRailway:'odpt.Railway:JR-Central.Chuo',
          trainOperator:'JR-Central',
          trainType:'odpt.TrainType:JR-Central.Local',
          railDirection:'odpt.RailDirection:'+direction,
          scheduledStopKeys:stops
        });
        if(!result||result.pngPath!==
            '../images/列车/JR東海/JR東海_315系.png'||
           result.numberReference?.exactRoster!==true)
          throw Error('JR Central Chuo 315 exact number rejected: '+
            calendar+' '+direction+' '+number);
        ordinary.numbers.push(number);++jrcChuo315Accepted;
      }
      jrcChuo315.runtimeNumberRosters.push(ordinary);
      const liners=jrcChuo.homeLiner383[calendar][direction]||[];
      if(liners.length){
        const homeLiner={...common,authority:'private_unofficial_exact_roster',
          numberFamily:'home-liner-383',model:'383系',sourceUrl,numbers:[]};
        for(const number of liners){
          const result=win.TrainNumberPngRanges.match(number,'ChuoCentral',{
            trainNumber:number,positionLineId:'ChuoCentral',
            displayLineId:'ChuoCentral',serviceDate:jrcDates[calendar],
            calendarType:calendar,positionSource:'supabase-train-run',
            estimated:true,officialNumberVerified:true,
            timetableDateVerified:true,timetableValidity:'date_verified',
            sourceRailway:'odpt.Railway:JR-Central.Chuo',
            trainOperator:'JR-Central',
            trainType:'odpt.TrainType:JR-Central.HomeLiner',
            railDirection:'odpt.RailDirection:'+direction,
            scheduledStopKeys:stops
          });
          if(!result||result.pngPath!==
              '../images/列车/JR東海/JR東海_383系.png'||
             result.numberReference?.exactRoster!==true)
            throw Error('JR Central Chuo Home Liner exact number rejected: '+
              calendar+' '+direction+' '+number);
          homeLiner.numbers.push(number);++jrcChuo383Accepted;
        }
        jrcChuo383.runtimeNumberRosters.push(homeLiner);
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
  // Compact ONLY CONSECUTIVE already-present explicit numbers. The
  // resulting bands do not fill gaps and retain alpha prefix/suffix.
  function exactBands(numbers){
    const groups=new Map();
    for(const number of new Set(numbers)){
      const m=/^([A-Z]*)([0-9]+)([A-Z]*)$/.exec(String(number).toUpperCase());
      if(!m)continue;
      const width=m[2].length;
      const key=m[1]+'|'+m[3]+'|'+width;
      const list=groups.get(key)||[];
      list.push({n:Number(m[2]),name:number});groups.set(key,list);
    }
    const bands=[];
    for(const list of groups.values()){
      list.sort((a,b)=>a.n-b.n);
      let start=list[0],last=start;
      for(let i=1;i<=list.length;i++){
        const next=list[i];
        if(next && next.n===last.n+1){last=next;continue;}
        bands.push({from:start.name,to:last.name,
          count:last.n-start.n+1});
        start=next;last=next;
      }
    }
    return bands.sort((a,b)=>a.from.localeCompare(b.from));
  }
  for(const asset of byPath.values()){
    for(const rule of asset.directNumberRules){
      const known=new Set();
      for(const source of Object.values(rule.explicitNumbers||{})){
        if(Array.isArray(source))source.forEach(n=>known.add(String(n)));
        else if(source&&typeof source==='object')
          for(const nested of Object.values(source)){
            if(Array.isArray(nested))nested.forEach(n=>known.add(String(n)));
            else if(nested&&typeof nested==='object')
              Object.values(nested).forEach(value=>{
                if(Array.isArray(value))value.forEach(n=>known.add(String(n)));
              });
          }
      }
      if(rule.exactSingleNumber)known.add(rule.exactSingleNumber);
      // The original unified source catalog owns large calendar-specific
      // exact lists. Keep an in-index preview for short lists only, so the
      // 601-image index remains small and cannot become a second authority.
      rule.explicitDocumentedNumberCount=known.size;
      if(known.size>0 && known.size<=20)
        rule.explicitShortNumberList=[...known].sort();
      rule.exactRosterSourceRuleId=rule.ruleId;
      delete rule.explicitNumbers;
    }
    for(const roster of asset.runtimeNumberRosters){
      roster.explicitDocumentedNumberCount=roster.numbers.length;
      roster.exactContiguousBands=exactBands(roster.numbers);
      delete roster.numbers;
    }
    for(const group of asset.historicalNumberedSources){
      group.explicitDocumentedNumberCount=group.sourceNumbers.length;
      group.explicitServiceDateNumberCount=group.dateVerifiedServiceNumbers.length;
    }
  }
  // Keep generated JSON/CSV ordering independent of the host's default
  // locale.  CI generated the existing snapshot under English collation,
  // so request that same collation explicitly on Windows and Linux.
  const assets=[...byPath.values()].sort((a,b)=>
    a.path.localeCompare(b.path,'en'));
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
  const existingHelperRuntime=assets.filter(asset=>
    asset.runtimeNumberRosters.some(roster=>
      roster.authority==='existing_frontend_helper')).length;
  if(catalog.rules.length!==423||datedSource.rows.length!==200)
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
      JR_Central_Kansai:'Private exact-number roster; complete stop clocks and actual vehicle remain unverified',
      JR_Central_Chuo:'Private exact-number roster; complete stop clocks and actual vehicle remain unverified',
      missing:'No supported number evidence for this image; preserve neutral marker',
      observedTrainset:'No map here asserts an actual vehicle/carset or livery'
    },
    summary:{
      galleryPng:assets.length,catalogRules:catalog.rules.length,
      imagesInDirectRules:direct,imagesInRuntimeRosters:runtime,
      imagesInTobuRuntimeRosters:existingHelperRuntime,
      imagesWithHistoricalSqlLinks:historical,
      imagesWithAnyNumberReferenceIncludingHistory:any,
      quarantinedImages:quarantined,imagesWithNoNumberEvidence:none,
      tobuMatcherAcceptedCalls:tobuAccepted,tobuMatcherRejectedCalls:tobuMissed,
      jrCentralKansai315ExactRosterOccurrences:jrcKansaiAccepted,
      jrCentralChuo315ExactRosterOccurrences:jrcChuo315Accepted,
      jrCentralChuo383HomeLinerExactRosterOccurrences:jrcChuo383Accepted,
      missingPhysicalPngReferences:unknownPaths.length
    },
    missingPhysicalPngReferences:unknownPaths,
    pngIndex:assets
  };
}
function csvIndex(index){
  const header=[
    'png','operatorDirectory','galleryModel','mappingStatus',
    'lineId','mappingSource','ruleOrFamily','numberRangeBounds',
    'documentedExactNumberCount','calendar','validFrom','validTo',
    'runtimeProofRequired','sourceUrl'
  ];
  const all=[header];
  const encode=s=>{
    const t=String(s==null?'':s);
    return /[,"\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;
  };
  for(const asset of index.pngIndex){
    const base=[asset.path,asset.operatorDirectory,
      asset.canonicalModels.join(' | '),asset.status];
    const emitted=[];
    for(const rule of asset.directNumberRules){
      const from=rule.minNumber==null?'':String(rule.minNumber)+(rule.suffix||'');
      const to=rule.maxNumber==null?'':String(rule.maxNumber)+(rule.suffix||'');
      for(const line of rule.lineIds.length?rule.lineIds:['']){
        emitted.push([...base,line,rule.authority,rule.ruleId,
          from===to?from:from+' ~ '+to,
          rule.explicitDocumentedNumberCount,
          'see canonical roster',
          rule.validFrom,rule.validTo,
          rule.grade==='guarded_number_bounds_only'?'yes - bounds only':'yes - dated source/identity',
          rule.sourceUrl]);
      }
    }
    for(const roster of asset.runtimeNumberRosters){
      const bounds=roster.exactContiguousBands.map(b=>
        b.from===b.to?b.from:b.from+' ~ '+b.to);
      // The canonical JSON retains ALL exact islands; CSV is for scanning.
      const preview=bounds.slice(0,12).join(' | ')+
        (bounds.length>12?' | ... '+(bounds.length-12)+' more exact islands':'');
      emitted.push([...base,roster.lineId,roster.authority,
        roster.numberFamily+(roster.corridor?'/'+roster.corridor:''),
        preview,roster.explicitDocumentedNumberCount,
        roster.calendarType,roster.validFrom,roster.validTo,
        'yes - exact roster + runtime guards',roster.sourceUrl]);
    }
    for(const group of asset.historicalNumberedSources){
      const numberPreview=group.sourceNumbers.slice(0,12).join(' | ')+
        (group.sourceNumbers.length>12?' | ...':'');
      emitted.push([...base,group.lineId,group.authority,
        group.sourceRole,numberPreview,
        group.explicitDocumentedNumberCount,group.calendarUrn,
        group.sourceRevisionDate,'',
        'yes - historic source; current service not verified',
        group.sourceUrl]);
    }
    if(!emitted.length)emitted.push([...base,'','none','','',0,
      '','','','no number evidence','']);
    all.push(...emitted);
  }
  return '\ufeff'+all.map(row=>row.map(encode).join(',')).join('\n')+'\n';
}
if(typeof module!=='undefined')module.exports={buildIndex,csvIndex};
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
  const csvTarget='data/audits/png-to-train-number-index-2611.csv';
  const out=JSON.stringify(index)+'\n';
  const csv=csvIndex(index);
  if(args.includes('--write')){
    fs.writeFileSync(path.join(root,target),out);
    fs.writeFileSync(path.join(root,csvTarget),csv);
  }
  if(args.includes('--check')){
    if(!fs.existsSync(path.join(root,target))||get(target)!==out)
      throw Error('Generated PNG->number JSON index is stale');
    if(!fs.existsSync(path.join(root,csvTarget))||get(csvTarget)!==csv)
      throw Error('Generated PNG->number CSV index is stale');
  }
  const lookupArg=args.find(s=>s.startsWith('--lookup='));
  if(lookupArg){
    const query=lookupArg.slice('--lookup='.length);
    console.log(JSON.stringify(index.pngIndex.filter(p=>p.path.includes(query)),null,2));
  }else console.log(JSON.stringify(index.summary,null,2));
}
