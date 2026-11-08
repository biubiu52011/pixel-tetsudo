"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../data/api/odpt-unified.js"),"utf8");

function isolatedDelayLoader(fetchResult,initial){
  const a=source.indexOf("    function loadRealtimeData(");
  const b=source.indexOf("    // ========== 加载时刻表数据",a);
  assert.ok(a>=0&&b>a,"ODPT loader boundaries");
  const updates=[];
  const w={
    ODPT_DELAY_DATA:initial||{},
    ODPT_TRAIN_POSITIONS:{},
    DataFusion:{updateOdptData:rows=>updates.push({...rows})}
  };
  const ctx={
    window:w,console,Promise,Date,setTimeout,clearTimeout,
    validateAuthoritativeRealtimeConfig:()=>({ok:true}),
    ODPT_ENDPOINTS:{Seibu:{trainInformation:"s"},Blocked:{trainInformation:"b"}},
    buildUrl:op=>op,fetchODPT:fetchResult,extractData:x=>x,
    persistRawRealtime:()=>{},
    waitForFusion:(name,ready,cb)=>{if(ready())cb();},
    _rebuildRealtimePositionViews:()=>{},
    _activeRealtimeOperators:{},_activeRealtimeLineIds:{}
  };
  vm.runInNewContext(source.slice(a,b)+"\nthis.run=loadRealtimeData;",ctx);
  return {run:ctx.run,window:w,updates};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test("Seibu settles while another operator's TrainInformation never finishes",async()=>{
  const loader=isolatedDelayLoader(op=>op==="Seibu"?Promise.resolve([]):new Promise(()=>{}));
  await loader.run(true);
  await pause(75);
  assert.deepEqual(Array.from(loader.window.ODPT_DELAY_DATA.Seibu),[]);
  assert.equal(loader.updates.length>0,true,"Seibu delivered without Blocked resolving");
  assert.ok(loader.updates.some(row=>Array.isArray(row.Seibu)&&!Object.hasOwn(row,"Blocked")));
});

test("An independent Seibu failure is delivered as null, not endless loading",async()=>{
  const loader=isolatedDelayLoader(op=>op==="Seibu"?Promise.reject(new Error("HTTP 403")):new Promise(()=>{}));
  await loader.run(true);
  await pause(75);
  assert.equal(loader.window.ODPT_DELAY_DATA.Seibu,null);
  assert.ok(loader.updates.some(row=>Object.hasOwn(row,"Seibu")&&row.Seibu===null));
});

test("An in-flight refresh does not erase an earlier settled Seibu snapshot",async()=>{
  const previous=[{"@id":"official-seibu-status"}];
  const loader=isolatedDelayLoader(()=>new Promise(()=>{}),{Seibu:previous});
  await loader.run(true);
  assert.strictEqual(loader.window.ODPT_DELAY_DATA.Seibu,previous);
});

test("ODPT cooldown rejects already queued requests rather than suspending for minutes",async()=>{
  const a=source.indexOf("    function processApiQueue(");
  const b=source.indexOf("    // 所有消费者共用一个请求所有者",a);
  assert.ok(a>=0&&b>a,"request scheduler boundaries");
  const domain="api-challenge.odpt.org";
  let count=0;
  const ctx={
    console,Promise,Date,setTimeout,clearTimeout,AbortSignal,
    API_MAX_CONCURRENCY:1,API_RATE_LIMIT:0,
    API_BACKOFF_403:300000,API_BACKOFF_429:120000,
    apiQueueProcessing:{[domain]:false},
    apiRequestQueue:{[domain]:[]},
    apiLastRequestTime:{[domain]:0},
    _active:{},apiCooldownUntil:{},apiCooldownStatus:{},
    _queuedFetchInflight:{},
    getApiDomain:()=>domain,
    fetch:()=>{count++;return Promise.resolve({ok:false,status:403});}
  };
  vm.runInNewContext(source.slice(a,b)+"\nthis.send=rateLimitedFetch;",ctx);
  const first=ctx.send("https://api-challenge.odpt.org/a");
  const second=ctx.send("https://api-challenge.odpt.org/b");
  const outcomes=await Promise.race([
    Promise.allSettled([first,second]),
    pause(250).then(()=>null)
  ]);
  assert.ok(outcomes,"pending second request was not released during cooldown");
  assert.equal(outcomes.length,2);
  assert.ok(outcomes.every(r=>r.status==="rejected"));
  assert.equal(count,1,"the queued second request was not sent during cooldown");
});
