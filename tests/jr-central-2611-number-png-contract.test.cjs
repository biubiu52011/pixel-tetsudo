'use strict';
// JR-Central display rule: planned SQL train NUMBER -> scoped PNG pool.
// The PNG is a representative illustration, never an actual-day trainset.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const vehicle=fs.readFileSync('js/train-vehicle.js','utf8');
const sql=fs.readFileSync('supabase/queries/jr_central_2611_plan_number_png_pool.sql','utf8');
const gallery='../images/列车/JR東海/JR東海_N700系.png';

function section(source,opening,ending) {
  const a=source.indexOf(opening);
  const b=source.indexOf(ending,a);
  assert.ok(a>=0&&b>a,'missing production section: '+opening);
  return source.slice(a,b);
}
assert.ok(fs.existsSync(gallery.replace(/^\.\.\//,'')),'generic N700 PNG must exist');
assert.match(sql,/2611_planned_number_n700_family_reference/);
assert.match(sql,/v\.vehicle_type IN \('N700系','N700S系'\)/);
assert.match(sql,/IF n <> 50 THEN/);

// Test actual source expression: the JR-Central SQL number pool may return a
// generic N700-family image even for a plan recorded as N700S, without altering
// the plan's vehicle_type_label. Other railways keep their stricter rules.
const serverSnippet=section(edge,
  '    const verifiedPublishedPng=pngProof && (','\n    return {');
const serverCtx=vm.createContext({});
vm.runInContext(`function selectServerPng(lineId,pngProof,mapped,exactScheduleType,datedVehiclePlan,datedRuleConflict,conflict,pngEvidence) {
${serverSnippet}
return verifiedPublishedPng;
}`,serverCtx);
const plan={mapping_level:'official_service_vehicle_plan'};
const evidence={source_type:'official',evidence_grade:'A'};
const png={path:gallery,model:'N700系'};
assert.equal(serverCtx.selectServerPng('TokaidoShinkansen',png,plan,
  'N700S系',null,false,false,evidence),gallery);
assert.equal(serverCtx.selectServerPng('SanyoShinkansen',png,plan,
  'N700S系',null,false,false,evidence),null);
assert.equal(serverCtx.selectServerPng('TokaidoShinkansen',null,plan,
  'N700S系',null,false,false,evidence),null);

// Test production front-end selector (not a duplicate substitute):
// SQL 1A resolves the already-validated pool path; the visible service
// nickname のぞみ1 may NOT be used in place of the numbered 1A train.
assert.match(estimator,/sqlPlannedNumberPngPath: lineId==="TokaidoShinkansen"/);
assert.match(estimator,/tt\._sqlTrainNumberVerification==="official-2611-sql-exact-roster"/);
const selector=section(vehicle,
  '  function selectMarkerArtwork(p, artworkFailed) {',
  '\n  window.TrainVehicle = {');
const ctx=vm.createContext({
  lookupTrainNumberRangePng:()=>null,
  normalizeGalleryPngPath:p=>
    typeof p==='string'&&p.startsWith('../images/列车/')&&
    p.endsWith('.png')&&p.split('/').length===5 ? p : ''
});
vm.runInContext(selector,ctx);
const base={
  positionLineId:'TokaidoShinkansen',
  displayLineId:'TokaidoShinkansen',
  sourceRailway:'odpt.Railway:JR-Central.TokaidoShinkansen',
  estimated:true,positionSource:'supabase-train-run',trainNumber:'1A',
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  sqlPlannedNumberPngPath:gallery
};
const accepted=ctx.selectMarkerArtwork(base,false);
assert.equal(accepted.kind,'vehicle');
assert.equal(accepted.iconSrc,gallery);
assert.equal(accepted.planned,true);
assert.equal(accepted.actualVehicleConfirmed,false);
assert.equal(ctx.selectMarkerArtwork({...base,trainNumber:'のぞみ1'},false).kind,'unresolved');
assert.equal(ctx.selectMarkerArtwork({...base,sqlPlannedNumberPngPath:''},false).kind,'unresolved');
assert.equal(ctx.selectMarkerArtwork({...base,sqlPlannedNumberPngPath:'https://example.com/train.png'},false).kind,'unresolved');
assert.equal(ctx.selectMarkerArtwork(base,true).kind,'unresolved');

console.log('JR-Central 2611 planned-number PNG pool contract passed');
