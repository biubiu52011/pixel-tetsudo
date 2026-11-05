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
  // The production selector is browser-scoped; isolated VM tests must
  // provide its window object even when no route index is loaded.
  window: { TrainNumberPngRanges: null, VehicleGaragePngMap: null },
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

// JR-Kyushu 2611 Tsubame's source-verified 800-series plan has a native
// Kyushu-Shinkansen PNG. Unrelated line contexts must not inherit this art.
const kyushu800Plan = catalogVm.window.__testPlanResolution('800系', {
  lineId: 'KyushuShinkansen', operator: 'JR-Kyushu',
  source: 'database-verified-published-plan', _plannedArtworkInventory: true
});
assert.equal(kyushu800Plan.status, 'PLANNED_MODEL');
assert.equal(kyushu800Plan.iconPath,
  '../images/列车/JR九州/JR九州_800系.png',
  'official JR-Kyushu 800-series plan must resolve its own native PNG');
const sanyo800Plan = catalogVm.window.__testPlanResolution('800系', {
  lineId: 'SanyoShinkansen', operator: 'JR-Kyushu',
  source: 'database-verified-published-plan', _plannedArtworkInventory: true
});
assert.equal(sanyo800Plan.iconPath, '',
  'Kyushu 800-series plan PNG must not leak into Sanyo services');

// JR-West 2026-11 Kodama 944A, 954A and 974A officially plan a 500
// series and the Sanyo-specific JR-West generic 500 PNG must resolve.
// Kodama 958A, 966A, 876A, 976A show 700 series but this gallery
// has no scoped native JR-West 700 image. Kodama 970A varies 700/500
// by calendar date, so SQL must NOT create any fixed plan for it.
const sanyo500 = catalogVm.window.__testPlanResolution('500系', {
  lineId:'SanyoShinkansen', operator:'JR-West',
  source:'database-verified-published-plan', _plannedArtworkInventory:true
});
assert.equal(sanyo500.status, 'PLANNED_MODEL');
assert.equal(sanyo500.iconPath,
  '../images/列车/JR西日本/JR西日本_500系.png',
  'source-backed JR-West 500 series must resolve the native Sanyo PNG');
const wrongKyushu500 = catalogVm.window.__testPlanResolution('500系', {
  lineId:'KyushuShinkansen', operator:'JR-West',
  source:'database-verified-published-plan', _plannedArtworkInventory:true
});
assert.equal(wrongKyushu500.iconPath, '',
  'JR-West 500 Sanyo-only artwork cannot leak to Kyushu Shinkansen');
