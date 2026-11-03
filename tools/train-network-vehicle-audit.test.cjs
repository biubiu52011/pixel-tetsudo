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
assert.deepEqual(audit.notCoveredRoutes,
  ['HakataMinami','Kesennuma','Ofunato'],
  'unreviewed route has no fleet reference; audit route type before adding');
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
