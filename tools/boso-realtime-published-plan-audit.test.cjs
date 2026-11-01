'use strict';

// Regression: realtime train IDs match a recurring published plan only when
// exact JR-East railway, train number, direction and source station agree.
// This audit is transient: published fleet labels are NOT actual carset IDs.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const api = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
const config = fs.readFileSync('data/core/runtime-config.js', 'utf8');
const start = api.indexOf('auditRealtimeLine: function(lineId, rows) {');
const end = api.indexOf('auditRealtimeRailwayIdentities: function(', start);
assert.ok(start >= 0 && end > start, 'realtime audit remains available');
const method = api.slice(start, end).trim().replace(/,\s*$/, '');

for (const line of ['SobuMain','Narita','NaritaAirportBranch','Uchibo','Sotobo','Togane','Kashima']) {
  assert.ok(config.includes('"' + line + '": true,'), line + ' is permitted for on-demand probe');
}
assert.match(config, /defaultMode: "HYBRID"/);
assert.match(api, /probeStatus: "realtime-source-fetch-failed"/);
assert.match(api, /window\.ODPT_BOSO_REALTIME_SOURCE_INVENTORY/);

const date = '2026-11-01';
const railway = 'odpt.Railway:JR-East.Uchibo';
const station = 'odpt.Station:JR-East.Uchibo.Kisarazu';
const direction = 'odpt.RailDirection:JR-East.Inbound';
const plan = {
  'odpt:railway': railway,
  'odpt:trainNumber': '129M',
  'odpt:railDirection': direction,
  '_serviceDate': date,
  'odpt:trainTimetableObject': [
    {'odpt:departureStation': station},
    {'odpt:arrivalStation': 'odpt.Station:JR-East.Uchibo.Kimitsu'}
  ],
  '_sqlVerifiedPublishedVehicleType': '209系（4両所定・計画車種）',
  '_sqlVehicleMappingLevel': 'published_number_family_plan',
  '_timetableValidity': 'undated_not_current_verified',
  '_timetableDateVerified': false
};
function identity(row) {
  return { key: String(row['odpt:railway'] || '').replace('odpt.Railway:', '').replace('.', '::') };
}
function auditor(plans) {
  const window = { ODPT_TIMETABLES: {'JR-East': plans} };
  return new Function(
    'getLineRailwayIdentity','LINE_TO_OPERATOR','parseRailwayIdentity',
    'window','_serviceDateJst',
    'return ({' + method + '}).auditRealtimeLine;'
  )(
    () => ({key:'JR-East::Uchibo',odptRailway:railway}),
    {Uchibo:'JR-East'}, identity, window, () => date
  );
}
const sample = {
  'odpt:railway': railway,
  'odpt:trainNumber': '129M',
  'odpt:railDirection': direction,
  'odpt:fromStation': station
};
function status(fn, live) {
  return fn('Uchibo',[live]).matchedRows[0].publishedPlanMatch;
}
const check = auditor([plan]);
const joined = status(check,sample);
assert.equal(joined.status,'unique-same-railway-number-and-station');
assert.equal(joined.publishedPlanModelLabel,plan._sqlVerifiedPublishedVehicleType);
assert.equal(joined.timetableDateVerified,false, 'do not promote an undated published plan');
assert.equal(status(check,{...sample,'odpt:trainNumber':'130M'}).status,'unmatched-train-number');
assert.equal(status(check,{...sample,'odpt:railDirection':'odpt.RailDirection:JR-East.Outbound'}).status,'direction-mismatch');
assert.equal(status(check,{...sample,'odpt:fromStation':'odpt.Station:JR-East.Uchibo.Chiba'}).status,'source-station-not-in-published-plan');
assert.equal(status(check,{...sample,'odpt:fromStation':''}).status,'number-only-no-api-station');
assert.equal(status(auditor([plan,plan]),sample).status,'ambiguous-published-plans');
assert.equal(status(auditor([]),sample).status,'no-current-service-day-plan-loaded');
assert.equal(check('Uchibo',[{...sample,'odpt:railway':'odpt.Railway:JR-East.Keiyo'}]).matchedCount,0,
  'same train number on another railway is not admissible');
assert.equal(check('Uchibo',[sample]).matchedRows[0].apiVehicleType,'',
  'an observed train number never manufactures an actual model');
console.log('Boso realtime / published plan identity audit: PASS');
