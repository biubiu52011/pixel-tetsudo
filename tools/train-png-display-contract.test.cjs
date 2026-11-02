'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const vehicleSource = fs.readFileSync('js/train-vehicle.js', 'utf8');
const renderSource = fs.readFileSync('js/trains-render.js', 'utf8');

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
  /Line fleet references.*2000.*40000/,
  'commuter fleet reference should show supported Seibu candidate names');
assert.ok(!tooltipContext._seibuCommuterCandidatesLabel(seibuFleet, 'Ikebukuro', 'en')
  .includes('001'), 'limited express stock cannot become commuter candidates');
assert.equal(tooltipContext._seibuCommuterCandidatesLabel(seibuFleet, 'SeibuToshima', 'en'), '',
  'Seibu candidate names must not leak to a different Seibu route');
assert.match(tooltipContext._trainMarkerTitle(seibuFleet, 'Ikebukuro'),
  /Line fleet references.*2000/,
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
  /Shonan-color corridor fleet reference.*E231.*E233/,
  'two Shonan model candidates must remain references, not exact stock');
assert.equal(tooltipContext._shonanFleetCandidatesLabel(shonanFleet, 'UenoTokyo', 'en'), '',
  'Shonan candidates must not be projected onto a different line');
const liveShonan = { ...shonanFleet, estimated: false, positionSource: 'realtime-api',
  positionLineId: 'Tokaido',
  timetableFleetReference: { lineId: 'Tokaido', status: 'UNCONFIRMED_PLANNED_FLEET',
    models: ['E231系1000番台', 'E233系3000番台'] } };
assert.match(tooltipContext._shonanFleetCandidatesLabel(liveShonan, 'Tokaido', 'en'),
  /Shonan-color planned fleet.*E231.*E233/,
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
    evidenceRole: 'timetable-plan', models: ['JR E233系5000番台'] },
};
assert.match(tooltipContext._trainFleetPlanLabel(plannedFleet, 'Keiyo', 'en'),
  /Scheduled model.*E233/, 'verified model is identified as a scheduled reference');
assert.match(tooltipContext._trainMarkerTitle(plannedFleet, 'Keiyo'),
  /Scheduled model.*E233/, 'accessible marker title must include scheduled fleet reference');
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
  /Vehicle candidates.*unverified.*E233/,
  'a single SQL source candidate must remain unverified, even with a catalog PNG');
assert.match(tooltipContext._trainMarkerTitle(sqlCandidate, 'Keiyo'),
  /Vehicle candidates.*unverified/,
  'unverified SQL candidate must appear as a caution in accessible title');
assert.match(tooltipContext._trainFleetPlanLabel({
  ...plannedFleet, vehiclePlan: { status: 'FLEET_REFERENCE',
    evidenceRole: 'route-fleet-reference', lineId: 'Keiyo',
    models: ['E231系', 'E233系'] }
}, 'Keiyo', 'en'), /Line fleet reference.*not confirmed/,
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

