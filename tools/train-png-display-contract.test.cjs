'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const vehicleSource = fs.readFileSync('js/train-vehicle.js', 'utf8');
const renderSource = fs.readFileSync('js/trains-render.js', 'utf8');
const edgeSource = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
const adapterSource = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
assert.match(edgeSource, /vehicle_plan_confirmed: Boolean\(/);
assert.match(edgeSource, /source_type === "official"/);
assert.match(edgeSource, /\["A", "B"\].includes/);
assert.match(adapterSource, /"_sqlVehiclePlanConfirmed":run\.vehicle_plan_confirmed===true/);

function extract(source, start, end) {
  const a = source.indexOf(start);
  const b = a < 0 ? -1 : source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'missing canonical source function: ' + start);
  return source.slice(a, b);
}

const genericPng = '../images/列车/JR東日本/JR東日本_E233系5000番台.png';
const otherPng = '../images/列车/JR東日本/JR東日本_E231系.png';
const e233 = { displayName: 'JR E233系5000番台' };
const e231 = { displayName: 'E231系0番台' };
const identities = { 'JR E233系5000番台': e233, 'E231系0番台': e231 };

const issued = new WeakSet();
const vehicleVm = vm.createContext({
  _issuedVehiclePlans: issued,
  isGalleryPng: src => typeof src === 'string' &&
    src.startsWith('../images/列车/') && src.endsWith('.png') &&
    src.split('/').length === 5,
  resolveArtworkForIdentity: name => name === 'JR E233系5000番台' ? genericPng : '',
  resolveCanonicalVehicle: name => identities[name] || null,
});
vm.runInContext(extract(vehicleSource,
  '  function normalizeGalleryPngPath(path) {', '\n  window.TrainVehicle = {'), vehicleVm);

function choose(input) {
  return vehicleVm.selectMarkerArtwork(input, false);
}
const exact = {
  positionLineId: 'Keiyo',
  vehicleResolutionLineId: 'Keiyo',
  vehicleIdentityStatus: 'EXACT',
  vehicleResolvedUpstream: true,
  vehicleType: 'JR E233系5000番台',
  vehicleIconPath: genericPng,
  estimated: false,
};
assert.equal(choose(exact).kind, 'vehicle', 'confirmed identity must show PNG');
assert.equal(choose(exact).planned, false,
  'a genuinely observed train PNG must not be labelled a timetable projection');
assert.equal(choose({ ...exact, estimated: true }).kind, 'vehicle',
  'a source-backed timetable model must retain its native PNG');
assert.equal(choose({ ...exact, estimated: true }).planned, true,
  'an estimated train with an exact scheduled model is still a reference-only PNG');
assert.equal(choose({ ...exact, estimated: true, displayLineId: 'Yamanote' }).kind,
  'unresolved', 'a timetable model cannot cross display lines even as a planned PNG');

assert.equal(choose({ ...exact, vehicleIconPath: 'images/列车/JR東日本/JR東日本_E233系5000番台.png' }).iconSrc,
  genericPng, 'catalog root-relative path must resolve on pages/trains.html');
assert.equal(choose({ ...exact, vehicleIconPath: '/images/列车/JR東日本/JR東日本_E233系5000番台.png' }).iconSrc,
  genericPng, 'site-root path must resolve on pages/trains.html');
assert.equal(choose({ ...exact, vehicleIconPath: '', vehicleResolution: null }).iconSrc,
  genericPng, 'missing flattened path may reuse the same exact canonical identity');
assert.equal(choose({ ...exact, displayLineId: 'Yamanote' }).kind,
  'unresolved', 'source line must not authorize PNG on unrelated displayed line');
assert.equal(choose({ ...exact, displayLineId: 'Yamanote',
  vehicleResolvedFromRealtime: true,
  vehicleResolution: { sources: ['official-realtime-car-number'] } }).kind,
  'vehicle', 'physical car evidence may accompany an actual through train');
assert.equal(choose({ ...exact, vehicleIdentityStatus: 'UNKNOWN' }).kind,
  'unresolved', 'a cached path cannot change an unknown identity into EXACT');
assert.equal(choose({ ...exact, vehicleResolvedUpstream: false }).kind,
  'unresolved', 'an explicit upstream rejection must not be bypassed');

const candidates = [
  { vehicleType: 'JR E233系5000番台', asset: genericPng },
  { vehicleType: 'E231系0番台', asset: otherPng },
];
const narrowed = {
  ...exact,
  vehicleIconPath: '',
  vehicleResolvedUpstream: false,
  vehicleIdentityStatus: 'NARROWED',
  operationArtworkCandidates: candidates,
};
assert.equal(choose(narrowed).kind, 'candidate');
assert.equal(choose(narrowed).candidateAssets.length, 2);
assert.equal(choose({ ...narrowed, operationArtworkCandidates: [candidates[0]],
  candidateArtworkConfirmedByDatedRule: true }).kind, 'candidate',
  'one available candidate image is not vehicle confirmation');
assert.equal(choose({ ...narrowed, operationArtworkCandidates: [candidates[0]],
  vehicleIdentityStatus: 'EXACT', vehicleResolvedUpstream: true,
  vehicleType: 'E231系0番台', candidateArtworkConfirmedByDatedRule: true }).kind,
  'candidate', 'dated candidate image must match the exact identity, not another generation');

