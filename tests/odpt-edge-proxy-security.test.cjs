'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const proxy=fs.readFileSync('supabase/functions/odpt-proxy/index.ts','utf8');
const client=fs.readFileSync('data/api/odpt-unified.js','utf8');
test('ODPT Edge proxy has server secrets, fixed origins and source-resource allowlist',()=>{
  assert.ok(proxy.includes('Deno.env.get(config.host'));
  assert.ok(proxy.includes('ODPT_CHALLENGE_CONSUMER_KEY') && proxy.includes('ODPT_PRODUCTION_CONSUMER_KEY'));
  assert.match(proxy,/const trustedOrigin="https:\/\/biubiu52011\.github\.io"/);
  assert.match(proxy,/UNSUPPORTED_ODPT_RESOURCE/);
  assert.match(proxy,/UNSUPPORTED_FILTER/);
  assert.match(proxy,/INVALID_RAILWAY/);
  assert.match(proxy,/INVALID_CALENDAR/);
  assert.match(proxy,/ODPT_PROXY_NOT_CONFIGURED/);
  assert.match(proxy,/ORIGIN_NOT_ALLOWED/);
  assert.match(proxy,/RATE_LIMIT/);
  assert.ok(proxy.includes('binary?"application/x-protobuf"'));
  assert.match(proxy,/new Map<string,\{until:number,status:number,body:Uint8Array/);
  assert.ok(!proxy.includes('ODPT_LINKS_ENC'));
  assert.ok(!/console\.[a-z]+\(target\.toString/.test(proxy),'never log upstream URLs with secret keys');
});
test('strict client proxy mode bypasses key decoder and cannot fall back to plaintext ODPT',()=>{
  assert.match(client,/useStrictOdptProxy\(\)\) return proxyUrl\(operator,type\)/);
  assert.match(client,/if \(useStrictOdptProxy\(\)\) \{\s*return fetchODPT\(proxyUrl\(operator,'trainTimetable'/);
  assert.match(client,/ODPT_PROXY_MODE === "strict"/);
  assert.match(client,/ODPT_USE_EDGE_PROXY === true/);
  assert.match(client,/ODPT_PROXY_ENDPOINT/);
});