const missingSanyo700 = catalogVm.window.__testPlanResolution('700系', {
  lineId:'SanyoShinkansen', operator:'JR-West',
  source:'database-verified-published-plan', _plannedArtworkInventory:true
});
assert.equal(missingSanyo700.iconPath, '',
  'JR-West 700-series plan must remain neutral without matching native PNG');

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
// Official named-service plans are confirmed even when actual physical
// train identity remains UNKNOWN. The railway/timetable context must scope
// each plan independently: Oito Hakuba, Shinonoi Shinano, Joetsu Toki/Tanigawa.
for (const example of [
  { line: 'Oito', train: '8041M', calendar: 'odpt.Calendar:SaturdayHoliday',
    model: 'E353系', source: 'https://www.jreast.co.jp/railway/extratrain/2026/spring_list_1.pdf' },
  { line: 'Oito', train: '8042M', calendar: 'odpt.Calendar:SaturdayHoliday',
    model: 'E353系', source: 'https://www.jreast.co.jp/railway/extratrain/2026/spring_list_1.pdf' },
  { line: 'Shinonoi', train: '1001M', calendar: 'odpt.Calendar:Weekday',
    model: '383系', source: 'https://company.jr-central.co.jp/sustainability/social/conventional-line/' },
  { line: 'Shinonoi', train: '1026M', calendar: 'odpt.Calendar:SaturdayHoliday',
    model: '383系', source: 'https://company.jr-central.co.jp/sustainability/social/conventional-line/' },
  { line: 'JoetsuShinkansen', train: 'Toki301', calendar: 'odpt.Calendar:SaturdayHoliday',
    model: 'E7系', source: 'https://www.jreast.co.jp/multi/routemaps/joetsushinkansen.html' },
  { line: 'JoetsuShinkansen', train: 'Tanigawa401', calendar: 'odpt.Calendar:Weekday',
    model: 'E7系', source: 'https://www.jreast.co.jp/multi/routemaps/joetsushinkansen.html' }
]) {
  const planned = sqlPlanVm.resolveTimetableRun(
    { trainNumber: example.train, calendar: example.calendar },
    { _positionSource: 'supabase-train-run',
      _sqlVehicleMappingLevel: 'official_service_vehicle_plan',
      _sqlVerifiedPublishedVehicleType: example.model,
      _sqlVerifiedPublishedVehicleSourceUrl: example.source,
      _sqlVehiclePlanConfirmed: true },
    example.line, { operator: 'JR-East' });
  assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
    'officially confirmed plan must never become an actual train identity');
  assert.equal(planned.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(planned.vehicleResult.vehiclePlan.confirmed, true);
  assert.equal(planned.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
  assert.deepEqual(Array.from(planned.vehicleResult.vehiclePlan.models), [example.model]);
  assert.equal(planned.vehicleResult.vehiclePlan.lineId, example.line);
}
// 2026 November operator-published N700 stock is shared by numbered
// Sanyo/Kyushu THROUGH Mizuho and Sakura services. Route-only Kyushu Sakura
// numbers with no matching through segment must not inherit this conclusion.
for (const example of [
  { line: 'SanyoShinkansen', operator: 'JR-West', train: 'みずほ600',
    calendar: 'odpt.Calendar:Weekday' },
  { line: 'KyushuShinkansen', operator: 'JR-Kyushu', train: 'みずほ600',
    calendar: 'odpt.Calendar:Weekday' },
  { line: 'KyushuShinkansen', operator: 'JR-Kyushu', train: 'みずほ608',
    calendar: 'odpt.Calendar:SaturdayHoliday' },
  { line: 'SanyoShinkansen', operator: 'JR-West', train: 'さくら740',
    calendar: 'odpt.Calendar:Weekday' },
  { line: 'KyushuShinkansen', operator: 'JR-Kyushu', train: 'さくら401',
    calendar: 'odpt.Calendar:Weekday' },
  { line: 'KyushuShinkansen', operator: 'JR-Kyushu', train: 'さくら740',
    calendar: 'odpt.Calendar:SaturdayHoliday' }
]) {
  const n700 = sqlPlanVm.resolveTimetableRun(
    { trainNumber: example.train, calendar: example.calendar },
    { _positionSource: 'supabase-train-run',
      _sqlVehicleMappingLevel: 'official_service_vehicle_plan',
      _sqlVerifiedPublishedVehicleType: 'N700系',
      _sqlVerifiedPublishedVehicleSourceUrl:
        'https://www.jrkyushu-timetable.jp/sp/2611/0009/00091301.html',
      _sqlVehiclePlanConfirmed: true },
    example.line, { operator: example.operator });
  assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '',
    'operator-certified N700 scheduled family is not a carset identity');
  assert.equal(n700.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(n700.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
  assert.equal(n700.vehicleResult.vehiclePlan.confirmed, true);
  assert.equal(n700.vehicleResult.vehiclePlan.lineId, example.line);
  assert.deepEqual(Array.from(n700.vehicleResult.vehiclePlan.models), ['N700系']);
}
// Kyushu-only Sakura 400-series services have individually published N700
// or 800 stock. Neither subseries, physical formation, nor a calendar-agnostic
// 402 (special-day N700/800 substitution) may be inferred.
for (const example of [
  ['さくら403', '800系'],
  ['さくら404', 'N700系'],
  ['さくら405', '800系'],
  ['さくら406', '800系'],
  ['さくら407', '800系'],
  ['さくら409', '800系'],
  ['さくら410', 'N700系'],
  ['さくら411', '800系']
]) {
  const published = sqlPlanVm.resolveTimetableRun(
    { trainNumber: example[0], calendar:'odpt.Calendar:SaturdayHoliday' },
    { _positionSource: 'supabase-train-run',
      _sqlVehicleMappingLevel:'official_service_vehicle_plan',
      _sqlVerifiedPublishedVehicleType:example[1],
      _sqlVerifiedPublishedVehicleSourceUrl:
        'https://www.jrkyushu-timetable.jp/sp/2611/0034/00349101.html',
      _sqlVehiclePlanConfirmed:true },
    'KyushuShinkansen', {operator:'JR-Kyushu'});
  assert.equal(sqlPlanVm.resolvedInput.timetableVehicleType, '');
  assert.equal(published.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(published.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
  assert.equal(published.vehicleResult.vehiclePlan.confirmed, true);
  assert.deepEqual(Array.from(published.vehicleResult.vehiclePlan.models), [example[1]]);
}
for (const trainNumber of ['さくら400', 'さくら402']) {
  const unconfirmed = sqlPlanVm.resolveTimetableRun(
    { trainNumber, calendar:'odpt.Calendar:SaturdayHoliday' },
    { _positionSource:'supabase-train-run',
      _sqlVehicleMappingLevel:'unresolved',
      _sqlVehicleCandidateLabel:'N700系 / 800系' },
    'KyushuShinkansen', {operator:'JR-Kyushu'});
  assert.equal(unconfirmed.vehicleResult.vehiclePlan.confirmed, false,
    'an outdated train number or dated subseries exception remains unconfirmed');
}
const kyushuOnlySakura = sqlPlanVm.resolveTimetableRun(
  { trainNumber: 'さくら400', calendar: 'odpt.Calendar:SaturdayHoliday' },
  { _positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:'unresolved',
    _sqlVehicleCandidateLabel:'N700系 / 800系' },
  'KyushuShinkansen', { operator:'JR-Kyushu' });
assert.equal(kyushuOnlySakura.vehicleResult.vehiclePlan.confirmed, false,
  'Kyushu-only Sakura must not inherit N700 through-service certification');
assert.equal(kyushuOnlySakura.vehicleResult.identityStatus, 'UNKNOWN');

const unsupportedHakuba = sqlPlanVm.resolveTimetableRun(
  { trainNumber: '9095M', calendar: 'odpt.Calendar:Weekday' },
  { _positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:'unresolved',
    _sqlVehicleCandidateLabel:'E353系（あずさ）' },
  'Oito', { operator:'JR-East' });
assert.equal(unsupportedHakuba.vehicleResult.vehiclePlan.confirmed, false,
  'unmapped raw Azusa label on 9095M must remain unconfirmed');

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
}, 'Keiyo'), /Scheduled model unconfirmed.*E233/,
  'certified scheduled mapping must be labelled as timetable-only');
assert.match(tooltipContext._trainMarkerTitle({
  ...titledExact, estimated: true
}, 'Keiyo'), /Scheduled model unconfirmed.*E233/,
  'an estimated position with unrelated exact evidence is not a verified timetable model');
assert.ok(!tooltipContext._trainMarkerTitle(titledExact, 'Keiyo').includes('Scheduled model'),
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
assert.equal(tooltipContext._seibuCommuterCandidatesLabel({
  ...seibuFleet, vehiclePlan: { ...seibuFleet.vehiclePlan, confirmed:true,
    status:'PLANNED_MODEL' },
}, 'Ikebukuro', 'en'), '',
'a confirmed Seibu service must not be relabeled as an unconfirmed corridor fleet');
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
const noVehicleEvidence = {
  estimated: true, positionLineId: 'Togane', vehicleIdentityStatus: 'UNKNOWN',
  trainNumber: '9999M', vehiclePlan: null
};
assert.equal(tooltipContext._trainFleetPlanLabel(noVehicleEvidence, 'Togane', 'zh'),
  '计划车型未确认', 'a timetable with no model must still have one of the two states');
assert.equal(tooltipContext._trainFleetPlanLabel(noVehicleEvidence, 'Togane', 'en'),
  'Scheduled model unconfirmed');
assert.equal(tooltipContext._trainFleetPlanLabel(noVehicleEvidence, 'Sotobo', 'zh'), '',
  'missing evidence must not create an unconfirmed annotation on another line');
assert.match(tooltipContext._trainMarkerTitle(noVehicleEvidence, 'Togane'),
  /Scheduled model unconfirmed/, 'accessible title must include the binary unknown state');
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
// The fold list now computes the active display line exactly once before
// calling all fleet-label helpers. Verify BOTH the line scope and the call,
// not a historical inline spelling that no longer exists.
assert.match(renderSource,
  /var lineId=marker\._displayLineId \|\| p\.positionLineId \|\| p\.lineId \|\| "";/,
  'folded train list must use the current displayed line');
assert.match(renderSource,
  /_trainFleetPlanLabel\(p,lineId,lang\)/,
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
}, 'Keiyo', 'en'), /Scheduled model unconfirmed.*E233/,
  'folded list must not certify an incidental exact vehicle observation as a timetable model');