const singlePlan = {
  status: 'PLANNED_MODEL', lineId: 'Keiyo', models: ['JR E233系5000番台'],
  iconPath: genericPng,
};
issued.add(singlePlan);
const unknownEstimate = {
  ...narrowed, operationArtworkCandidates: [],
  vehiclePlan: singlePlan, estimated: true,
};
assert.equal(choose(unknownEstimate).planned, true,
  'single verified timetable model remains visibly a planned reference');
assert.equal(choose({ ...unknownEstimate, estimated: false }).kind, 'unresolved',
  'a timetable reference must not create realtime vehicle identity');
const multiPlan = {
  status: 'PLANNED_CANDIDATES', lineId: 'Keiyo',
  models: ['JR E233系5000番台', 'E231系0番台'],
  iconPath: genericPng, allowCandidateArtwork: true,
};
issued.add(multiPlan);
assert.equal(choose({ ...unknownEstimate, vehiclePlan: multiPlan }).kind,
  'unresolved', 'multi-model plan must not pick the first PNG');
assert.equal(choose({ ...exact, vehicleIconPath: 'https://invalid.example/train.png',
  vehicleType: '' }).kind, 'unresolved', 'external artwork is not an accepted catalog asset');
assert.equal(vehicleVm.selectMarkerArtwork(exact, true).kind, 'unresolved',
  'failed PNG must fall back to a neutral position marker');

// Published Seibu Toshima fleet scope is a route candidate list, not a
// day-specific vehicle assignment or a license to choose a representative PNG.
const fleetPlanVm = vm.createContext({ normOp: name => name });
vm.runInContext(extract(vehicleSource,
  'function _officialConventionalServicePlan(tt, lineId, line) {',
  'function resolveTimetableRun(run, tt, lineId, line, serviceDateOverride) {'),
  fleetPlanVm);
const seibuToshimaTemplate = {
  _positionSource: 'supabase-train-run',
  _sqlVehicleMappingLevel: 'unresolved',
  'odpt:operator': 'Seibu',
  'odpt:trainType': 'odpt.TrainType:Seibu.Local',
};
const toshimaPlan = fleetPlanVm._officialConventionalServicePlan(
  seibuToshimaTemplate, 'SeibuToshima', { operator: 'Seibu' });
assert.ok(toshimaPlan, 'Seibu Toshima must expose a timetable route fleet reference');
assert.equal(toshimaPlan.evidenceRole, 'route-fleet-reference');
assert.equal(toshimaPlan._fleetReferenceOnly, true);
assert.equal(toshimaPlan.planOverride, false);
assert.equal(toshimaPlan.vehicleType, undefined,
  'route candidates cannot become a confirmed exact vehicle');
assert.deepEqual(Array.from(toshimaPlan.vehicleCandidates),
  ['西武2000系', '西武20000系', '西武30000系', '西武40000系50番台']);
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...seibuToshimaTemplate, 'odpt:trainType': 'odpt.TrainType:Seibu.LimitedExpress'
}, 'SeibuToshima', { operator: 'Seibu' }), null,
'Seibu limited express services may not inherit commuter fleet candidates');
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...seibuToshimaTemplate, _sqlVehicleMappingLevel: 'official_single_fleet_plan'
}, 'SeibuToshima', { operator: 'Seibu' }), null,
'route fallback must not override an existing SQL fleet plan');

// In the 2026 Boso replacement period, local route fleet information can
// inform an unmapped timetable, but cannot identify a specific train or PNG.
const bosoTemplate = {
  _positionSource: 'supabase-train-run',
  _sqlVehicleMappingLevel: 'unresolved',
  'odpt:operator': 'JR-East',
  'odpt:trainType': 'odpt.TrainType:JR-East.Local',
};
for (const lineId of ['Sotobo', 'Uchibo', 'Togane']) {
  const fleet = fleetPlanVm._officialConventionalServicePlan(
    bosoTemplate, lineId, { operator: 'JR-East' });
  assert.ok(fleet, 'unmapped Boso local should expose a line-specific reference');
  assert.equal(fleet.evidenceRole, 'route-fleet-reference');
  assert.equal(fleet._fleetReferenceOnly, true);
  assert.equal(fleet.planOverride, false);
  assert.equal(fleet.vehicleType, undefined);
  assert.ok(fleet.vehicleCandidates.includes('209系'));
  assert.ok(fleet.vehicleCandidates.includes('E233系（房総地区・改造車）'));
  assert.equal(fleet.vehicleCandidates.includes('E131系0番台'), lineId !== 'Togane',
    'future Togane E131 must not appear as a 2026 operating fleet');
  assert.equal(fleet.vehicleCandidates.includes('E233系5000番台'), false,
    'Keiyo through-split E233-5000 cannot be presumed for generic Boso M-number locals');
}
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...bosoTemplate, 'odpt:trainType': 'odpt.TrainType:JR-East.LimitedExpress',
}, 'Sotobo', { operator: 'JR-East' }), null,
'a Boso limited express cannot inherit the local fleet reference');
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...bosoTemplate, _sqlVehicleMappingLevel: 'published_number_family_plan',
}, 'Togane', { operator: 'JR-East' }), null,
'train-number-mapped SQL fleet evidence must not be overwritten by route fallback');
assert.equal(fleetPlanVm._officialConventionalServicePlan(
  bosoTemplate, 'Keiyo', { operator: 'JR-East' }), null,
'the local fleet must not expand to unrelated railway displays');

