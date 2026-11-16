'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {derive,csvOf}=require('../tools/build-current-service-png-number-map.cjs');

const read=p=>fs.readFileSync(p,'utf8');
const origin=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const sources=JSON.parse(read('data/audits/png-current-fleet-evidence-20261116.json'));
const saved=JSON.parse(read('data/audits/png-current-service-number-map-20261116.json'));
const csv=read('data/audits/png-current-service-number-map-20261116.csv');

test('active family filter is derived only from 601 gallery PNGs and official fleet proofs',()=>{
 const rebuilt=derive(origin,sources);
 assert.deepEqual(rebuilt,saved,'current fleet mapping index must be generated, not hand-edited');
 assert.equal(csvOf(rebuilt),csv);
 assert.equal(saved.date,'2026-11-16');
 assert.equal(saved.summary.physicalPng,601);
 assert.equal(saved.summary.fleetFamilyVerified,117);
 assert.equal(saved.summary.activeFamilyWithExistingNumberScope,84);
 assert.equal(saved.summary.activeFamilyWithoutNumberScope,33);
 assert.equal(saved.summary.currentFleetStatusNotVerified,475);
 assert.equal(saved.summary.currentNumberReferencesPendingFleetReview,12);
 assert.equal(saved.summary.quarantinedArtwork,9);
 assert.equal(saved.summary.exactPhysicalCarsetsVerified,0);
});
test('a verified operating fleet is not an authorization for any arbitrary train number',()=>{
 const proof=new Map(sources.verified_fleet_artworks.map(x=>[x.image_path,x]));
 assert.equal(proof.size,117);
 const src=new Map(origin.pngIndex.map(x=>[x.path,x]));
 for(const a of [...saved.mapped,...saved.activeWithoutNumber]){
   assert.ok(proof.has(a.png),'a current operating model family needs an explicit source');
   assert.ok(fs.existsSync(a.png),'gallery PNG must actually exist '+a.png);
   assert.match(a.fleetEvidence.evidence_source_url,/^https:\/\//);
   assert.equal(a.actuallyObservedCarset,false);
   assert.equal(a.numberedServiceRequiresRuntimeGuards,true);
   const base=src.get(a.png);
   assert.ok(base&&!base.quarantined&&!base.alternateOnly);
   for(const rule of a.numberRules){
     assert.ok(base.directNumberRules.some(x=>x.ruleId===rule.ruleId));
     assert.notEqual(rule.actualVehicleConfirmed,true);
     assert.ok(!rule.validFrom||rule.validFrom<=saved.date);
     assert.ok(!rule.validTo||rule.validTo>=saved.date);
   }
   for(const roster of a.runtimeNumberRosters){
     assert.equal(roster.referenceOnly,true);
     assert.equal(roster.actualVehicleConfirmed,false);
     assert.ok(base.runtimeNumberRosters.some(x=>
       x.lineId===roster.lineId&&x.calendarType===roster.calendarType&&
       x.numberFamily===roster.numberFamily&&x.corridor===roster.corridor));
   }
 }
});
test('retirement schedule does not equal retirement already: JR West 500 still active Nov 2026',()=>{
 const a=saved.mapped.find(x=>x.png==='images/列车/JR西日本/JR西日本_500系.png');
 assert.ok(a,'West Japan 500 is scheduled in service through 2026-11');
 assert.ok(a.fleetEvidence.evidence_source_url.includes('westjr.co.jp'));
 assert.ok(a.fleetEvidence.note.includes('2027-01-13'));
});
test('new Rinkai 71-000 is active yet intentionally NOT assigned unsupported public train-number bands',()=>{
 const t=saved.activeWithoutNumber.find(x=>x.png==='images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png');
 assert.ok(t);
 assert.equal(t.numberRules.length,0);
 assert.equal(t.runtimeNumberRosters.length,0);
 const old=saved.mapped.find(x=>x.png==='images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png');
 assert.ok(old,'70-000 family remains operating during replacement overlap');
});
test('unknown is not retired; quarantined artwork never eligible for current vehicle PNG mapping',()=>{
 assert.equal(saved.pendingStatus.length,475);
 assert.ok(saved.pendingStatus.every(x=>x.reason));
 assert.ok(saved.quarantine.every(x=>!saved.mapped.some(m=>m.png===x.png)));
 assert.equal(new Set([...saved.mapped,...saved.activeWithoutNumber,...saved.pendingStatus,...saved.quarantine].map(x=>x.png)).size,601);
});
