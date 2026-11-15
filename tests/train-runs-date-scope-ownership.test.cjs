'use strict';
// Verify date gates without executing the Deno handler or requiring database keys.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const first = source.indexOf('function filterDateScopedTemplates(');
const last = source.indexOf('\nfunction selectRevision(', first);
assert.ok(first >= 0 && last > first, 'one dedicated source-date owner');
const js = source.slice(first,last)
  .replace('templates: any[]','templates')
  .replace('lineId: string','lineId')
  .replace('serviceDate: string','serviceDate')
  .replace('): any[]',')')
  .replaceAll('(row: any)','(row)')
  .replaceAll('(date: any)','(date)');
const filter = vm.runInNewContext(js + '\nfilterDateScopedTemplates');
function retained(line, rows) {
  return Array.from(filter(rows,line,'2026-11-16'), row => row.id);
}
test('all date-scoped source guards have one invocation after dated imports', () => {
  assert.equal((source.match(/templates = filterDateScopedTemplates\(/g) || []).length,1);
  assert.ok(source.indexOf('templates = filterDateScopedTemplates(') >
    source.indexOf('templates.push(...rapidSources)'));
});
test('Fukuchiyama date-scoped and retired records are excluded, historical NULL stays', () => {
  assert.deepEqual(retained('Fukuchiyama',[
    {id:'historical'}, {id:'sample-good',source_path:'official-sampled:fukuchiyama:2611',operating_dates:['2026-11-16']},
    {id:'sample-missing',source_path:'official-sampled:fukuchiyama:2611'},
    {id:'retired',operating_dates:[]}, {id:'old',operating_dates:['2026-10-01']}
  ]), ['historical','sample-good']);
});
test('Shinkansen exact-date whitelist preserves NULL recurrence but rejects []', () => {
  assert.deepEqual(retained('TokaidoShinkansen',[
    {id:'recurring'}, {id:'retired',operating_dates:[]},
    {id:'active',operating_dates:['2026-11-16']},
    {id:'other-date',operating_dates:['2026-11-15']}
  ]), ['recurring','active']);
});
test('Saikyo sampled sources need a date; Kakogawa NULL source retains its historical scope', () => {
  assert.deepEqual(retained('SaikyoKawagoe',[
    {id:'history'}, {id:'missing',source_path:'official-sampled:jreast:2611:SaikyoKawagoe:abc'},
    {id:'active',source_path:'official-sampled:jreast:2611:SaikyoKawagoe:abc',operating_dates:['2026-11-16']}
  ]), ['history','active']);
  assert.deepEqual(retained('KakogawaLine',[
    {id:'history',source_path:'official-202611:jrwest-kakogawa-x'},
    {id:'inactive',source_path:'official-202611:jrwest-kakogawa-x',operating_dates:[]},
    {id:'active',source_path:'official-202611:jrwest-kakogawa-x',operating_dates:['2026-11-16']}
  ]), ['history','active']);
});
test('unrelated lines do not acquire any of these source-date rules', () => {
  assert.deepEqual(retained('JobanMain',[
    {id:'any'}, {id:'historical-date',operating_dates:[]}
  ]), ['any','historical-date']);
});