// November 2026 Keiyo through Rapid 'A' numbers have their own route
// family. Never assign them the E235-1000 stock of the F-number trains.
const bosoKeiyoRapid = {
  ...bosoTemplate,
  'odpt:trainType': 'odpt.TrainType:JR-East.Rapid',
  'odpt:trainNumber': '3604A',
};
for (const lineId of ['Sotobo', 'Uchibo']) {
  const fleet = fleetPlanVm._officialConventionalServicePlan(
    bosoKeiyoRapid, lineId, { operator: 'JR-East' });
  assert.ok(fleet, 'A-number Keiyo through Rapid must have a route reference');
  assert.equal(fleet.evidenceRole, 'route-fleet-reference');
  assert.equal(fleet._fleetReferenceOnly, true);
  assert.equal(fleet.planOverride, false);
  assert.equal(fleet.vehicleType, undefined);
  assert.deepEqual(Array.from(fleet.vehicleCandidates),
    ['E233系5000番台', 'E233系1000番台']);
  assert.equal(fleet.vehicleCandidates.includes('E235系1000番台'), false);
  assert.equal(fleet.vehicleCandidates.includes('209系500番台'), false,
    'inactive Keiyo 209-500 cannot be declared scheduled by historical fleet lists');
}
for (const trainNumber of ['3604F', '3604Y', '3604M', '3604']) {
  assert.equal(fleetPlanVm._officialConventionalServicePlan({
    ...bosoKeiyoRapid, 'odpt:trainNumber': trainNumber,
  }, 'Sotobo', { operator: 'JR-East' }), null,
  'Keiyo A-number fleet cannot contaminate other numbering families');
}
assert.equal(fleetPlanVm._officialConventionalServicePlan(
  bosoKeiyoRapid, 'Togane', { operator: 'JR-East' }), null);
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...bosoKeiyoRapid, _sqlVehicleMappingLevel: 'published_number_family_plan',
}, 'Uchibo', { operator: 'JR-East' }), null,
'certified SQL plan outranks A-number route fallback');
assert.equal(fleetPlanVm._officialConventionalServicePlan({
  ...bosoKeiyoRapid, 'odpt:trainType': 'odpt.TrainType:JR-East.Local',
}, 'Uchibo', { operator: 'JR-East' }).vehicleCandidates.includes('E131系0番台'), true,
'local and rapid Boso fleet references remain distinct');

// Narita / Sobu published-number evidence is nominal 209 FAMILY only:
 // the raw family name must not pick a random 209 subseries or generic PNG.
const catalogVm = { window: {}, console: { debug(){}, warn(){}, error(){} } };
const catalogSnippet = vehicleSource.replace(
  'window.TrainVehicle = {',
  'window.__testPlanResolution = resolveTimetableVehiclePlan;\nwindow.TrainVehicle = {'
);
assert.notEqual(catalogSnippet, vehicleSource,
  'the production catalog plan resolver must remain accessible for contract tests');
vm.runInNewContext(catalogSnippet, catalogVm, { timeout: 15000 });
for (const lineId of ['Narita', 'NaritaAirportBranch', 'SobuMain']) {
  const nominal209 = catalogVm.window.__testPlanResolution('209系', {
    operator: 'JR-East', lineId,
    source: 'database-verified-published-plan'
  });
  assert.equal(nominal209.status, 'PLANNED_MODEL');
  assert.deepEqual(Array.from(nominal209.models), ['209系']);
  assert.equal(nominal209.iconPath, '',
    'nominal 209 family alone must never select a specific 209-subseries PNG');
}

// SQL published models describe the weekday/holiday timetable, not the
// observed physical stock. Even one verified model must pass through vehiclePlan.
const sqlPlanVm = vm.createContext({
  window: { TrainOperationEvidence: {
    getRevision: () => 1, resolveEvidence: () => null,
    normalizeOperationCode: () => '',
  } },
  resolve(ctx) {
    sqlPlanVm.resolvedInput = ctx;
    return { identityStatus: 'UNKNOWN', name: '', iconPath: '' };
  },
  resolveTimetableVehiclePlan(input, meta) {
    sqlPlanVm.planInput = input;
    sqlPlanVm.planMeta = meta;
    return input ? {
      status: input.includes(' / ') ? 'PLANNED_CANDIDATES' : 'PLANNED_MODEL',
      models: input.split(/\s*\/\s*/), iconPath: genericPng,
      source: meta.source, evidenceRole: 'timetable-plan', lineId: meta.lineId,
    } : null;
  },
  _officialConventionalServicePlan: (...args) =>
    fleetPlanVm._officialConventionalServicePlan(...args),
  _splitFormationIds: () => [],
  resolveCanonicalVehicle: () => null,
  resolveCanonicalVehicleForPlan: () => null,
});
vm.runInContext(extract(vehicleSource,
  'function resolveTimetableRun(run, tt, lineId, line, serviceDateOverride) {',
  '  function _operationDayDistance('), sqlPlanVm);