assert.match(tooltipContext._trainFoldExactVehicleLabel(mappedModel, 'Keiyo', 'en'),
  /Scheduled model unconfirmed.*E233/, 'planned exact mapping is not a claim about actual physical stock');
assert.match(tooltipContext._trainFoldExactVehicleLabel({
  ...mappedModel, vehiclePlan: {confirmed:true}
}, 'Keiyo', 'en'), /Scheduled model confirmed.*E233/,
'folded titles confirm only the officially sourced plan, not an assumed formation');
assert.match(tooltipContext._trainMarkerTitle({
  ...mappedModel, vehiclePlan: {confirmed:true}
}, 'Keiyo'), /Scheduled model confirmed.*E233/,
'accessible title uses the same two-valued plan confirmation');
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
  /_trainFoldExactVehicleLabel\(p,lineId,lang\)/,
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
    hasAttribute(k) { return attrs[k] !== undefined; },
    removeAttribute(k) { delete attrs[k]; },
    addEventListener(k, fn) { listeners[k] = fn; },
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
    },
    insertBefore(child, next) {
      if (child.parentNode) child.parentNode.removeChild(child);
      const index = this.children.indexOf(next);
      if (index < 0) return this.appendChild(child);
      child.parentNode = this;
      this.children.splice(index, 0, child);
    },
    querySelector(selector) {
      const attribute = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      const cls = selector.match(/^\.([\w-]+)$/);
      const find = (node) => {
        for (const child of node.children) {
          if (attribute && child.getAttribute(attribute[1]) != null &&
              (attribute[2] === undefined || child.getAttribute(attribute[1]) === attribute[2]))
            return child;
          if (cls && String(child.getAttribute('class') || '').split(' ').includes(cls[1]))
            return child;
          const nested = find(child);
          if (nested) return nested;
        }
        return null;
      };
      return find(this);
    },
    getBBox() { return {x:0,y:0,width:50,height:10}; },
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
  _resolveTrainLabelCollisions: () => {},
  _trainMoveDir: () => 'up',
  _isLoopDirName: () => false,
  _isOedoTailTrain: () => false,
  _trainDestText: () => '久里浜',
  _trainLabelSignature: () => 'Uchibo|ja|Inbound|Kurihama|Rapid',
  _trainLabelY: (_, py) => py + 21,
  _sixTrainDirectionLane: () => null,
  _isMobileView: () => false,
  window: { currentLang: 'ja', TRAIN_TYPE_NAMES: {} },
});
vm.runInContext(extract(renderSource,
  '  function _trainUnitContainer(child) {',
  '  // 描述当前显示的行；'), markerContext);
