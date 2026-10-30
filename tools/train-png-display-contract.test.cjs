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

const genericPng = '../images/列车/JR東日本/JR東日本_E233系_5000番台.png';
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
assert.equal(choose({ ...exact, vehicleIconPath: 'images/列车/JR東日本/JR東日本_E233系_5000番台.png' }).iconSrc,
  genericPng, 'catalog root-relative path must resolve on pages/trains.html');
assert.equal(choose({ ...exact, vehicleIconPath: '/images/列车/JR東日本/JR東日本_E233系_5000番台.png' }).iconSrc,
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
console.log('train PNG display contract: PASS (exact, candidate, planned, scopes, paths, refresh)');
