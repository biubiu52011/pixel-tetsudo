'use strict';
/* JR East November 2026 Suigun Hitachi-Ota <-> Mito through trains.
 * This is a repository-level migration contract test, not a substitute
 * for a live SQL verification or real-time rolling-stock observation.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync(
  'supabase/migrations/20261106233500_suigun_branch_2611_verified_30_through_trains.sql','utf8');

const pairs=[...sql.matchAll(
  /\('(\d{3}D)','(Inbound|Outbound)','(\d{2}:\d{2})','(\d{2}:\d{2})','(https:\/\/timetables\.jreast\.co\.jp\/2611\/train\/\d{3}\/\d{6}\.html)'\)/g
)].map(([,number,direction,arrival,departure,url])=>
  ({number,direction,arrival,departure,url}));

test('15 independently cited JR East published numbers have unique junction clocks',()=>{
  const inbound=['920D','922D','924D','926D','934D','936D','942D'];
  const outbound=['921D','923D','925D','927D','935D','937D','941D','943D'];
  assert.equal(pairs.length,15);
  assert.equal(new Set(pairs.map(p=>p.number)).size,15);
  assert.deepEqual(pairs.filter(p=>p.direction==='Inbound').map(p=>p.number).sort(),inbound);
  assert.deepEqual(pairs.filter(p=>p.direction==='Outbound').map(p=>p.number).sort(),outbound);
  assert.equal(new Set(pairs.map(p=>p.url)).size,15);
  for(const p of pairs){
    assert.ok(p.arrival<=p.departure,p.number+' arrival before departure');
  }
});

test('SQL merges exactly 15 numbers x two calendars only when source boundaries agree',()=>{
  assert.match(sql,/a\.line_key='Suigun'/);
  assert.match(sql,/b\.line_key='SuigunBranch'/);
  assert.match(sql,/b\.train_number=a\.train_number/);
  assert.match(sql,/b\.direction_urn=a\.direction_urn/);
  assert.match(sql,/b\.calendar_urn=a\.calendar_urn/);
  assert.match(sql,/expected<>30/);
  assert.match(sql,/root_end\.departure_clock IS DISTINCT FROM p\.departure_clock/);
  assert.match(sql,/child_start\.departure_clock IS DISTINCT FROM p\.departure_clock/);
  assert.match(sql,/root_t\.primary_train_number<>p\.train_number/);
  assert.match(sql,/child_t\.primary_train_number<>p\.train_number/);
  assert.match(sql,/station:.*Kami-Sugaya|odpt\.Station:JR-East\.Kami-Sugaya/);
});

test('canonical continuity keeps source provenance and requires twelve unique stops',()=>{
  assert.match(sql,/INSERT INTO public\.train_timetable_continuity\(/);
  assert.match(sql,/official_2611_same_number_boundary_clock/);
  assert.match(sql,/member_role='verified_continuation'/);
  assert.match(sql,/merge_first_stop=true/);
  assert.match(sql,/group_evidence='verified_continuation'/);
  assert.match(sql,/count\(DISTINCT s\.stop_sequence\)/i);
  assert.match(sql,/\)=12/);
  assert.match(sql,/\)<>30 THEN RAISE EXCEPTION/);
  assert.match(sql,/p\.root_id<>p\.child_id/);
  assert.match(sql,/root_t\.group_evidence<>'source_only'/);
  assert.doesNotMatch(sql,/UPDATE public\.(?:train_vehicle|fleet|vehicle_)/i);
  assert.doesNotMatch(sql,/actual_vehicle_confirmed\s*=/i);
});