vm.runInContext(extract(renderSource,
  '  function _trainMarkerDomKind(spec) {',
  '  function _trainMarkerSpec(p, trainUid, lineId) {'), markerContext);
vm.runInContext(extract(renderSource,
  '  function _setTrainIconPosition(icon, px, py, p, lineId, isLoop) {',
  '  function _removeTrainLabels('), markerContext);
vm.runInContext(extract(renderSource,
  '  function _createTrainMarker(trainLayer, svgNS, trainUid, spec, px, py, p, lineId, isLoop, color, loc) {',
  '  function updateTrainLayer('), markerContext);
vm.runInContext(extract(renderSource,
  '  function appendTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId) {',
  '  // 将已创建的列车标签移动到'), markerContext);
vm.runInContext(extract(renderSource,
  '  function _moveTrainLabels(trainLayer, trainUid, px, py, p, lineId) {',
  '  // 让标签内容与当前服务区段保持同步'), markerContext);
vm.runInContext(extract(renderSource,
  '  function _syncTrainLabels(trainLayer, svgNS, trainUid, px, py, p, lineId) {',
  '  function updateRunningInfo('), markerContext);
vm.runInContext(extract(renderSource,
  '  function _pruneDetachedTrainParts(trainLayer) {',
  '  function _resolveTrainLabelCollisions('), markerContext);
assert.match(renderSource, /_pruneDetachedTrainParts\(trainLayer\);/,
  'global incremental refresh must sanitize ungrouped train elements');
