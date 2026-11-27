"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../data/api/odpt-unified.js"),"utf8");

function isolatedDelayLoader(fetchResult,initial,extra){
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
  Object.assign(ctx,extra||{});
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

test("Alert-only operator failure is not masked by an absent TrainInformation endpoint",async()=>{
  const loader=isolatedDelayLoader(()=>Promise.resolve([]),{},{
    ODPT_ENDPOINTS:{AlertOnly:{gtfsAlert:"alert"}},
    fetchGenericGtfsAlerts:()=>Promise.reject(Object.assign(new Error("HTTP 403"),{httpStatus:403}))
  });
  await loader.run(true);
  await pause(75);
  assert.equal(loader.window.ODPT_DELAY_DATA.AlertOnly,null);
  assert.equal(loader.window.ODPT_REALTIME_STATUS["AlertOnly:delay"].ok,false);
  assert.equal(loader.window.ODPT_REALTIME_STATUS["AlertOnly:delay"].status,403);
});
test("Alert-only successful empty feed remains empty, not an invented normal status",async()=>{
  const loader=isolatedDelayLoader(()=>Promise.resolve([]),{},{
    ODPT_ENDPOINTS:{AlertOnly:{gtfsAlert:"alert"}},
    fetchGenericGtfsAlerts:()=>Promise.resolve([])
  });
  await loader.run(true);
  await pause(75);
  assert.equal(loader.window.ODPT_REALTIME_STATUS["AlertOnly:delay"].ok,true);
  assert.equal(loader.window.ODPT_DELAY_DATA.AlertOnly.length,0);
});

function alertHarness(){
  const readStart=source.indexOf("    function _gtfsField(");
  const readEnd=source.indexOf("    function _toeiGtfsLineId(",readStart);
  const alertStart=source.indexOf("    function _gtfsRepeated(");
  const alertEnd=source.indexOf("    function _decodeToeiGtfsAlerts(",alertStart);
  assert.ok(readStart>=0&&readEnd>readStart&&alertStart>=0&&alertEnd>alertStart);
  const toEnd=source.indexOf("    function _toeiStationLocation(",readEnd);
  const genericStart=source.indexOf("    function _gtfsLineIdForOperator(");
  const genericEnd=source.indexOf("    function _gtfsStationFromLine(",genericStart);
  const registry=["LINE_TO_OPERATOR","LINE_RAILWAY_CODE"].map(name=>{
    const a=source.indexOf("var "+name+" = {"),b=source.indexOf("};",a);
    assert.ok(a>=0&&b>a);
    return source.slice(a,b+2);
  }).join("\n");
  const ctx={Date,Uint8Array,TextDecoder,_toeiGtfsIso:n=>new Date(n*1000).toISOString()};
  vm.runInNewContext(registry+source.slice(readStart,toEnd)+source.slice(genericStart,genericEnd)+source.slice(alertStart,alertEnd)+"\nthis.decode=_decodeGtfsAlerts;this.read=_gtfsReadMessage;this.text=_gtfsText;this.nested=_gtfsNested;this.field=_gtfsField;this.repeated=_gtfsRepeated;this.subway=_subwayAlertLineId;",ctx);
  return ctx;
}
function vint(n){const a=[];while(n>=128){a.push((n%128)|128);n=Math.floor(n/128);}a.push(n);return Buffer.from(a);}
function number(n,v){return Buffer.concat([vint(n*8),vint(v)]);}
function blob(n,v){const b=Buffer.from(v);return Buffer.concat([vint(n*8+2),vint(b.length),b]);}
const join=(...parts)=>Buffer.concat(parts);
function feed(...entities){return join(blob(1,join(blob(1,"2.0"),number(2,0),number(3,Math.floor(Date.now()/1000)))),...entities.map(e=>blob(2,e)));}
function alertEntity(id,start,end,direction){
  const selector=join(blob(2,"odpt.Railway:TokyoMetro.Ginza"),...(direction==null?[]:[number(6,direction)]));
  const ja=blob(1,join(blob(1,"運転見合わせ"),blob(2,"ja")));
  const en=blob(1,join(blob(1,"Official suspension"),blob(2,"en")));
  const alert=join(blob(1,join(number(1,start),number(2,end))),blob(5,selector),number(7,1),blob(10,join(ja,en)));
  return join(blob(1,id),blob(5,alert));
}
test("GTFS alert decoder distinguishes an empty valid feed from invalid or truncated protobuf",()=>{
  const {decode}=alertHarness();
  assert.equal(decode(feed(),"TokyoMetro").length,0);
  assert.throws(()=>decode(Buffer.from([]),"TokyoMetro"),/header/);
  assert.throws(()=>decode(Buffer.from([10,13,10,3,50,46,48,16]),"TokyoMetro"),/Truncated/);
  assert.throws(()=>decode(blob(1,join(blob(1,"2.0"),number(2,1))),"TokyoMetro"),/incremental/);
});
test("GTFS alerts honor exact validity windows and preserve scoped official text",()=>{
  const {decode}=alertHarness(),now=Math.floor(Date.now()/1000);
  const data=feed(alertEntity("future",now+120,now+600),alertEntity("expired",now-600,now-120),alertEntity("current",now-60,now+600,0));
  const rows=decode(data,"TokyoMetro");
  assert.equal(rows.length,1);
  assert.equal(rows[0]["odpt:railway"],"odpt.Railway:TokyoMetro.Ginza");
  assert.equal(rows[0]["pt:alertScope"],"direction");
  assert.equal(rows[0]["pt:directionId"],0);
  assert.equal(rows[0]["pt:alertHeaderTranslations"].en,"Official suspension");
  const ev=require("../js/runinfo-evaluator.js");
  assert.equal(ev.evaluate({structuredStatus:"Suspension",alertScope:"direction",text:"運転見合わせ"}).status,"delayed");
});
test("Live GTFS Alert binary observation through existing proxy",{skip:process.env.PT_LIVE_RUNINFO_AUDIT!=="1",timeout:60000},async()=>{
  const h=alertHarness();
  const endpoints=[["JR-East","gtfsAlert"],["Tobu","gtfsAlert"],["Keio","gtfsAlert"],["TokyoMetro","alert"],["Toei","alert"],["YokohamaMunicipal","gtfsAlert"],["TWR","alert"],["MIR","alert"],["TamaMonorail","alert"],["HakodateCity","gtfsAlert"]];
  const results=await Promise.all(endpoints.map(async ([operator,type])=>{
    try{
      const resp=await fetch("https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/odpt-proxy?operator="+encodeURIComponent(operator)+"&type="+type,{headers:{Origin:"https://biubiu52011.github.io",Accept:"application/x-protobuf"},signal:AbortSignal.timeout(20000)});
      if(!resp.ok)return {operator,http:resp.status};
      const bytes=new Uint8Array(await resp.arrayBuffer()), raw=h.read(bytes,true),header=h.nested(raw,1,true);
      const entities=h.repeated(raw,2), alerts=entities.map(e=>h.nested(h.read(e,true),5,true)).filter(a=>Object.keys(a).length);
      // The observation reports actual source field coverage, not assumed
      // route matches: this isolated harness does not load the station DB.
      const fields={},languages={};
      alerts.forEach(a=>{Object.keys(a).forEach(k=>fields[k]=(fields[k]||0)+1);
        for(const k of [10,11]) h.repeated(a,k).forEach(v=>h.repeated(h.read(v,true),1).forEach(t=>{const lang=h.text(h.read(t,true),2)||"und";languages[lang]=(languages[lang]||0)+1;}));});
      const rows=h.decode(bytes,operator);
      const mappings=["TokyoMetro","Toei","YokohamaMunicipal"].includes(operator)?rows.map(r=>({route:r["pt:routeId"],trip:r["pt:tripId"],stop:r["pt:stopId"],railway:r["odpt:railway"],scope:r["pt:alertScope"]})):undefined;
      return {operator,http:resp.status,bytes:bytes.length,version:h.text(header,1),timestamp:h.field(header,3)||null,entities:entities.length,alerts:alerts.length,activeRows:rows.length,fields,languages,mappings};
    }catch(e){return {operator,error:String(e.message)};}
  }));
  console.log("LIVE_RUNINFO_AUDIT "+JSON.stringify(results));
  assert.equal(results.filter(r=>r.http===200&&r.version&&!r.error).length,endpoints.length);
});

test("Subway alert selectors use exact operator and railway identities, not station name substrings",()=>{
  const {subway}=alertHarness();
  const metro={G:"Ginza",M:"Marunouchi",Mb:"MarunouchiBranch",H:"Hibiya",T:"Tozai",C:"Chiyoda",Y:"Yurakucho",Z:"Hanzomon",N:"Namboku",F:"Fukutoshin"};
  for(const [symbol,id] of Object.entries(metro)){
    assert.equal(subway("TokyoMetro","odpt.Railway:TokyoMetro."+id,"",""),id);
    assert.equal(subway("TokyoMetro",symbol,"",""),id);
  }
  for(const id of ["Asakusa","Mita","Shinjuku","Oedo","Arakawa"])assert.equal(subway("Toei","odpt.Railway:Toei."+id,"",""),id);
  assert.equal(subway("Toei","odpt.Railway:Toei.NipporiToneri","",""),"Nippori_Toneri");
  assert.equal(subway("YokohamaMunicipal","odpt.Railway:YokohamaMunicipal.Blue","",""),"YokohamaBlue");
  assert.equal(subway("YokohamaMunicipal","odpt.Railway:YokohamaMunicipal.Green","",""),"YokohamaGreen");
  assert.equal(subway("TokyoMetro","","","odpt.Station:TokyoMetro.Ginza.Asakusa"),"Ginza");
  assert.equal(subway("TokyoMetro","","","Mb03"),"MarunouchiBranch");
  assert.equal(subway("TokyoMetro","","","Asakusa"),"");
  assert.equal(subway("TokyoMetro","odpt.Railway:Toei.Asakusa","","G01"),"");
  assert.equal(subway("TokyoMetro","G","","odpt.Station:TokyoMetro.Hibiya.Ginza"),"");
  assert.equal(subway("TokyoMetro","unknown","","G01"),"");
  assert.equal(subway("Toei","A","","odpt.Station:TokyoMetro.Ginza.Asakusa"),"");
  assert.equal(subway("Toei","S","101234",""),"Shinjuku");
  assert.equal(subway("YokohamaMunicipal","","","G01"),"YokohamaGreen");
});
