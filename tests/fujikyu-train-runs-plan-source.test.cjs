const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const edge = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');

test('plan-only fallback admits static timetable revisions without enabling realtime', () => {
  assert.match(edge, /allowStaticTimetableRevision/);
  assert.match(edge, /sourceType === 'official'/);
  assert.match(edge, /allowStaticTimetableRevision && sourceType === 'timetable'/);
  assert.match(edge, /sourceConfig\?\.sql_planned_fallback_enabled === true/);
  assert.match(edge, /sourceConfig\?\.timetable_api_enabled !== true/);
  assert.match(edge, /sourceConfig\?\.realtime_position_api_enabled !== true/);
  assert.match(edge, /timetable_operator,sql_planned_fallback_enabled,timetable_api_enabled,realtime_position_api_enabled/);
  assert.match(edge, /timetable_date_verified: isOfficialRevision\(selectedRevision\)/);
  assert.match(edge, /isOfficialRevision\(selectedRevision\) \? 'published_revision' : 'unverified'/);
});

console.log('Fujikyu train-runs plan-source contract: PASS');
