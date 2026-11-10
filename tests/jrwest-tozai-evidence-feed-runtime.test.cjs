'use strict';
// The source-only JR Tozai evidence remains in SQL, not a UI card.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('JR-Tozai source evidence stays read-only, not a position or vehicle claim',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261109074500_jrwest_tozai_public_source_feed.sql','utf8');
 assert.match(sql,/published_jrwest_tozai_2611_public_evidence/);
 assert.match(sql,/security_invoker = true/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FOR SELECT TO anon, authenticated/);
 assert.match(sql,/vehicle_type IS NULL AND vehicle_png_path IS NULL/);
 assert.doesNotMatch(sql,/INSERT INTO\s+public\.train_timetable_|UPDATE\s+public\.train_timetable_/);
});
test('JR-Tozai no longer fetches or renders a supplementary source-link card',()=>{
 const html=fs.readFileSync('pages/trains.html','utf8');
 const js=fs.readFileSync('js/trains-page.js','utf8');
 const manifest=require('../scripts/page-scripts.json');
 assert.doesNotMatch(html,/trainsCorridorEvidence|train-corridor-evidence|trainsOfficialRuninfo/);
 assert.doesNotMatch(js,/TrainCorridorEvidence|updateCorridorEvidence|updateOfficialRuninfoSource/);
 assert.ok(!manifest.lazy.trains.includes('js/train-corridor-evidence.js'));
 assert.ok(!manifest.lazyScopes.trains['js/train-corridor-evidence.js']);
 assert.equal(fs.existsSync('js/train-corridor-evidence.js'),false);
});