function checkSqlModel(level, verifiedUrl, confirmed) {
  return sqlPlanVm.resolveTimetableRun(
    { trainNumber: '601M', calendar: 'odpt.Calendar:Weekday' },
    { _positionSource: 'supabase-train-run',
      _sqlVehicleMappingLevel: level, vehicleType: 'E233系6000番台',
      _sqlVerifiedPublishedVehicleType: 'E233系6000番台',
      _sqlVerifiedPublishedVehicleSourceUrl: verifiedUrl || '',
      _sqlVehiclePlanConfirmed: confirmed === true },
    'Yokohama', { operator: 'JR-East' });
}
let publishedModel = checkSqlModel('official_service_vehicle_plan', 'https://example.org/official', true);
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
  'official published timetable vehicle cannot become an actual identity');
assert.equal(sqlPlanVm.planMeta.source, 'database-verified-published-plan');
assert.equal(publishedModel.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
assert.equal(publishedModel.vehicleResult.vehiclePlan.confirmed, true);
publishedModel = checkSqlModel('published_number_family_plan', 'https://example.org/official');
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
  'published-number family is a planned model, not a physical train');
assert.equal(publishedModel.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
assert.equal(publishedModel.vehicleResult.vehiclePlan.evidenceRole,
  'inferred-published-number-family',
  'published train-number families must remain inferential, not guaranteed stock');
assert.equal(publishedModel.vehicleResult.vehiclePlan.confirmed, false,
  'B-grade amateur family evidence cannot become a confirmed schedule');
const officialNumberPlan = checkSqlModel(
  'published_number_family_plan', 'https://example.org/official', true);
assert.equal(officialNumberPlan.vehicleResult.vehiclePlan.confirmed, true);
assert.equal(officialNumberPlan.vehicleResult.identityStatus, 'UNKNOWN',
  'confirmed planned models are not actual-day physical vehicle identity');
// Database has the 5680Y/5983Y split trains separately mapped to the
// Keiyo E233-5000 plan. A documented Y train must keep its train-specific
// published family and never be replaced by the generic M-number fallback.
for (const trainNumber of ['5680Y', '5983Y']) {
  const yPlan = sqlPlanVm.resolveTimetableRun(
    { trainNumber, calendar: 'odpt.Calendar:Weekday' },
    { ...bosoTemplate, 'odpt:trainNumber': trainNumber,
      _sqlVehicleMappingLevel: 'published_number_family_plan',
      _sqlVerifiedPublishedVehicleType: 'E233系5000番台',
      _sqlVerifiedPublishedVehicleSourceUrl: 'https://timetables.jreast.co.jp/2611/train/130/131952.html' },
    'Togane', { operator: 'JR-East' });
  assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
  assert.equal(yPlan.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
  assert.deepEqual(Array.from(yPlan.vehicleResult.vehiclePlan.models), ['E233系5000番台']);
  assert.equal(yPlan.vehicleResult.vehiclePlan.evidenceRole, 'inferred-published-number-family');
}
const bosoFamilyPlan = sqlPlanVm.resolveTimetableRun(
  { trainNumber: '1624M', calendar: 'odpt.Calendar:Weekday' },
  { ...bosoTemplate, _sqlVehicleMappingLevel: 'published_number_family_plan',
    _sqlVerifiedPublishedVehicleType: 'E233系（房総地区・改造車）',
    _sqlVerifiedPublishedVehicleSourceUrl: 'https://example.org/boso-fleet-evidence' },
  'Togane', { operator: 'JR-East' });
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
  'B-grade nominal plan must not enter the actual identity resolver');
assert.equal(bosoFamilyPlan.vehicleResult.identityStatus, 'UNKNOWN');
assert.equal(bosoFamilyPlan.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
assert.equal(bosoFamilyPlan.vehicleResult.vehiclePlan.evidenceRole,
  'inferred-published-number-family');
assert.deepEqual(Array.from(bosoFamilyPlan.vehicleResult.vehiclePlan.models),
  ['E233系（房総地区・改造車）']);
let unverifiedSql = checkSqlModel('official_service_vehicle_plan', '');
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
assert.equal(unverifiedSql.vehicleResult.vehiclePlan.status, 'PLANNED_CANDIDATES');
assert.equal(unverifiedSql.vehicleResult.vehiclePlan.iconPath, '',
  'uncertified SQL model cannot select a representative PNG');
unverifiedSql = checkSqlModel('official_single_fleet_plan', '');
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
assert.equal(unverifiedSql.vehicleResult.vehiclePlan.status, 'FLEET_REFERENCE',
  'an operator-wide single fleet is still a route reference');
unverifiedSql = checkSqlModel('source_single_type_candidate', '');
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
assert.equal(unverifiedSql.vehicleResult.vehiclePlan.status, 'PLANNED_CANDIDATES');
checkSqlModel('dated_schedule_rule', '');
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, 'E233系6000番台',
  'existing independent dated schedule evidence must retain its mapping');

// Imported/manual SQL source annotations can exist without an approved
// mapping (e.g. the Boso E233 autumn 2026 transition). A single annotated
// name is not a verified recurring weekday/holiday stock assignment.
const bosoUnmappedAnnotation = 'E233系（房総地区改造6両・所定計画家族／実車・代走未確定）';
for (const level of ['unresolved', 'conflicting_scheduled_evidence']) {
  const annotated = sqlPlanVm.resolveTimetableRun(
    { trainNumber: '1624M', calendar: 'odpt.Calendar:Weekday' },
    { ...bosoTemplate, _sqlVehicleMappingLevel: level,
      _sqlVehicleCandidateLabel: bosoUnmappedAnnotation,
      vehicleType: bosoUnmappedAnnotation },
    'Togane', { operator: 'JR-East' });
  assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
    'unmapped SQL annotations must not enter the exact identity resolver');
  assert.equal(annotated.vehicleResult.vehiclePlan.status, 'PLANNED_CANDIDATES',
    'unmapped one-model source annotation is still unverified');
  assert.equal(annotated.vehicleResult.vehiclePlan.evidenceRole, 'unverified-source-candidate');
  assert.equal(annotated.vehicleResult.vehiclePlan.representativeModel, '');
  assert.equal(annotated.vehicleResult.vehiclePlan.iconPath, '',
    'an unverified source annotation must never authorize a candidate PNG');
  assert.equal(annotated.vehicleResult.vehiclePlan.models[0], bosoUnmappedAnnotation,
    'keep the original annotation visible for provenance review');
}
// Old SQL rows carrying a model only in vehicleType are also unverified when
// the mapping level is unresolved, even without a separate candidate label.
const unmappedRawModel = sqlPlanVm.resolveTimetableRun(
  { trainNumber: '1632M', calendar: 'odpt.Calendar:Weekday' },
  { ...bosoTemplate, _sqlVehicleMappingLevel: 'unresolved',
    vehicleType: 'E233系（房総地区・改造車）' },
  'Sotobo', { operator: 'JR-East' });
assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
assert.equal(unmappedRawModel.vehicleResult.vehiclePlan.status, 'PLANNED_CANDIDATES');
assert.equal(unmappedRawModel.vehicleResult.vehiclePlan.iconPath, '');

const unmappedBosoPlan = sqlPlanVm.resolveTimetableRun(
  { trainNumber: '1624M', calendar: 'odpt.Calendar:Weekday' },
  bosoTemplate, 'Togane', { operator: 'JR-East' });
assert.equal(unmappedBosoPlan.vehicleResult.identityStatus, 'UNKNOWN');
assert.equal(unmappedBosoPlan.vehicleResult.vehiclePlan.status, 'FLEET_REFERENCE',
  'an unmapped Boso local must use a scoped route reference, not PLANNED_MODEL');
assert.equal(unmappedBosoPlan.vehicleResult.vehiclePlan.iconPath, '',
  'an unmapped local train must not acquire a representative PNG');
assert.equal(unmappedBosoPlan.vehicleResult.vehiclePlan.lineId, 'Togane');

const unknownKeiyoRapid = sqlPlanVm.resolveTimetableRun(
  { trainNumber: '3604A', calendar: 'odpt.Calendar:SaturdayHoliday' },
  bosoKeiyoRapid, 'Sotobo', { operator: 'JR-East' });
assert.equal(unknownKeiyoRapid.vehicleResult.identityStatus, 'UNKNOWN');
assert.equal(unknownKeiyoRapid.vehicleResult.vehiclePlan.status, 'FLEET_REFERENCE',
  'unmapped Keiyo through Rapid remains route stock reference');
assert.equal(unknownKeiyoRapid.vehicleResult.vehiclePlan.iconPath, '',
  'unverified Keiyo A-number Rapid cannot borrow an E233 or E235 PNG');
assert.deepEqual(Array.from(unknownKeiyoRapid.vehicleResult.vehiclePlan.models),
  ['E233系5000番台', 'E233系1000番台']);

// Remaining marker tests ensure planned references are not physical SVG identities.
const renderVm = vm.createContext({
  window: { TrainVehicle: { selectMarkerArtwork(p) {
    renderVm.captured = p;
    return renderVm.artwork;
  } } },
  _isTrainArtworkFailureActive() { return false; },
});
vm.runInContext(extract(renderSource,
  '  function _trainMarkerDomKind(spec) {',
  '  // Public identification boundary:'), renderVm);
renderVm.artwork = { kind: 'candidate', iconSrc: '', candidateAssets: [genericPng] };
const candidateSpec = renderVm._trainMarkerSpec(narrowed, 't1', 'Keiyo');
assert.equal(renderVm.captured.displayLineId, 'Keiyo');
assert.equal(candidateSpec.kind, 'candidate');
assert.equal(candidateSpec.compact, true);
assert.equal(renderVm._trainMarkerDomKind(candidateSpec), 'candidate');
renderVm.artwork = { kind: 'vehicle', iconSrc: genericPng, planned: true };
const plannedSpec = renderVm._trainMarkerSpec(unknownEstimate, 't2', 'Keiyo');
assert.equal(renderVm._trainMarkerDomKind(plannedSpec), 'planned');
assert.match(renderSource, /getAttribute\("data-marker-kind"\) !== _trainMarkerDomKind\(markerSpec\)/,
  'planned PNG must not be removed and reloaded on every refresh');
assert.match(renderSource, /setAttribute\("data-train-artwork", spec\.iconSrc\)/,
  'image DOM must retain its catalog provenance');
// Cross-line / stale tooltip labels cannot claim a physical model when PNG is withheld.
const tooltipContext = vm.createContext({
  window: {
    currentLang: 'en',
    TRAIN_TYPE_NAMES: {},
    TrainVehicle: { resolveCanonicalVehicle: name => identities[name] || null },
  },
  _trainPositionSourceText: () => 'Live',
  _trainDestText: value => value,
  t: () => '',
});
vm.runInContext(extract(renderSource,
  '  function _trainMarkerTitle(p, lineId) {',
  '  function _trainPositionSourceText(p) {'), tooltipContext);
