'use strict';
/* Specific November 2026 official source gaps on the Hitachi-Ota branch.
 * Protect the canonical Source ID -> timetable membership -> 6-stop chain.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync(
 'supabase/migrations/20261106230000_suigun_branch_2611_missing_weekday_and_terminals.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const official={
 '929D':{id:'261124300929',train:'025061',clock:'11:50'},
 '930D':{id:'261124300930',train:'025181',clock:'12:14'},
 '931D':{id:'261124300931',train:'025071',clock:'12:49'},
 '932D':{id:'261124300932',train:'025191',clock:'13:25'}
};
test('four missing Weekday source trains are fully identified by official stop pages',()=>{
 for(const [number,ref] of Object.entries(official)){
  assert.ok(migration.includes(ref.id),number+' source ID');
  assert.ok(migration.includes(String(Number(ref.id)+10000)),number+' canonical ID');
  assert.ok(migration.includes(ref.train+'.html'),number+' official reference');
  assert.ok(migration.includes(ref.clock),number+' end clock');
 }
 assert.match(migration,/INSERT INTO public\.train_timetables\(/);
 assert.match(migration,/INSERT INTO public\.train_timetable_members\(/);
 assert.match(migration,/INSERT INTO public\.manual_timetable_template_stops\(/);
 assert.match(migration,/official-2611-number-and-stops/);
 assert.match(migration,/ON CONFLICT\(source_template_id\) DO NOTHING/);
});
test('eight official inbound times close 14 source rows at Kami-Sugaya',()=>{
 const pairs=[['928D','10:25'],['930D','12:14'],['932D','13:25'],
 ['938D','17:44'],['940D','18:41'],['944D','20:24'],
 ['946D','21:24'],['948D','22:35']];
 for(const [number,arr] of pairs){
  assert.ok(migration.includes(number),number);
  assert.ok(migration.includes(arr),arr);
 }
 assert.ok(migration.includes('<> 14'));
 assert.ok(migration.includes('stops.stops<>6'));
 assert.ok(migration.includes('published_suigun_branch_2611_stop_completion_audit'));
 assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'));
});
test('canonical API scopes all 30 Weekday and 30 Holiday branch trains',()=>{
 const start=edge.indexOf('  // Suigun (main) + SuigunBranch (Hitachi-Ota) 2611:');
 const end=edge.indexOf('  // Shinonoi 2611:',start);
 assert.ok(start>=0&&end>start);
 const branch=edge.slice(start,end);
 assert.match(branch,/selectedCalendar==="odpt\.Calendar:Weekday"\?76:83/);
 assert.match(branch,/\(selectedCalendar==="odpt\.Calendar:Weekday"\?76:83\):30/);
 assert.match(branch,/proof\.calendar_urn!==run\.service_id/);
 assert.match(branch,/proof\.source_type_urn!==run\.train_type/);
 assert.match(branch,/run\.network_key!=="odpt\.Railway:JR-East\."\+lineId/);
 assert.match(branch,/run\.timetable_date_verified=false/);
});
test('main line special train PNG/date guard remains intact',()=>{
 const script=fs.readFileSync('data/timetables/jreast-suigun-2611-number-index.js','utf8');
 assert.ok(script.includes('n==="9821D"||n==="9822D"'));
 assert.ok(script.includes('n==="9329D"'));
 assert.ok(script.includes('var source='));
});
