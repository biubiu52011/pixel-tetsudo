// Credentials are supplied ONLY via Supabase Edge Function Secrets.
// ODPT_CHALLENGE_CONSUMER_KEY and ODPT_PRODUCTION_CONSUMER_KEY are never
// embedded into this file or sent back to browsers. Fail closed if absent.
// NOTE: allowed Origin is only a browser CORS boundary, NOT authentication.
// Per-isolate limits and caches reduce quota abuse; provider-side quotas and
// upstream key rotation remain necessary.
type Route = { host: "challenge"|"production"; endpoints: Record<string,string> };
const endpoints:Record<string,Route>={
  "JR-East":{host:"challenge",endpoints:{train:"odpt:Train?odpt:operator=odpt.Operator:JR-East",gtfsVehicle:"gtfs/realtime/jreast_odpt_train_vehicle",gtfsTripUpdate:"gtfs/realtime/jreast_odpt_train_trip_update",gtfsAlert:"gtfs/realtime/jreis_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:JR-East",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:jre-is"}},
  Tobu:{host:"challenge",endpoints:{train:"odpt:Train?odpt:operator=odpt.Operator:Tobu",gtfsVehicle:"gtfs/realtime/tobu_odpt_train_vehicle",gtfsTripUpdate:"gtfs/realtime/tobu_odpt_train_trip_update",gtfsAlert:"gtfs/realtime/tobu_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Tobu",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Tobu"}},
  Keio:{host:"challenge",endpoints:{train:"odpt:Train?odpt:operator=odpt.Operator:Keio",gtfsVehicle:"gtfs/realtime/keio_odpt_train_vehicle",gtfsTripUpdate:"gtfs/realtime/keio_odpt_train_trip_update",gtfsAlert:"gtfs/realtime/keio_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Keio",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Keio"}},
  Keikyu:{host:"challenge",endpoints:{trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Keikyu"}},
  Sotetsu:{host:"challenge",endpoints:{trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Sotetsu",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Sotetsu"}},
  Tokyu:{host:"challenge",endpoints:{trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Tokyu",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Tokyu"}},
  Seibu:{host:"challenge",endpoints:{trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Seibu"}},
  Keisei:{host:"challenge",endpoints:{trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Keisei",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Keisei"}},
  TokyoMetro:{host:"production",endpoints:{alert:"gtfs/realtime/tokyometro_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:TokyoMetro",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:TokyoMetro"}},
  Toei:{host:"production",endpoints:{train:"gtfs/realtime/toei_odpt_train_vehicle",tripUpdate:"gtfs/realtime/toei_odpt_train_trip_update",alert:"gtfs/realtime/toei_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:Toei"}},
  YokohamaMunicipal:{host:"production",endpoints:{gtfsVehicle:"gtfs/realtime/YokohamaMunicipalTrain_vehicle",gtfsTripUpdate:"gtfs/realtime/YokohamaMunicipalTrain_trip_update",gtfsAlert:"gtfs/realtime/YokohamaMunicipalTrain_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:YokohamaMunicipal",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:YokohamaMunicipal"}},
  TWR:{host:"production",endpoints:{alert:"gtfs/realtime/twr_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:TWR",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:TWR"}},
  MIR:{host:"production",endpoints:{alert:"gtfs/realtime/mir_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:MIR",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:MIR"}},
  TamaMonorail:{host:"production",endpoints:{alert:"gtfs/realtime/tamamonorail_odpt_train_alert",trainTimetable:"odpt:TrainTimetable?odpt:operator=odpt.Operator:TamaMonorail",trainInformation:"odpt:TrainInformation?odpt:operator=odpt.Operator:TamaMonorail"}},
  HakodateCity:{host:"production",endpoints:{gtfsVehicle:"gtfs/realtime/odpt_HakodateCity_Alllines_vehicle",gtfsTripUpdate:"gtfs/realtime/odpt_HakodateCity_Alllines_trip_update",gtfsAlert:"gtfs/realtime/odpt_HakodateCity_Alllines_alert"}}
};
const trustedOrigin="https://biubiu52011.github.io";
const headers=(origin:string)=>({
  "Content-Type":"application/json; charset=utf-8",
  "Vary":"Origin",
  "Access-Control-Allow-Origin":origin===trustedOrigin?trustedOrigin:"null",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
  "Access-Control-Allow-Headers":"Accept, Content-Type",
  "X-Content-Type-Options":"nosniff"
});
function json(status:number,body:unknown,origin:string,extra:Record<string,string>={}) {
  return new Response(JSON.stringify(body),{status,headers:{...headers(origin),...extra}});
}
const cache=new Map<string,{until:number,status:number,body:Uint8Array,contentType:string}>();
const quotas=new Map<string,{until:number,used:number}>();
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS"){
   if(origin!==trustedOrigin)return new Response(null,{status:403});
   return new Response(null,{status:204,headers:headers(origin)});
 }
 if(req.method!=="GET")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"},origin);
 // The endpoint is intended for the single GitHub Pages frontend. Do not
 // treat an Origin/Referer as cryptographic proof, especially from curl.
 if(origin!==trustedOrigin)return json(403,{ok:false,error:"ORIGIN_NOT_ALLOWED"},origin);
 const url=new URL(req.url);
 if(url.searchParams.get("health")==="1")return json(200,{
   ok:true,
   challengeConfigured:!!Deno.env.get("ODPT_CHALLENGE_CONSUMER_KEY"),
   productionConfigured:!!Deno.env.get("ODPT_PRODUCTION_CONSUMER_KEY"),
   credentialValuesExposed:false
 },origin,{"Cache-Control":"no-store"});
 const op=url.searchParams.get("operator")||"";
 const type=url.searchParams.get("type")||"";
 const config=endpoints[op];
 if(!config || !Object.prototype.hasOwnProperty.call(config.endpoints,type))
   return json(400,{ok:false,error:"UNSUPPORTED_ODPT_RESOURCE"},origin);
 const allowed=new Set(["operator","type","railway","calendar"]);
 if([...url.searchParams.keys()].some(k=>!allowed.has(k)))
   return json(400,{ok:false,error:"UNSUPPORTED_FILTER"},origin);
 const railway=url.searchParams.get("railway")||"";
 const calendar=url.searchParams.get("calendar")||"";
 if((railway||calendar)&&type!=="trainTimetable")
   return json(400,{ok:false,error:"FILTER_NOT_ALLOWED"},origin);
 if(railway&&(!/^odpt\.Railway:[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]{1,70}$/.test(railway) ||
   !railway.startsWith("odpt.Railway:"+op+".")))
   return json(400,{ok:false,error:"INVALID_RAILWAY"},origin);
 if(calendar&&!["odpt.Calendar:Weekday","odpt.Calendar:SaturdayHoliday"].includes(calendar))
   return json(400,{ok:false,error:"INVALID_CALENDAR"},origin);
 const key=Deno.env.get(config.host==="challenge"?"ODPT_CHALLENGE_CONSUMER_KEY":"ODPT_PRODUCTION_CONSUMER_KEY");
 if(!key)return json(503,{ok:false,error:"ODPT_PROXY_NOT_CONFIGURED"},origin,{"Cache-Control":"no-store"});
 const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown").slice(0,64);
 const limitKey=ip+"|"+op;
 const now=Date.now();
 const quota=quotas.get(limitKey);
 if(!quota||quota.until<now)quotas.set(limitKey,{until:now+60000,used:1});
 else if(quota.used++>=90)return json(429,{ok:false,error:"RATE_LIMIT"},origin,{"Retry-After":"30"});
 if(quotas.size>5000)quotas.clear();
 const target=new URL(config.endpoints[type],config.host==="challenge"
   ?"https://api-challenge.odpt.org/api/v4/"
   :"https://api.odpt.org/api/v4/");
 if(railway)target.searchParams.set("odpt:railway",railway);
 if(calendar)target.searchParams.set("odpt:calendar",calendar);
 target.searchParams.set("acl:consumerKey",key);
 // Cache keys are independent of credentials and never reveal them.
 const requestKey=[config.host,op,type,railway,calendar].join("|");
 const hit=cache.get(requestKey);
 if(hit&&hit.until>now){
   return new Response(hit.body.slice(),{status:hit.status,
     headers:{...headers(origin),"Content-Type":hit.contentType,
       "Cache-Control":"public, max-age=5","X-Proxy-Cache":"HIT"}});
 }
 const binary=type.startsWith("gtfs")||["tripUpdate","alert"].includes(type)||(op==="Toei"&&type==="train");
 const ttl=binary?10000:type==="train"?10000:type==="trainInformation"?30000:1800000;
 try{
   const upstream=await fetch(target.toString(),{
     headers:{"Accept":binary?"application/x-protobuf":"application/json"},
     signal:AbortSignal.timeout(9000)
   });
   if(!upstream.ok){
     // No upstream response body or URL is forwarded: either may contain key.
     return json(upstream.status===429?429:502,{ok:false,error:"ODPT_UPSTREAM_UNAVAILABLE"},
       origin,{"Cache-Control":"no-store"});
   }
   const buffer=new Uint8Array(await upstream.arrayBuffer());
   if(buffer.byteLength>10_000_000)return json(502,{ok:false,error:"RESPONSE_TOO_LARGE"},origin);
   const contentType=binary?"application/x-protobuf":"application/json; charset=utf-8";
   cache.set(requestKey,{until:now+ttl,status:200,body:buffer,contentType});
   if(cache.size>128)cache.delete(cache.keys().next().value as string);
   return new Response(buffer,{status:200,headers:{...headers(origin),
     "Content-Type":contentType,"Cache-Control":"public, max-age=5",
     "X-Proxy-Cache":"MISS"}});
 }catch(_e){
   return json(502,{ok:false,error:"ODPT_UPSTREAM_UNAVAILABLE"},origin,
     {"Cache-Control":"no-store"});
 }
});
