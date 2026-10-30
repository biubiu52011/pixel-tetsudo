'use strict';

// Contract for the applied Supabase migration. Database integration checks are
// separately performed with SQL; this test verifies a future code change cannot
// silently reintroduce service-name-as-vehicle or unverified run links.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const sql=fs.readFileSync('supabase/migrations/20261030112329_separate_shinkansen_service_names_and_audit_run_links.sql','utf8');

assert.match(sql,/VIEW rail_audit\.shinkansen_service_labels WITH \(security_invoker = true\)/);
assert.match(sql,/VIEW public\.train_timetable_vehicle_resolution AS/);
assert.match(sql,/VIEW public\.train_timetable_source_resolution AS/);
assert.match(sql,/VIEW rail_audit\.train_run_timetable_reconciliation WITH \(security_invoker = true\)/);
for(const service of ['のぞみ','ひかり','こだま','さくら','みずほ','かもめ',
                      'つばさ','こまち','はやぶさ','はやて','やまびこ']) {
  assert.ok(sql.includes("'" + service + "'::text"),service+' must remain a service, not a vehicle');
}
const published=sql.split('CREATE OR REPLACE VIEW public.train_timetable_vehicle_resolution AS')[1]
  .split('CREATE OR REPLACE VIEW public.train_timetable_source_resolution AS')[0];
const source=sql.split('CREATE OR REPLACE VIEW public.train_timetable_source_resolution AS')[1]
  .split('CREATE OR REPLACE VIEW rail_audit.train_run_timetable_reconciliation WITH')[0];
for(const body of [published,source]){
  assert.match(body,/THEN NULL::text\s+ELSE [mv]+\.vehicle_type/,
    'a service label must never be promoted to vehicle_type');
  assert.match(body,/THEN 'unresolved'::text\s+ELSE COALESCE/,
    'a service label must stay unresolved as vehicle identity');
  assert.match(body,/line_key ~~ '%Shinkansen'/,
    'only Shinkansen service names may be reclassified');
}
const audit=sql.split('CREATE OR REPLACE VIEW rail_audit.train_run_timetable_reconciliation WITH')[1];
assert.match(audit,/current_verified/,'run linking needs independently verified timetable validity');
assert.match(audit,/source_revision_date/,'run linking must check source revision');
assert.match(audit,/service_date/,'run linking must check service date');
assert.match(audit,/candidate_count = 1/,'ambiguous train numbers must not auto-link');
assert.match(audit,/NO_EXACT_KEY_MATCH/);
assert.match(audit,/TIMETABLE_CURRENT_VALIDITY_UNVERIFIED/);
assert.match(audit,/verified_timetable_id/);
assert.doesNotMatch(sql,/\bUPDATE\s+train_runs\b/i,
  'reconciliation does not rewrite unverified actual run identities');
assert.match(sql,/REVOKE ALL ON rail_audit\.train_run_timetable_reconciliation/);
const seibu=fs.readFileSync(
  'supabase/migrations/20261030112949_quarantine_seibu_laview_legacy_vehicle_labels.sql','utf8');
assert.match(seibu,/CREATE OR REPLACE VIEW rail_audit\.seibu_laview_legacy_conflicts/);
assert.match(seibu,/40000系（Laview）/);
assert.match(seibu,/SeibuChichibu/);
assert.match(seibu,/Haijima/);
assert.match(seibu,/THEN NULL::text/);
assert.match(seibu,/THEN 'unresolved'::text/);
assert.match(seibu,/REVOKE ALL ON rail_audit\.seibu_laview_legacy_conflicts/);
assert.doesNotMatch(seibu,/\bUPDATE\s+public\.train_timetable_vehicle_mappings/i);
assert.doesNotMatch(seibu,/\bSET\s+vehicle_type\s*=\s*'001系'/i);
console.log('SQL service-name, Seibu legacy label and safe run-link safeguards: PASS');