const titledExact = {
  ...exact,
  vehicleResolution: {
    name: 'JR E233系5000番台', lineId: 'Keiyo', identityStatus: 'EXACT', sources: [],
  },
  trainNumber: '611Y',
};
assert.match(tooltipContext._trainMarkerTitle(titledExact, 'Keiyo'), /E233/);
assert.match(tooltipContext._trainMarkerTitle({
  ...titledExact, estimated: true, plannedVehicleCandidateStatus: 'dated_schedule_rule'
}, 'Keiyo'), /Timetable model \(not actual stock\).*E233/,
  'certified scheduled mapping must be labelled as timetable-only');
assert.match(tooltipContext._trainMarkerTitle({
  ...titledExact, estimated: true
}, 'Keiyo'), /Estimated-position model \(schedule unverified\).*E233/,
  'an estimated position with unrelated exact evidence is not a verified timetable model');
assert.ok(!tooltipContext._trainMarkerTitle(titledExact, 'Keiyo').includes('Timetable model'),
  'confirmed non-estimated vehicles must not acquire a timetable-only label');
assert.match(tooltipContext._trainMarkerTitle(titledExact, 'Keiyo'),
  /Mapped model \(physical stock unverified\).*E233/,
  'a mapped non-estimated model without physical evidence must not look like an actual car');

assert.ok(!tooltipContext._trainMarkerTitle(titledExact, 'Yamanote').includes('E233'),
  'stale cross-line title must not disclose an unverified vehicle');
assert.ok(!tooltipContext._trainMarkerTitle({
  ...titledExact, vehicleIdentityStatus: 'NARROWED',
}, 'Keiyo').includes('E233'), 'candidate identity must not appear in a title');
assert.ok(!tooltipContext._trainMarkerTitle({
  ...titledExact, vehicleResolvedUpstream: false,
}, 'Keiyo').includes('E233'), 'rejected identity must not appear in a title');
assert.match(tooltipContext._trainMarkerTitle({
  ...titledExact,
  vehicleResolvedFromRealtime: true,
  vehicleResolution: {
    ...titledExact.vehicleResolution,
    sources: ['official-realtime-car-number'],
  },
}, 'Yamanote'), /E233/, 'physical car proof may support a through-service label');

// Load the route-specific label helpers as well as the generic projection.
// A tooltip-only source extraction must still work without these helpers.
vm.runInContext(extract(renderSource,
  '  function _seibuCommuterCandidatesLabel(p, lineId, lang) {',
  '  function _trainFoldExactVehicleLabel(p, lineId, lang) {'), tooltipContext);
const seibuFleet = {
  estimated: true, trainType: 'Seibu.Ikebukuro.Local',
  vehicleIdentityStatus: 'NARROWED',
  vehiclePlan: { status: 'FLEET_REFERENCE', lineId: 'Ikebukuro',
    evidenceRole: 'route-fleet-reference',
    models: ['西武2000系', '西武40000系', '西武001系'] },
};
assert.match(tooltipContext._seibuCommuterCandidatesLabel(seibuFleet, 'Ikebukuro', 'en'),
  /Scheduled model unconfirmed.*2000.*40000/,
  'commuter fleet reference should show supported Seibu candidate names');
assert.ok(!tooltipContext._seibuCommuterCandidatesLabel(seibuFleet, 'Ikebukuro', 'en')
  .includes('001'), 'limited express stock cannot become commuter candidates');
assert.equal(tooltipContext._seibuCommuterCandidatesLabel(seibuFleet, 'SeibuToshima', 'en'), '',
  'Seibu candidate names must not leak to a different Seibu route');
assert.match(tooltipContext._trainMarkerTitle(seibuFleet, 'Ikebukuro'),
  /Scheduled model unconfirmed.*2000/,
  'the marker tooltip should use the same scoped Seibu reference');

const shonanFleet = {
  estimated: true, trainType: 'JR.Tokaido.Local',
  vehicleIdentityStatus: 'NARROWED',
  plannedVehicleCandidateStatus: 'source_single_type_candidate',
  vehiclePlan: { status: 'PLANNED_CANDIDATES', lineId: 'Tokaido',
    evidenceRole: 'unverified-source-candidate',
    models: ['E231系1000番台', 'E233系3000番台'] },
};
assert.match(tooltipContext._shonanFleetCandidatesLabel(shonanFleet, 'Tokaido', 'en'),
  /Scheduled model unconfirmed.*E231.*E233/,
  'two Shonan model candidates must remain references, not exact stock');
assert.equal(tooltipContext._shonanFleetCandidatesLabel(shonanFleet, 'UenoTokyo', 'en'), '',
  'Shonan candidates must not be projected onto a different line');
const liveShonan = { ...shonanFleet, estimated: false, positionSource: 'realtime-api',
  positionLineId: 'Tokaido',
  timetableFleetReference: { lineId: 'Tokaido', status: 'UNCONFIRMED_PLANNED_FLEET',
    models: ['E231系1000番台', 'E233系3000番台'] } };
assert.match(tooltipContext._shonanFleetCandidatesLabel(liveShonan, 'Tokaido', 'en'),
  /Scheduled model unconfirmed.*E231.*E233/,
  'a live train may describe a scoped timetable reference without choosing a PNG');
