'use strict';
// One-shot read-only diagnosis: ODPT Saikyo/Kawagoe live row contract.
// Never log ODPT consumer keys, complete URLs, raw response bodies, IPs or
// train identifiers beyond the provider's publicly published service number.
const fs=require('node:fs');
const source=fs.readFileSync('data/api/odpt-links.js','utf8');
const encoded=/window\.ODPT_LINKS_ENC\s*=\s*"([^"]+)"/.exec(source)?.[1];
if(!encoded){console.log('[Saikyo probe] encoded link library missing');process.exit(0);}
const seed='PixelTetsudo'.split('').reverse().join('')+'-'+
  'ODPT'.split('').reverse().join('')+'-2026';
const bytes=Buffer.from(encoded,'base64').toString('latin1');
const links=JSON.parse([...bytes].map((ch,i)=>String.fromCharCode(
  ch.charCodeAt(0)^seed.charCodeAt(i%seed.length))).join(''));
const url=links.find(u=>/^https:\/\/api-challenge\.odpt\.org\/api\/v4\/odpt:Train\?/.test(u)&&
  u.includes('odpt:operator=odpt.Operator:JR-East'));
async function sample(target,label){
 if(!target){console.log('[Saikyo probe]',label,'URL unavailable');return;}
 try{
  const response=await fetch(target,{signal:AbortSignal.timeout(18000),
    headers:{Origin:'https://biubiu52011.github.io'}});
  if(!response.ok){
   console.log('[Saikyo probe]',label,'HTTP',response.status);
   return;
  }
  const json=await response.json();
  const rows=Array.isArray(json)?json:json&&Array.isArray(json.data)?json.data:[];
  const map=new Map();
  for(const row of rows){
   const key=String(row['odpt:railway']||'<missing>');
   map.set(key,(map.get(key)||0)+1);
  }
  const saikyo=rows.filter(r=>/SaikyoKawagoe|SotetsuDirect|Rinkai/i.test(
    String(r['odpt:railway']||'')));
  console.log('[Saikyo probe]',label,'total',rows.length,
   'Saikyo-family',saikyo.length,'distinct railways',map.size);
  console.log('[Saikyo probe] source families',JSON.stringify(
   [...map].filter(([k])=>/Saikyo|Sotetsu|Rinkai|Kawagoe/.test(k)).slice(0,16)));
  const pick=saikyo.slice(0,15).map(r=>({
   number:String(r['odpt:trainNumber']||'').slice(0,20),
   railway:String(r['odpt:railway']||'').slice(0,70),
   type:String(r['odpt:trainType']||'').slice(0,60),
   direction:String(r['odpt:railDirection']||'').slice(0,50),
   fromPresent:!!r['odpt:fromStation'],
   toPresent:!!r['odpt:toStation'],
   vehiclePresent:!!(r['odpt:vehicleType']||r.vehicleType)
  }));
  console.log('[Saikyo probe] shape sample',JSON.stringify(pick));
  const byMissing={number:0,type:0,direction:0,from:0,railway:0};
  for(const row of saikyo){
   if(!row['odpt:trainNumber'])byMissing.number++;
   if(!row['odpt:trainType'])byMissing.type++;
   if(!row['odpt:railDirection'])byMissing.direction++;
   if(!row['odpt:fromStation'])byMissing.from++;
   if(!row['odpt:railway'])byMissing.railway++;
  }
  console.log('[Saikyo probe] missing',JSON.stringify(byMissing));
 }catch(e){
  console.log('[Saikyo probe]',label,'request failed:',String(e&&e.name||'error'));
 }
}
(async()=>{
 await sample(url,'ODPT direct JR-East');
 await sample('https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/odpt-proxy?operator=JR-East&type=train',
   'Edge proxy JR-East');
})().catch(e=>{console.log('[Saikyo probe] probe error',String(e&&e.name||'error'));});
