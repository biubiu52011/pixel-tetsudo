'use strict';
/* Whole-network vehicle mapping audit.
 * Inspect ALL canonical routes, every source-scoped fleet reference and every
 * catalog PNG. A fleet reference is not permission to name today's physical car.
 * Run: node tools/train-network-vehicle-audit.test.cjs
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const railway=JSON.parse(read('data/core/railway_data.compact.json'));
const lines=railway.lines || {};
const browser={};
const context={
  window:browser,console:{debug(){},warn(){},error(){},log(){}},
  Date,Map,Set,WeakSet,WeakMap,Promise,Object,Array,Number,String,Math
};
vm.runInNewContext(read('data/core/major-vehicle-fleet-presets.js'),
  context,{timeout:15000});
const source=read('js/train-vehicle.js');
const hook='window.TrainVehicle = {';
assert.ok(source.includes(hook),'canonical resolver export moved; update audit harness');
vm.runInNewContext(source.replace(hook,
  'window.__auditResolvePlan=resolveTimetableVehiclePlan;\n'+hook),
  context,{timeout:15000});
const canonical=browser.TrainVehicle;
const entries=browser.MajorVehicleFleetPresets.list();
const linesSeen=new Set(),scopeErrors=[],audit={
  auditedAt:'2026-11-03', totalRoutes:Object.keys(lines).length,
  fleetEntries:entries.length,coveredRoutes:0,
  notCoveredRoutes:[],modelLineReferences:0,
  galleryBackedScopedReferences:0,nonGalleryScopedReferences:0,
  directCatalogUnresolvedReferences:0,scopeConstrainedReferences:0,
  catalogGalleryPaths:0,availableGalleryPNGs:0,orphanGalleryPNGs:0
};
assert.ok(audit.totalRoutes>=237,'network route inventory unexpectedly shrunk');
assert.ok(entries.length>=191,'fleet inventory unexpectedly shrunk');
for(const entry of entries){
  assert.ok(entry.id && /^https:\/\//.test(entry.sourceUrl),entry.id+': missing source');
  assert.ok(entry.models.length,entry.id+': missing models');
  for(const line of entry.lineIds){
    const key=entry.operator+'|'+line;
    assert.ok(lines[line],entry.id+': fleet scope has unknown railway '+line);
    assert.equal(lines[line].operator,entry.operator,entry.id+': wrong operator '+line);
    assert.ok(!linesSeen.has(key),entry.id+': duplicated operator/route '+line);
    linesSeen.add(key);
    for(const model of entry.models){
      audit.modelLineReferences++;
      const plan=browser.__auditResolvePlan(model,{
        lineId:line,operator:entry.operator,serviceDate:'2026-11-03'
      });
      assert.ok(plan && Array.isArray(plan.models) && plan.models.length===1,
        key+': fleet model could not be evaluated '+model);
      assert.equal(plan.lineId,line,key+': reference escaped current route');
      if(plan.iconPath){
        audit.galleryBackedScopedReferences++;
        assert.ok(/^..\/images\/列车\/.+\.png$/.test(plan.iconPath),
          key+': image must be local gallery PNG');
        assert.ok(fs.existsSync(path.resolve(root,'pages',plan.iconPath)),
          key+': resolved image missing '+plan.iconPath);
      }else audit.nonGalleryScopedReferences++;
      const record=canonical.resolveCanonicalVehicle(model);
      if(!record)audit.directCatalogUnresolvedReferences++;
      else if(record.lineIds && !record.lineIds.includes(line))
        audit.scopeConstrainedReferences++;
      // The source itself is a fleet reference: no actual dispatch or exact
      // car may be inferred from presence of a scoped catalogue image.
    }
  }
}
const byLine=new Set([...linesSeen].map(k=>k.split('|')[1]));
audit.coveredRoutes=byLine.size;
audit.notCoveredRoutes=Object.keys(lines).filter(line=>!byLine.has(line)).sort();
// These JR-Central registries predate the explicit topology-only status
// field. Keep them as an explicit audit inventory until source-scoped fleet
// evidence is added; never infer a vehicle plan from this exception.
const legacyJrCentralTopologyOnly=new Set([
  'ChuoCentral','Gotemba','Iida','KansaiCentral','KiseiCentral','Meisho',
  'MinoAkasaka','Minobu','Sangu','Taita','Takayama','Taketoyo',
  'TokaidoCentral'
]);
// Transfer-topology-only railway entities are not entitled to a scheduled
// fleet, vehicle PNG, live position or a fabricated train run. Require an
// explicit owner status and a real multi-operator transfer before excluding
// them from the mandatory fleet-source review.
audit.stationTopologyOnlyRoutes=audit.notCoveredRoutes.filter(id=>{
  const route=lines[id];
  const legacyJrCentral=legacyJrCentralTopologyOnly.has(id)&&
    route?.operator==='JR-Central'&&
    !route.timetableDataStatus&&!route.sourceQuality&&
    Array.isArray(route.stations)&&route.stations.length>1;
  if((!legacyJrCentral&&route?.timetableDataStatus!=='station_topology_only')||
     !Array.isArray(route.stations)||route.stations.length<=1||
     !Array.isArray(route.transferStations))return false;
  // The two already-audited Aou topology carriers remain unchanged.
  const legacyAou=route.transferStations.some(t=>
    t.station==='Aou'&&t.lineId==='KakogawaLine'&&
    route.stations.includes(t.station));
  // New JR branches have proven rails, but no audited train or vehicle plan.
  // This is an explicit topology-only exception, not a fleet/Png waiver.
  const parent=route.branchOf&&lines[route.branchOf];
  const newJrBranch=['SanyoWadamisaki','HanwaHagoromo','SaninSenzaki'].includes(id)&&
    route.operator==='JR-West'&&parent?.operator==='JR-West'&&
    route.type==='branch'&&route.stations.length===2&&
    route.sourceQuality==='topology_verified_times_approximate'&&
    parent.stations.includes(route.stations[0])&&
    !parent.stations.includes(route.stations[1])&&
    route.transferStations.some(t=>
      t.station===route.stations[0]&&t.lineId===route.branchOf)&&
    route.stations.every(st=>Number.isFinite(railway.stations[st]?.lat)&&
      Number.isFinite(railway.stations[st]?.lng));
  // Verified passenger-route topology. Each has an explicit station order,
  // approximate segment durations and no source-scoped vehicle or
  // date-specific timetable. Do not fabricate fleet.
  const sourceVerifiedRoutes={
    Fujikyu:{operator:'FujisanrokuElectricRailway',first:'Otsuki',last:'Kawaguchiko',count:18},
    Nikko:{operator:'JR-East',first:'Utsunomiya',last:'Nikko',count:7},
    TohokuRifu:{operator:'JR-East',first:'Iwakiri',last:'Rifu',count:3},
    ChikuhiWest:{operator:'JR-Kyushu',first:'Nishi-Karatsu',last:'Imari',count:14},
    Hisatsu:{operator:'JR-Kyushu',first:'Yatsushiro',last:'JR-Hisatsu-006',count:6},
    HakodateMain:{operator:'JR-Hokkaido',first:'JR-HakodateMain-001',last:'JR-HakodateMain-011',count:11},
    NemuroMain:{operator:'JR-Hokkaido',first:'JR-HakodateMain-010',last:'JR-NemuroMain-008',count:8},
    Chitose:{operator:'JR-Hokkaido',first:'JR-HakodateMain-008',last:'JR-Chitose-010',count:10},
    MuroranMain:{operator:'JR-Hokkaido',first:'JR-HakodateMain-006',last:'JR-HakodateMain-009',count:9},
    Sekisho:{operator:'JR-Hokkaido',first:'JR-Chitose-007',last:'JR-NemuroMain-003',count:6},
    Furano:{operator:'JR-Hokkaido',first:'JR-HakodateMain-011',last:'JR-NemuroMain-002',count:6},
    SoyaMain:{operator:'JR-Hokkaido',first:'JR-HakodateMain-011',last:'JR-SoyaMain-009',count:9},
    SenmoMain:{operator:'JR-Hokkaido',first:'JR-SenmoMain-001',last:'JR-SenmoMain-009',count:9},
    SekihokuMain:{operator:'JR-Hokkaido',first:'JR-SekihokuMain-001',last:'JR-SenmoMain-001',count:7},
    Sassho:{operator:'JR-Hokkaido',first:'JR-HakodateMain-008',last:'JR-Sassho-006',count:6},
    HidakaMain:{operator:'JR-Hokkaido',first:'JR-Chitose-010',last:'JR-HidakaMain-004',count:4},
    Yosan:{operator:'JR-Shikoku',first:'Takamatsu',last:'JR-Yosan-013',count:13},
    Dosan:{operator:'JR-Shikoku',first:'JR-Yosan-005',last:'JR-Dosan-009',count:9},
    Kotoku:{operator:'JR-Shikoku',first:'Takamatsu',last:'JR-Kotoku-007',count:7},
    Tokushima:{operator:'JR-Shikoku',first:'JR-Tokushima-001',last:'JR-Dosan-004',count:6},
    Naruto:{operator:'JR-Shikoku',first:'JR-Naruto-001',last:'JR-Naruto-003',count:3},
    Mugi:{operator:'JR-Shikoku',first:'JR-Kotoku-007',last:'JR-Mugi-006',count:6},
    Yodo:{operator:'JR-Shikoku',first:'JR-Yodo-001',last:'JR-Yodo-006',count:6},
    Uchiko:{operator:'JR-Shikoku',first:'JR-Uchiko-001',last:'JR-Uchiko-003',count:3}
  };
  const spec=sourceVerifiedRoutes[id];
  const verifiedNewCorridor=!!spec&&
    route.operator===spec.operator&&
    route.timetableDataStatus==='station_topology_only'&&
    route.sourceQuality==='topology_verified_times_approximate'&&
    route.stations.length===spec.count&&
    route.stations[0]===spec.first&&route.stations.at(-1)===spec.last&&
    Array.isArray(route.durations)&&route.durations.length===spec.count-1;
  // CR01-CR37 station topology has a published operator station list and MLIT
  // coordinates, but NO source-scoped timetable or fleet evidence. Keep all
  // train/PNG dispatch claims disabled until an independently audited source exists.
  const verifiedChichibu=id==='ChichibuMain'&&
    route.operator==='ChichibuRailway'&&
    route.timetableDataStatus==='station_topology_only'&&
    route.sourceQuality==='official_station_order_mlit2024_coords'&&
    route.stations.length===37&&route.stations[0]==='Hanyu'&&
    route.stations.at(-1)==='CR-Mitsumineguchi'&&
    Array.isArray(route.durations)&&route.durations.length===0&&
    route.transferStations.some(t=>
      t.station==='Hanyu'&&t.lineId==='TobuIsesaki')&&
    route.stations.every(st=>Number.isFinite(railway.stations[st]?.lat)&&
      Number.isFinite(railway.stations[st]?.lng));
  return legacyAou||newJrBranch||verifiedNewCorridor||verifiedChichibu||legacyJrCentral;
});
assert.deepEqual(audit.stationTopologyOnlyRoutes.slice().sort(),
  ['HojoRailway','ShintetsuAo','SanyoWadamisaki',
   'HanwaHagoromo','SaninSenzaki','Fujikyu','Nikko',
   'TohokuRifu','ChikuhiWest','Hisatsu','HakodateMain','NemuroMain',
   'Chitose','MuroranMain','Sekisho','Furano','SoyaMain','SenmoMain',
   'SekihokuMain','Sassho','HidakaMain','Yosan','Dosan','Kotoku',
   'Tokushima','Naruto','Mugi','Yodo','Uchiko','ChuoCentral','Gotemba',
   'Iida','KansaiCentral','KiseiCentral','Meisho','MinoAkasaka','Minobu',
   'Sangu','Taita','Takayama','Taketoyo','TokaidoCentral','ChichibuMain'].sort(),
  'only independently audited station-topology-only routes may lack fleet evidence');
assert.deepEqual(audit.notCoveredRoutes.filter(id=>
    !audit.stationTopologyOnlyRoutes.includes(id)),
  ['HakataMinami','Kesennuma','Ofunato'],
  'unreviewed active route has no fleet reference; audit route type before adding');
/* Kesennuma and Ofunato are BRT corridors (not railway vehicle stock).
 * HakataMinami is a Shinkansen depot access line where sourced individual
 * train plans are preferable to a guessed route-wide model/livery.
 */
