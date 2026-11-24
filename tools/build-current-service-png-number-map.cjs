'use strict';
/**
 * Conservative 2026-11-16 CURRENT SERVICE vehicle gallery PNG number mapping.
 * Existing number resolver/catalog is still the only number->PNG authority.
 * This produces an active-family overlay from EXPLICIT operator sources,
 * not a blanket inference that every picture in the gallery is in service.
 * No actual physical carset, livery or train-specific assignment is certified.
 *
 * node tools/build-current-service-png-number-map.cjs --write
 * node tools/build-current-service-png-number-map.cjs --check
 */
const fs=require('node:fs');
const path=require('node:path');

function derive(index,fleet){
  if(index.edition!=='2611'||index.pngIndex.length!==601 ||
    !/^\d{4}-\d\d-\d\d$/.test(fleet.as_of) ||
    fleet.as_of!=='2026-11-16')throw Error('Invalid source audit snapshot');
  const sourceMap=new Map(),byPath=new Map(index.pngIndex.map(x=>[x.path,x]));
  for(const row of fleet.verified_fleet_artworks){
    if(!row.image_path || !/^https:\/\//.test(row.evidence_source_url) ||
      row.service_status!=='verified_current_fleet_family' ||
      row.verification_date!==fleet.as_of)throw Error('Fleet proof invalid: '+row.image_path);
    if(sourceMap.has(row.image_path))throw Error('Duplicate verified PNG '+row.image_path);
    const rec=byPath.get(row.image_path);
    if(!rec)throw Error('Fleet proof missing physical PNG '+row.image_path);
    if(rec.quarantined||rec.alternateOnly)
      throw Error('Fleet proof cannot override quarantined/alternate art '+row.image_path);
    sourceMap.set(row.image_path,row);
  }
  const mapped=[],activeWithoutNumber=[],pendingStatus=[],quarantine=[];
  const date=fleet.as_of;
  for(const original of index.pngIndex){
    const known=sourceMap.get(original.path);
    if(original.quarantined){
      quarantine.push({png:original.path,reason:'conflicting visual identity; not eligible for numbered artwork'});
      continue;
    }
    if(!known){
      const hasRule=original.directNumberRules.length>0 ||
        original.runtimeNumberRosters.length>0;
      pendingStatus.push({png:original.path,
        previouslyNumberScoped:hasRule,
        reason:hasRule?'Current model/formation/livery operating status not independently verified; existing numbered reference remains untouched':
          'No verified current fleet status in this audit; NOT automatically a retired vehicle'});
      continue;
    }
    const currentRules=original.directNumberRules.filter(r=>
      r.actualVehicleConfirmed===false &&
      (!r.validFrom||r.validFrom<=date)&&
      (!r.validTo||r.validTo>=date));
    const currentRosters=original.runtimeNumberRosters.filter(r=>
      r.referenceOnly===true &&
      (!r.validFrom||r.validFrom<=date)&&
      (!r.validTo||r.validTo>=date));
    const record={
      png:original.path,
      operatorDirectory:original.operatorDirectory,
      approvedGalleryModels:original.canonicalModels,
      galleryLineScopes:original.lineScopes,
      fleetEvidence:known,
      numberRules:currentRules,
      runtimeNumberRosters:currentRosters,
      // Historical source-number records are still preserved but do not
      // independently grant a 2026-11 train/PNG mapping.
      historicalSources:original.historicalNumberedSources,
      actuallyObservedCarset:false,
      confidence:'model_family_operating_only_not_number_to_physical_unit',
      numberedServiceRequiresRuntimeGuards:true
    };
    if(currentRules.length || currentRosters.length){
      record.result='current_operating_fleet_with_numbered_reference';
      mapped.push(record);
    }else{
      record.result='current_operating_fleet_but_no_numbered_reference';
      activeWithoutNumber.push(record);
    }
  }
  // Match the generated PNG index's explicit English collation so artifacts
  // are byte-stable on Windows and Linux regardless of the host locale.
  mapped.sort((a,b)=>a.png.localeCompare(b.png,'en'));
  activeWithoutNumber.sort((a,b)=>a.png.localeCompare(b.png,'en'));
  const indexedPhysical=new Set([...mapped,...activeWithoutNumber,...pendingStatus,...quarantine].map(x=>x.png));
  if(indexedPhysical.size!==601)throw Error('Lost a physical PNG in status partition');
  const summary={
    physicalPng:601,
    fleetFamilyVerified:sourceMap.size,
    activeFamilyWithExistingNumberScope:mapped.length,
    activeFamilyWithoutNumberScope:activeWithoutNumber.length,
    currentFleetStatusNotVerified:pendingStatus.length,
    currentNumberReferencesPendingFleetReview:pendingStatus.filter(x=>x.previouslyNumberScoped).length,
    quarantinedArtwork:quarantine.length,
    exactPhysicalCarsetsVerified:0
  };
  return {
    schemaVersion:1,date,
    purpose:'Only source-verified currently operating model families from the existing 601-PNG gallery, with existing number evidence',
    warnings:[
      'Current service of a model family does not imply a particular pictured carset/livery is currently running.',
      'A number-bounds rule is not proof that all numbers between bounds run, nor that they use that PNG.',
      'Unknown service status is not a retirement assertion; unknown images remain in the original full gallery.',
      'Every image remains bound by the existing production number/date/line/calendar/vehicle owner gates.',
      'All mapped pictures are planned references, not physical carset/actual formation verifications.'
    ],
    sources:[
      'data/audits/png-to-train-number-index-2611.json',
      'data/audits/png-current-fleet-evidence-20261116.json'
    ],
    summary,mapped,activeWithoutNumber,pendingStatus,quarantine
  };
}
function csvOf(result){
  const header=['png','fleetStatus','operator','family','lineScope',
    'mappingAuthority','numberRuleOrFamily','exactNumberOrBound',
    'calendar','effectiveStart','effectiveEnd','fleetOfficialSource',
    'numberEvidenceSource','trainNumberGuardRequired','observedCarset'];
  const rows=[header];
  const esc=v=>{
    const s=String(v==null?'':v);
    return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  };
  for(const a of [...result.mapped,...result.activeWithoutNumber]){
    const prefix=[a.png,a.result,a.operatorDirectory,
      a.approvedGalleryModels.join(' | '),a.galleryLineScopes.join(' | ')];
    const tail=(rule,kind,bounds,calendar,s,e,url)=>[
      ...prefix,kind,rule,bounds,calendar,s,e,a.fleetEvidence.evidence_source_url,
      url,'yes','no'
    ];
    for(const r of a.numberRules){
      const b=r.minNumber==null?'':String(r.minNumber)+(r.suffix||'');
      const e=r.maxNumber==null?'':String(r.maxNumber)+(r.suffix||'');
      rows.push(tail(r.ruleId,r.authority,b===e?b:b+' ~ '+e,
        r.calendar_type||'see original exact roster',
        r.validFrom,r.validTo,r.sourceUrl));
    }
    for(const r of a.runtimeNumberRosters){
      const bands=r.exactContiguousBands.map(x=>x.from===x.to?x.from:x.from+' ~ '+x.to);
      rows.push(tail(r.numberFamily+(r.corridor?'/'+r.corridor:''),
        r.authority,
        bands.slice(0,12).join(' | ')+(bands.length>12?' | ... ('+bands.length+' exact islands)':''),
        r.calendarType,r.validFrom,r.validTo,r.sourceUrl));
    }
    if(!a.numberRules.length&&!a.runtimeNumberRosters.length)
      rows.push([...prefix,'none','active fleet without documented numbered roster','',
        '', '', '',a.fleetEvidence.evidence_source_url,
        '', 'no - no number assigned','no']);
  }
  return '\ufeff'+rows.map(row=>row.map(esc).join(',')).join('\n')+'\n';
}
module.exports={derive,csvOf};
if(require.main===module){
  const root=path.resolve(__dirname,'..'), read=p=>fs.readFileSync(path.join(root,p),'utf8');
  const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
  const fleet=JSON.parse(read('data/audits/png-current-fleet-evidence-20261116.json'));
  const result=derive(index,fleet);
  const jsonPath='data/audits/png-current-service-number-map-20261116.json';
  const csvPath='data/audits/png-current-service-number-map-20261116.csv';
  const json=JSON.stringify(result)+'\n',csv=csvOf(result),args=process.argv.slice(2);
  if(args.includes('--write')){
    fs.writeFileSync(path.join(root,jsonPath),json);
    fs.writeFileSync(path.join(root,csvPath),csv);
  }
  if(args.includes('--check')&&(read(jsonPath)!==json || read(csvPath)!==csv))
    throw Error('Current-service PNG number mapping is stale; rebuild --write');
  console.log(JSON.stringify(result.summary,null,2));
}
