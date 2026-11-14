'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const runtime=fs.readFileSync('data/core/runtime-config.js','utf8');
const bundle=fs.readFileSync('data/core/data-config-bundle.js','utf8');
const odpt=fs.readFileSync('data/api/odpt-unified.js','utf8');

test('Tojo/Ogose keep realtime activation without asserting observed FULL coverage',()=>{
  for(const line of ['Tojo','Ogose']){
    const policy=new RegExp('"'+line+'": \\{ mode: "HYBRID" \\}');
    const api=new RegExp('"'+line+'": true');
    for(const source of [runtime,bundle]){
      assert.match(source,policy);
      assert.match(source,api);
    }
  }
  assert.match(odpt,/ODPT_TOJO_REALTIME_AUDIT/);
  assert.match(odpt,/auditRealtimeLine\(\s*lineId, window\.ODPT_TRAIN_POSITIONS\[op\]\)/);
  assert.match(odpt,/no-exact-railway-rows-in-current-snapshot/);
  assert.match(odpt,/assessRealtimeFullCandidate\(lineId, history\)/);
});