assert.equal(tooltipContext._shonanFleetCandidatesLabel(liveShonan, 'UenoTokyo', 'en'), '',
  'a live timetable fleet reference cannot cross lines');

// Planned models, candidate fleets and route references share a display layer,
// without turning any of them into real-time vehicle/formation identity.
vm.runInContext(extract(renderSource,
  '  function _trainFleetPlanLabel(p, lineId, lang) {',
  '  function _trainMarkerTitle(p, lineId) {'), tooltipContext);
const plannedFleet = {
  estimated: true, vehicleIdentityStatus: 'UNKNOWN',
  vehiclePlan: { status: 'PLANNED_MODEL', lineId: 'Keiyo',
    evidenceRole: 'timetable-plan', confirmed: true, models: ['JR E233系5000番台'] },
};
assert.match(tooltipContext._trainFleetPlanLabel(plannedFleet, 'Keiyo', 'en'),
  /Scheduled model confirmed.*E233/, 'official plan is confirmed only with source proof');
assert.match(tooltipContext._trainMarkerTitle(plannedFleet, 'Keiyo'),
  /Scheduled model confirmed.*E233/, 'accessible marker title must include binary plan status');
assert.match(tooltipContext._trainFleetPlanLabel(plannedFleet, 'Keiyo', 'zh'),
  /计划车型已确认.*E233/);
assert.equal(tooltipContext._trainFleetPlanLabel({
  ...plannedFleet, vehiclePlan: { ...plannedFleet.vehiclePlan, confirmed: false }
}, 'Keiyo', 'en').includes('Scheduled model confirmed'), false,
'a guessed model must not become confirmed simply because PLANNED_MODEL is set');
const inferredFleet = {
  estimated: true, vehicleIdentityStatus: 'UNKNOWN',
  trainNumber: '1624M',
  vehiclePlan: { status: 'PLANNED_MODEL', lineId: 'Togane',
    evidenceRole: 'inferred-published-number-family', models: ['E233系（房総地区・改造車）'] },
};
assert.match(tooltipContext._trainFleetPlanLabel(inferredFleet, 'Togane', 'en'),
  /Scheduled model unconfirmed.*E233/,
  'published-number evidence must have an inferred-family UI qualifier');
assert.match(tooltipContext._trainFleetPlanLabel(inferredFleet, 'Togane', 'ja'),
  /計画車種未確認.*E233/);
assert.match(tooltipContext._trainFleetPlanLabel(inferredFleet, 'Togane', 'zh'),
  /计划车型未确认.*E233/);
assert.match(tooltipContext._trainMarkerTitle(inferredFleet, 'Togane'),
  /Scheduled model unconfirmed.*E233/,
  'accessibility title must not silently imply a confirmed physical vehicle');
assert.equal(tooltipContext._trainFleetPlanLabel(inferredFleet, 'Sotobo', 'en'), '',
  'nominal family must not leak across the Sotobo/Togane segment boundary');
assert.equal(tooltipContext._trainFleetPlanLabel({ ...inferredFleet, estimated:false }, 'Togane', 'en'), '',
  'a planned family cannot masquerade as realtime stock');
assert.equal(tooltipContext._trainFleetPlanLabel(plannedFleet, 'Yamanote', 'en'), '',
  'planned fleet must never spill onto a different display line');
assert.equal(tooltipContext._trainFleetPlanLabel({ ...plannedFleet, estimated: false }, 'Keiyo', 'en'), '',
  'scheduled model must not be shown as the actual realtime car');
assert.equal(tooltipContext._trainFleetPlanLabel({
  ...plannedFleet, vehicleIdentityStatus: 'EXACT'
}, 'Keiyo', 'en'), '', 'actual confirmed identity cannot also be mislabeled as only planned');
const sqlCandidate = {
  ...plannedFleet, vehiclePlan: { status: 'PLANNED_CANDIDATES',
    evidenceRole: 'unverified-source-candidate', lineId: 'Keiyo',
    models: ['JR E233系5000番台'] },
};
assert.match(tooltipContext._trainFleetPlanLabel(sqlCandidate, 'Keiyo', 'en'),
  /Scheduled model unconfirmed.*E233/,
  'a single SQL source candidate must remain unverified, even with a catalog PNG');
assert.match(tooltipContext._trainMarkerTitle(sqlCandidate, 'Keiyo'),
  /Scheduled model unconfirmed/,
  'unverified SQL candidate must appear as a caution in accessible title');
assert.match(tooltipContext._trainFleetPlanLabel({
  ...plannedFleet, vehiclePlan: { status: 'FLEET_REFERENCE',
    evidenceRole: 'route-fleet-reference', lineId: 'Keiyo',
    models: ['E231系', 'E233系'] }
}, 'Keiyo', 'en'), /Scheduled model unconfirmed.*E231/,
  'route fleet is only a reference, not a train-specific plan');
assert.match(renderSource,
  /_trainFleetPlanLabel\(p, marker\._displayLineId \|\| "", lang\)/,
  'folded train list must show the same planned/candidate distinction');

vm.runInContext(extract(renderSource,
  '  function _trainFoldExactVehicleLabel(p, lineId, lang) {',
  '  function _trainFleetPlanLabel(p, lineId, lang) {'), tooltipContext);
