import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.10";
import { jwtVerify, createRemoteJWKSet } from "npm:jose@5.9.6";

const PROJECT = "pnupwfmgbtxqhpzsrhfn";
const AUDIENCE = "https://" + PROJECT + ".supabase.co/functions/v1/tokyo-gtfs-sync";
const FEED_SHA = "bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f";
const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const allowed = new Set(["routes","stops","calendar","exceptions","trips","stop_times","transfers","complete"]);
const reply = (v: unknown, status=200) => new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});

Deno.serve(async (req) => {
 if(req.method!=="POST")return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return reply({ok:false,error:"MISSING_AUTH"},401);
 try{
  const {payload}=await jwtVerify(auth.slice(7),JWKS,{
   issuer:"https://token.actions.githubusercontent.com",audience:AUDIENCE,
   clockTolerance:"5s"
  });
  if(payload.repository!=="biubiu52011/pixel-tetsudo"||
     payload.repository_id!=="1437552358"||
     payload.repository_owner_id!=="209196239"||
     payload.ref!=="refs/heads/main"||
     payload.workflow_ref!=="biubiu52011/pixel-tetsudo/.github/workflows/tokyo-gtfs-sync.yml@refs/heads/main"||
     (payload.event_name!=="push" && payload.event_name!=="workflow_dispatch"))
    return reply({ok:false,error:"UNTRUSTED_WORKFLOW"},403);
 }catch{return reply({ok:false,error:"INVALID_OIDC"},403)}
 let body:any;
 try{body=await req.json()}catch{return reply({ok:false,error:"BAD_JSON"},400)}
 const kind=String(body?.kind||"");
 const rows=body?.rows;
 if(body.feed_sha!==FEED_SHA||!allowed.has(kind)||!Array.isArray(rows)||rows.length>1000)
  return reply({ok:false,error:"INVALID_BATCH"},400);
 if(kind!=="complete"&&!rows.length)return reply({ok:false,error:"EMPTY_BATCH"},400);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return reply({ok:false,error:"SERVER_CONFIG"},500);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc("import_tokyo_gtfs_batch",{
   p_feed_sha:FEED_SHA,p_kind:kind,p_rows:rows
 });
 if(error)return reply({ok:false,error:"STAGE_WRITE_FAILED",hint:String(error.message).slice(0,180)},500);
 return reply(data);
});
