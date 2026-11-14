'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261115110000_tojo_wakoshi_source_correlated_through_links.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const api=fs.readFileSync('data/api/odpt-unified.js','utf8');
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const render=fs.readFileSync('js/trains-render.js','utf8');

test('Wakoshi links use BOTH operation and stop-clock evidence, not number only',()=>{
  assert.match(sql,/t\.calendar_urn=m\.calendar_urn AND t\.op=m\.op/);
  assert.match(sql,/gap BETWEEN 0 AND 6/);
  assert.match(sql,/tojo_matches=1 AND metro_matches=1/);
  assert.match(sql,/source_line_key IN \('Tojo','Fukutoshin','Yurakucho'\)/);
  assert.match(sql,/partner_line_key IN \('Tojo','Fukutoshin','Yurakucho'\)/);
  assert.match(sql,/count\(\*\) FROM public\.tojo_wakoshi_through_links\)<>710/);
  assert.match(sql,/source_line_key='Tojo'\)<>355/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.tojo_wakoshi_through_links FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT SELECT ON public\.tojo_wakoshi_through_links TO service_role/);
});
test('source-correlated reference cannot become real-time through train or exact carset',()=>{
  assert.match(sql,/match_level='source_correlated_not_date_verified'/);
  assert.match(sql,/authorizes_position=false/);
  assert.match(sql,/authorizes_vehicle=false/);
  assert.match(edge,/through_boundary_reference=\{/);
  assert.match(edge,/same_day_continuation_verified:false,actual_vehicle_confirmed:false/);
  assert.match(edge,/authorizes_position:false,authorizes_png:false/);
  assert.match(api,/"_sqlThroughBoundaryReference":run\.through_boundary_reference\|\|null/);
  assert.match(estimator,/throughBoundaryReference: tt\._sqlThroughBoundaryReference \|\| null/);
  assert.match(render,/handover\.same_day_continuation_verified===false/);
  assert.match(render,/handover\.authorizes_png===false/);
});
