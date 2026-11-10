'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const start=source.indexOf('  if (!templates.length) {');
const end=source.indexOf('\n\n  // Canonical train schedule',start);
assert.ok(start>=0&&end>start,'source without the canonical missing-template branch');
const responseBranch=source.slice(start,end);
const evaluate=new Function('db','lineId','serviceDate','selectedRevision','templates','json',
  'return (async function(){'+responseBranch+'; return null; })()');

function mockDb(otherCalendars, audit, auditError){
  const calls=[];
  return {
    calls,
    from(table){
      calls.push(table);
      return {
        select(){return this;},
        eq(){return this;},
        limit:async()=>({data:otherCalendars,error:null}),
        maybeSingle:async()=>({data:audit,error:auditError||null})
      };
    }
  };
}
test('audited zero-train response preserves missing-all-plans status',async()=>{
  const db=mockDb([],{coverage_status:'missing_all_plans',issues:['NO_PUBLISHED_WEEKDAY_TRAIN_PLAN']});
  const body=await evaluate(db,'ChuoCentral','2026-11-11',null,[],x=>x);
  assert.equal(body.ok,true);
  assert.equal(body.cache,'MISS');
  assert.equal(body.source,'NO_API_NO_DATA');
  assert.equal(body.audit_coverage_status,'missing_all_plans');
  assert.deepEqual(body.audit_issues,['NO_PUBLISHED_WEEKDAY_TRAIN_PLAN']);
  assert.deepEqual(body.runs,[]);
  assert.equal(body.no_service_confirmed,false);
  assert.deepEqual(db.calls,['manual_timetable_templates','published_timetable_coverage_audit']);
});
test('wrong calendar must not impersonate a cancelled train or missing-audit proof',async()=>{
  const db=mockDb([{calendar_urn:'odpt.Calendar:SaturdayHoliday'}],null);
  const body=await evaluate(db,'ChuoCentral','2026-11-11',null,[],x=>x);
  assert.equal(body.source,'CALENDAR_NOT_VERIFIED');
  assert.equal(body.audit_coverage_status,'unverified');
  assert.equal(body.no_service_confirmed,false);
});
test('SQL audit query failure is not silently rewritten as missing plan',async()=>{
  const db=mockDb([],null,{message:'audit offline'});
  await assert.rejects(()=>evaluate(db,'ChuoCentral','2026-11-11',null,[],x=>x),
    /audit offline|\[object Object\]/);
});