const refs=[...new Set(
  [...source.matchAll(/(?:\.\.\/|\/)?images\/列车\/[^"'\r\n]+?\.png/g)]
    .map(m=>m[0].replace(/^(?:\.\.\/|\/)/,''))
)];
audit.catalogGalleryPaths=refs.length;
assert.ok(refs.length>=578,'catalog lost registered gallery references');
for(const ref of refs){
  assert.equal(ref.split('/').length,4,ref+': invalid gallery path');
  assert.ok(fs.existsSync(path.join(root,ref)),ref+': missing PNG');
}
function gather(dir,base,out){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const rel=base+'/'+ent.name;
    if(ent.isDirectory())gather(path.join(dir,ent.name),rel,out);
    else if(ent.name.endsWith('.png'))out.push(rel);
  }
}
const pngs=[];gather(path.join(root,'images','列车'),'images/列车',pngs);
audit.availableGalleryPNGs=pngs.length;
audit.orphanGalleryPNGs=pngs.filter(p=>!refs.includes(p)).length;
assert.ok(pngs.length>=579,'gallery inventory unexpectedly shrunk');
const tsurumi=canonical.resolveCanonicalVehicle('E131系1000番台');
const nagano=canonical.resolveCanonicalVehicle('E131系200番台');
assert.ok(tsurumi && nagano,'E131 variant records missing');
assert.deepEqual(Array.from(tsurumi.lineIds).sort(),
  ['Tsurumi','TsurumiOkawa','TsurumiUmiShibaura'].sort(),
  '1000-band E131 is for Tsurumi, not Chuo/Shinonoi/Shinetsu');
assert.ok(['ChuoMain','Shinonoi','Shinetsu'].every(l=>nagano.lineIds.includes(l)),
  'Nagano 200-band E131 scope missing');
assert.ok(!nagano.lineIds.includes('Oito')&&!tsurumi.lineIds.includes('ChuoMain'),
  'E131 region-model cross contamination');
assert.equal(browser.MajorVehicleFleetPresets.lookup('Oito','JR-East',
  'odpt.TrainType:JR-East.Local').vehicleCandidates.includes('E131系200番台'),
  false,'Oito may not inherit Nagano E131 fleet');
const keiyo=browser.__auditResolvePlan('E233系1000番台',
  {operator:'JR-East',lineId:'Keiyo'});
assert.equal(keiyo.iconPath,'',
  'do not display former Keihin-Tohoku blue-band image on Keiyo transfer');
console.log('Whole-network vehicle mapping audit: PASS');
console.log(JSON.stringify(audit,null,2));