const mappedModel = {
  ...titledExact, estimated: true, vehicleResolvedUpstream: true,
  vehicleIdentityStatus: 'EXACT', plannedVehicleCandidateStatus: 'dated_schedule_rule',
};
assert.match(tooltipContext._trainFoldExactVehicleLabel({
  ...mappedModel, plannedVehicleCandidateStatus: 'unresolved'
}, 'Keiyo', 'en'), /Estimated-position model reference.*not schedule-certified/,
  'folded list must not certify an incidental exact vehicle observation as a timetable model');
assert.match(tooltipContext._trainFoldExactVehicleLabel(mappedModel, 'Keiyo', 'en'),
  /Timetable model.*E233/, 'planned exact mapping is not a claim about actual physical stock');
assert.equal(tooltipContext._trainFoldExactVehicleLabel(mappedModel, 'Yamanote', 'en'), '',
  'mapped model cannot be displayed on another line without physical proof');
assert.equal(tooltipContext._trainFoldExactVehicleLabel({
  ...mappedModel, vehicleResolvedUpstream: false
}, 'Keiyo', 'en'), '', 'rejected mapping cannot be displayed as confirmed');
assert.match(tooltipContext._trainFoldExactVehicleLabel({
  ...mappedModel, estimated: false
}, 'Keiyo', 'en'), /Mapped model.*unverified/,
  'scheduled or indirectly mapped model must not be labeled physically confirmed');
assert.match(tooltipContext._trainFoldExactVehicleLabel({
  ...mappedModel, estimated: false, vehicleResolvedFromRealtime: true,
  vehicleResolution: {
    ...mappedModel.vehicleResolution, sources: ['official-realtime-car-number']
  }
}, 'Yamanote', 'en'), /Physically confirmed model/,
  'independently proven actual stock can be shown on a through line');
assert.match(renderSource,
  /_trainFoldExactVehicleLabel\(p, marker\._displayLineId \|\| "", lang\)/,
  'folded list must display confirmed model names with scoped evidence labels');



// Minimal SVG DOM exercises the actual image/circle creation, xlink, and failure fallback.
function svgNode(tagName) {
  const attrs = Object.create(null);
  const listeners = Object.create(null);
  return {
    tagName,
    children: [],
    attrs,
    listeners,
    isConnected: true,
    setAttribute(k, v) { attrs[k] = String(v); },
    setAttributeNS(ns, k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k] === undefined ? null : attrs[k]; },
    removeAttribute(k) { delete attrs[k]; },
    addEventListener(k, fn) { listeners[k] = fn; },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      child.parentNode = null;
    },
  };
}
const markerContext = vm.createContext({
  document: { createElementNS(ns, tag) { return svgNode(tag); } },
  _trainMarkerTitle: () => 'Train 611Y',
  _setTrainMarkerAccessibilityLabel: (node, text) => node.setAttribute('aria-label', text),
  _setTrainFormationAttribute: () => {},
  _rememberTrainArtworkFailure: () => {},
});
vm.runInContext(extract(renderSource,
  '  function _trainMarkerDomKind(spec) {',
  '  function _trainMarkerSpec(p, trainUid, lineId) {'), markerContext);
vm.runInContext(extract(renderSource,
  '  function _setTrainIconPosition(icon, px, py, p, lineId, isLoop) {',
  '  function _removeTrainLabels('), markerContext);
vm.runInContext(extract(renderSource,
  '  function _createTrainMarker(trainLayer, svgNS, trainUid, spec, px, py, p, lineId, isLoop, color, loc) {',
  '  function updateTrainLayer('), markerContext);
const markerLayer = svgNode('g');
const svgNS = 'http://www.w3.org/2000/svg';
const renderedImage = markerContext._createTrainMarker(
  markerLayer, svgNS, 't2', plannedSpec, 40, 50,
  unknownEstimate, 'Keiyo', false, '#008803', null,
);
assert.equal(renderedImage.tagName, 'image', 'verified plan PNG must be a real SVG image');
assert.equal(renderedImage.getAttribute('href'), genericPng);
assert.equal(renderedImage.getAttribute('data-train-artwork'), genericPng);
assert.equal(renderedImage.getAttribute('data-marker-kind'), 'planned');
assert.equal(renderedImage.getAttribute('data-marker-reference-only'), 'true');
assert.equal(renderedImage.getAttribute('x'), '33');
assert.equal(renderedImage.getAttribute('y'), '41');
assert.equal(renderedImage.getAttribute('aria-label'), 'Train 611Y');
const candidateMarker = markerContext._createTrainMarker(
  markerLayer, svgNS, 't1', candidateSpec, 80, 90,
  narrowed, 'Keiyo', false, '#008803', null,
);
assert.equal(candidateMarker.tagName, 'circle');
assert.equal(candidateMarker.getAttribute('data-marker-kind'), 'candidate');
assert.equal(candidateMarker.getAttribute('data-vehicle-candidate'), 'true');
assert.ok(!candidateMarker.getAttribute('href'), 'candidate must not carry an image URL');

renderedImage.listeners.error();
assert.ok(!markerLayer.children.includes(renderedImage),
  'failed PNG must be removed instead of leaving an invisible image');
assert.equal(markerLayer.children.filter(node => node.getAttribute('data-train-id') === 't2')[0].tagName,
  'circle', 'failed PNG must retain the train position as a neutral circle');

console.log('train PNG display contract: PASS (selection, scope, SVG DOM, fallback, tooltip)');