assert.match(renderSource, /var _duplicateUnit = _trainUnitContainer\(_existingMarker\)/,
  'duplicate detection must dispose the full component, not only its circle');
assert.match(renderSource,
  /if \(existingIcon && !_trainUnitContainer\(existingIcon\)\)/,
  'legacy ungrouped markers must be replaced by a common SVG train unit');
assert.match(renderSource,
  /existingIcon = _createTrainComponent\(trainLayer, svgNS, trainUid/,
  'map renderer must create ONE complete component, not a marker then a separate label');
assert.doesNotMatch(renderSource,
  /markerById\[String\(trainUid\)\] = existingIcon;\s*_syncTrainLabels\(/,
  'train component ownership cannot be split across two rendering calls');
assert.match(renderSource, /_moveTrainComponent\(_icon, trainLayer, trainUid/,
  'animation frame moves the entire component with one invocation');
const markerLayer = svgNode('g');
const svgNS = 'http://www.w3.org/2000/svg';
const pngPosition = { ...unknownEstimate,
  railDirection:'odpt.RailDirection:Inbound',
  destinationStation:'odpt.Station:JR-East.Yokosuka.Kurihama' };
const renderedImage = markerContext._createTrainComponent(
  markerLayer, svgNS, 't2', plannedSpec, 40, 50,
  pngPosition, 'Keiyo', false, '#008803', null,
);
assert.equal(renderedImage.tagName, 'image', 'verified plan PNG must be a real SVG image');
assert.equal(renderedImage.getAttribute('href'), genericPng);
assert.equal(renderedImage.getAttribute('data-train-artwork'), genericPng);
assert.equal(renderedImage.getAttribute('data-marker-kind'), 'planned');
assert.equal(renderedImage.getAttribute('data-marker-reference-only'), 'true');
assert.equal(renderedImage.getAttribute('x'), '-7');
assert.equal(renderedImage.getAttribute('y'), '-9');
const trainUnit = renderedImage.parentNode;
assert.equal(trainUnit.getAttribute('data-train-unit-id'), 't2');
assert.equal(trainUnit.getAttribute('transform'), 'translate(40,50)',
  'the SVG unit, not the image, owns the world-space train position');
assert.ok(markerLayer.children.includes(trainUnit));
assert.equal(trainUnit.getAttribute('data-train-component-id'), 't2',
  'one component owns one train stable key on the SVG root');
const unitLabel = trainUnit.querySelector('[data-train-label-for="t2"]');
assert.ok(unitLabel, 'the route caption and marker must belong to one train group');
assert.equal(unitLabel.getAttribute('data-label-signature'),
  'Uchibo|ja|Inbound|Kurihama|Rapid');
assert.equal(unitLabel.querySelector('.train-label-dir').getAttribute('y'), '21',
  'the destination label Y must be relative to its own train center');
// Regression: previously an artwork marker at Y=379 could leave its
// 久里浜 label stranded at Y=478 after an independent update.
markerContext._moveTrainComponent(renderedImage, markerLayer, 't2',
  159.5, 379, pngPosition, 'Uchibo', false);
assert.equal(trainUnit.getAttribute('transform'), 'translate(159.5,379)');
assert.equal(renderedImage.getAttribute('y'), '-9');
assert.equal(unitLabel.querySelector('.train-label-dir').getAttribute('y'), '21');
assert.equal(unitLabel.parentNode, renderedImage.parentNode,
  'marker and label must never drift into separate world-space coordinate systems');
markerContext._moveTrainComponent(renderedImage, markerLayer, 't2',
  159.5, 459, pngPosition, 'Uchibo', false);
// In actual RAF frames the marker's display-state snapshot advances together
// with the common SVG unit. Simulate that before an async PNG error.
renderedImage._displayX = 159.5;
renderedImage._displayY = 459;
assert.equal(trainUnit.getAttribute('transform'), 'translate(159.5,459)');
assert.equal(unitLabel.querySelector('.train-label-dir').getAttribute('y'), '21',
  'asynchronous artwork callbacks cannot strand a caption at an old Y');
renderedImage.listeners.load();
assert.equal(trainUnit.getAttribute('transform'), 'translate(159.5,459)');
assert.equal(renderedImage.getAttribute('aria-label'), 'Train 611Y');
const circlePosition = { ...narrowed,
  railDirection:'odpt.RailDirection:Outbound',
  destinationStation:'odpt.Station:JR-East.Uchibo.Kimitsu' };
const candidateMarker = markerContext._createTrainComponent(
  markerLayer, svgNS, 't1', candidateSpec, 80, 90,
  circlePosition, 'Keiyo', false, '#008803', null,
);
assert.equal(candidateMarker.tagName, 'circle');
assert.equal(candidateMarker.getAttribute('data-marker-kind'), 'candidate');
assert.equal(candidateMarker.getAttribute('data-vehicle-candidate'), 'true');
assert.ok(!candidateMarker.getAttribute('href'), 'candidate must not carry an image URL');
const candidateUnit = candidateMarker.parentNode;
assert.equal(candidateUnit.getAttribute('data-train-unit-id'), 't1',
  'unverified vehicle candidates must also render within one SVG unit');
assert.equal(candidateMarker.getAttribute('cx'), '0');
assert.equal(candidateMarker.getAttribute('cy'), '0');
assert.equal(candidateUnit.getAttribute('data-train-component-id'),'t1');
const candidateLabel = candidateUnit.querySelector('[data-train-label-for="t1"]');
assert.ok(candidateLabel, 'candidate/neutral circle and destination have one parent');
markerContext._moveTrainComponent(candidateMarker,markerLayer,'t1',
  120,175,circlePosition,'Uchibo',false);
assert.equal(candidateUnit.getAttribute('transform'),'translate(120,175)');
assert.equal(candidateMarker.getAttribute('cx'),'0');
assert.equal(candidateMarker.getAttribute('cy'),'0');
assert.equal(candidateLabel.querySelector('.train-label-dir').getAttribute('y'),'21');
assert.equal(candidateLabel.parentNode,candidateMarker.parentNode,
  '177M-style neutral circle and its arrow/君津 must never be sibling train-layer elements');

// Regression for iPhone Hachiko screenshots: candidateAssets are two
// ALTERNATIVE car models, not two physical cabs on the same train.
renderVm.artwork = {kind:'candidate',iconSrc:'',planned:true,
  candidateAssets:[genericPng,otherPng]};
const dualFleetSpec = renderVm._trainMarkerSpec(narrowed,'hachiko-461E','Hachiko');
assert.equal(dualFleetSpec.kind,'candidate');
assert.equal(dualFleetSpec.compact,true,
  'a pair of potential vehicle images must NEVER request a wide marker');
assert.equal(dualFleetSpec.planned,false,
  'two candidate models do not certify a single planned rolling-stock type');
const dualFleetMarker=markerContext._createTrainComponent(
  markerLayer,svgNS,'hachiko-461E',dualFleetSpec,90,110,
  {...circlePosition,trainNumber:'461E'},'Hachiko',false,'#008803',null);
assert.equal(dualFleetMarker.tagName,'circle',
  'candidate pairs must render as ONE circle, never a double-headed SVG group');
assert.equal(dualFleetMarker.getAttribute('data-vehicle-candidate'),'true');
assert.equal(dualFleetMarker.children.filter(node=>node.tagName==='image').length,0,
  'a train location may not contain paired candidate cab images');
assert.equal(dualFleetMarker.parentNode.getAttribute('data-train-unit-id'),'hachiko-461E');
// Even a misconfigured consumer setting compact:false must not draw both.
const defensiveMarker=markerContext._createTrainMarker(
  markerLayer,svgNS,'hachiko-direct',
  {...dualFleetSpec,compact:false},120,120,circlePosition,
  'Hachiko',false,'#008803',null);
assert.equal(defensiveMarker.tagName,'circle');
assert.equal(defensiveMarker.children.length,0);

// Chuo Main no-evidence stock must retain ONE neutral location marker;
// never substitute an invented E231/211 PNG or a Unicode train glyph.
renderVm.artwork={kind:'unresolved',iconSrc:''};
const chuoUnknownSpec=renderVm._trainMarkerSpec({
  ...narrowed,trainNumber:'2201M',positionSource:'supabase-train-run'
},'chuo-2201','ChuoMain');
assert.equal(chuoUnknownSpec.kind,'unresolved');
assert.equal(Object.hasOwn(chuoUnknownSpec,'genericFront'),false);
const chuoUnknownNode=markerContext._createTrainComponent(
  markerLayer,svgNS,'chuo-2201',chuoUnknownSpec,70,100,
  {...circlePosition,trainNumber:'2201M'},'ChuoMain',false,'#ee6b28',null);
assert.equal(chuoUnknownNode.tagName,'circle');
assert.equal(chuoUnknownNode.getAttribute('data-vehicle-unresolved'),'true');
assert.equal(chuoUnknownNode.parentNode.getAttribute('data-train-unit-id'),'chuo-2201');
assert.equal(chuoUnknownNode.getAttribute('cx'),'0');
assert.equal(chuoUnknownNode.getAttribute('cy'),'0');
markerContext._moveTrainComponent(chuoUnknownNode,markerLayer,'chuo-2201',
  100,130,circlePosition,'ChuoMain',false);
assert.equal(chuoUnknownNode.parentNode.getAttribute('transform'),'translate(100,130)');

renderedImage.listeners.error();
assert.ok(markerLayer.children.includes(trainUnit),
  'PNG failure swaps only the image; the train component must not unmount');
const fallbackUnit = markerLayer.children.find(node =>
  node.getAttribute('data-train-unit-id') === 't2');
assert.ok(fallbackUnit);
const fallbackMarker = fallbackUnit.querySelector('[data-train-id="t2"]');
assert.equal(fallbackMarker.tagName, 'circle',
  'failed PNG must retain the train position as a neutral circle');
assert.equal(fallbackUnit.getAttribute('transform'), 'translate(159.5,459)');
assert.ok(fallbackUnit.querySelector('[data-train-label-for="t2"]'),
  'image failure must preserve the matching destination caption');
assert.equal(markerLayer.children.filter(node =>
  node.getAttribute('data-train-unit-id') === 't2').length, 1,
  'image failure must not create duplicate train units');
assert.equal(fallbackUnit, trainUnit,
  'the exact same TrainComponent must survive an image error');
const sixLayer = svgNode('g');
sixLayer.ownerSVGElement = {__geometry:{isSixShapedLoop:true}};
const oedoPosition = { ...unknownEstimate,
  railDirection:'odpt.RailDirection:Inbound',
  destinationStation:'odpt.Station:Toei.Oedo.Tochomae',stationIndex:1 };
const sixMarker = markerContext._createTrainComponent(
  sixLayer,svgNS,'oedo',plannedSpec,40,50,oedoPosition,'Oedo',false,'#008803',null);
const sixUnit = sixMarker.parentNode;
assert.equal(sixUnit.getAttribute('data-train-unit-id'),'oedo',
  'even six-shaped Oedo markers must belong to exactly one unit');
assert.equal(sixUnit.parentNode,sixLayer);
assert.equal(sixUnit.getAttribute('transform'),'translate(40,50)');
assert.equal(sixMarker.getAttribute('x'),'-7');
assert.equal(sixMarker.getAttribute('y'),'-9');
assert.equal(sixUnit.getAttribute('data-train-component-id'),'oedo');
const sixLabel = sixUnit.querySelector('[data-train-label-for="oedo"]');
assert.ok(sixLabel, 'six-shaped Oedo keeps its absolute corridor label in the same DOM unit');
assert.match(sixLabel.getAttribute('transform'),/^translate\(-40,-50\)/,
  'fixed corridor coordinates must compensate for the parent train transform');
markerContext._moveTrainComponent(sixMarker,sixLayer,'oedo',
  60,80,oedoPosition,'Oedo',false);
assert.equal(sixUnit.getAttribute('transform'),'translate(60,80)');
assert.match(sixLabel.getAttribute('transform'),/^translate\(-60,-80\)/,
  'Oedo fixed corridor stays in place even when the one-unit train moves');
assert.equal(sixLabel.parentNode,sixMarker.parentNode);
// Test healing a legacy detached caption during an incremental refresh.
sixLayer.appendChild(sixLabel);
assert.equal(sixLabel.parentNode,sixLayer);
markerContext._syncTrainLabels(sixLayer,svgNS,'oedo',60,80,oedoPosition,'Oedo');
assert.ok(sixUnit.querySelector('[data-train-label-for="oedo"]'),
  'legacy detached captions must be recreated inside their own train unit');
assert.equal(sixLayer.children.filter(node=>node.getAttribute('data-train-label-for')==='oedo').length,0,
  'legacy standalone label must no longer exist next to the train unit');
assert.ok(sixUnit.querySelector('[data-train-label-for="oedo"]').parentNode===sixUnit);

// Global contract: all operators and all line geometries use exactly the
// same TrainComponent lifecycle. This covers generic timetable circles,
// through rapid trains, numbered Shinkansen, private railways and Oedo loops.
const globalSampleLines = [
  'Uchibo', 'Sotobo', 'Togane', 'Yamanote', 'Keiyo',
  'SobuMain', 'Narita', 'JobanMain', 'SeibuTamagawa',
  'Oedo', 'SanyoShinkansen', 'KyushuShinkansen',
  'TohokuShinkansen', 'JoetsuShinkansen'
];
for (let i = 0; i < globalSampleLines.length; i++) {
  const lineId = globalSampleLines[i], uid = 'global-component-' + i;
  const layer = svgNode('g');
  if (lineId === 'Oedo') layer.ownerSVGElement =
    {__geometry:{isSixShapedLoop:true}};
  const position = { ...narrowed,
    railDirection:'odpt.RailDirection:Outbound',
    destinationStation:'odpt.Station:JR-East.Uchibo.Kimitsu' };
  const icon = markerContext._createTrainComponent(
    layer,svgNS,uid,candidateSpec,100,160,
    position,lineId,lineId==='Oedo','#008803',null);
  const root = icon.parentNode;
  assert.equal(layer.children.length,1,
    lineId + ': create must mount one complete root component');
  assert.equal(root.getAttribute('data-train-component-id'),uid);
  assert.equal(root.querySelector('[data-train-id="'+uid+'"]'),icon);
  assert.ok(root.querySelector('[data-train-label-for="'+uid+'"]'),
    lineId + ': destination and icon must mount atomically');
  markerContext._moveTrainComponent(icon,layer,uid,125,190,
    position,lineId,lineId==='Oedo');
  assert.equal(root.getAttribute('transform'),'translate(125,190)',
    lineId + ': motion must belong to the whole component');
  markerContext._pruneDetachedTrainParts(layer);
  assert.equal(layer.children.length,1,
    lineId + ': global sweep must preserve valid component');
  assert.equal(icon.parentNode,root);
}
// Old renderer may have left a sibling circle, standalone caption, or a
// duplicate train component after a PNG failure or route refresh.
const globalOrphans = svgNode('g');
const healthyIcon = markerContext._createTrainComponent(
  globalOrphans,svgNS,'healthy',candidateSpec,100,180,
  {railDirection:'odpt.RailDirection:Outbound',
    destinationStation:'odpt.Station:JR-East.Uchibo.Kimitsu'},
  'Uchibo',false,'#008803',null);
const healthyRoot = healthyIcon.parentNode;
const looseCircle = svgNode('circle');
looseCircle.setAttribute('data-train-id','stray-circle');
globalOrphans.appendChild(looseCircle);
const looseCaption = svgNode('g');
looseCaption.setAttribute('data-train-label-for','stray-caption');
globalOrphans.appendChild(looseCaption);
const emptyComponent = svgNode('g');
emptyComponent.setAttribute('data-train-component-id','empty');
globalOrphans.appendChild(emptyComponent);
const duplicateComponent = svgNode('g');
duplicateComponent.setAttribute('data-train-component-id','healthy');
const duplicateIcon = svgNode('circle');
duplicateIcon.setAttribute('data-train-id','healthy');
duplicateComponent.appendChild(duplicateIcon);
globalOrphans.appendChild(duplicateComponent);
// The rightmost duplicate is kept, so a duplicate of the real healthy train
// must not win by DOM order when it lacks a matching destination caption.
// Move it earlier so the live component is the last and wins.
globalOrphans.removeChild(duplicateComponent);
globalOrphans.children.unshift(duplicateComponent);
duplicateComponent.parentNode=globalOrphans;
markerContext._pruneDetachedTrainParts(globalOrphans);
assert.deepEqual(globalOrphans.children,[healthyRoot],
  'all lines: remove orphan circles, captions, empty and duplicate units');
assert.ok(healthyRoot.querySelector('[data-train-label-for="healthy"]'),
  'global sanitization must preserve the complete live unit');

console.log('train PNG display contract: PASS (selection, scope, SVG DOM, fallback, tooltip)');

