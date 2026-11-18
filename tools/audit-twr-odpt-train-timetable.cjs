'use strict';
// Read-only ODPT TWR TrainTimetable source-number audit.
// Prefer the site's public proxy; fall back to the EXISTING browser link catalog.
// Never commit, echo, log or print consumer keys, request URLs or raw API bodies.
const fs=require('node:fs');
const PROXY='https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/odpt-proxy?operator=TWR&type=trainTimetable';
function publishedLink(){
  const js=fs.readFileSync('data/api/odpt-links.js','utf8');
  const encoded=/window\.ODPT_LINKS_ENC\s*=\s*"([^"]+)"/.exec(js)?.[1];
  if(!encoded)throw Error('Link catalog unavailable');
  const seed='PixelTetsudo'.split('').reverse().join('')+'-'+
    'ODPT'.split('').reverse().join('')+'-2026';
  const bytes=Buffer.from(encoded,'base64').toString('latin1');
  const links=JSON.parse([...bytes].map((ch,i)=>String.fromCharCode(
    ch.charCodeAt(0)^seed.charCodeAt(i%seed.length))).join(''));
  return links.find(u=>/^https:\/\/api\.odpt\.org\/api\/v4\/odpt:TrainTimetable\?/.test(u)&&
    u.includes('odpt:operator=odpt.Operator:TWR')&&u.includes('acl:consumerKey='));
}
async function load(){
  const candidates=[['proxy',PROXY],['direct',publishedLink()]];
  for(const [label,target] of candidates){
    if(!target){console.log('[TWR ODPT]',label,'link unavailable');continue;}
    try{
      const response=await fetch(target,{headers:{
        Origin:'https://biubiu52011.github.io',Accept:'application/json'
      },signal:AbortSignal.timeout(25000)});
      console.log('[TWR ODPT]',label,'HTTP',response.status);
      if(!response.ok)continue;
      const raw=await response.json();
      const records=Array.isArray(raw)?raw:Array.isArray(raw?.data)?raw.data:[];
      if(!records.length){console.log('[TWR ODPT]',label,'empty or invalid response');continue;}
      return {records,source:label};
    }catch(err){
      console.log('[TWR ODPT]',label,'fetch failed',err?.name||'error');
    }
  }
  return {records:[],source:'unavailable'};
}
function audit(records,source){
  const grouping=new Map(),stamps=new Set(),all=new Set();
  const misc={vehicleTypes:0,numberMissing:0,parseable:0,badSuffix:0};
  for(const rec of records){
    const number=String(rec['odpt:trainNumber']||'').trim().toUpperCase();
    if(!number){misc.numberMissing++;continue;}
    if(rec['odpt:vehicleType']||rec['odpt:carNumber']||
       rec['odpt:trainOwner'])misc.vehicleTypes++;
    all.add(number);
    if(/^\d+[A-Z]$/.test(number))misc.parseable++;else misc.badSuffix++;
    const cal=String(rec['odpt:calendar']||'').split(':').pop();
    const railway=String(rec['odpt:railway']||'').split(':').pop();
    const dir=String(rec['odpt:railDirection']||'').split(':').pop();
    const type=String(rec['odpt:trainType']||'').split(':').pop();
    const date=String(rec['dc:date']||'').slice(0,10);
    if(date)stamps.add(date);
    const key=[railway,cal,dir,type].join('|');
    const list=grouping.get(key)||new Set();list.add(number);grouping.set(key,list);
  }
  console.log('[TWR ODPT] source',source,'records',records.length,
    'unique-public-numbers',all.size,'meta-dates',JSON.stringify([...stamps].sort()),
    'metadata',JSON.stringify(misc));
  for(const [group,numbers] of [...grouping].sort((a,b)=>a[0].localeCompare(b[0]))){
    const sorted=[...numbers].sort((a,b)=>parseInt(a,10)-parseInt(b,10)||a.localeCompare(b));
    const counts={},tails={};
    for(const code of sorted){
      const m=code.match(/^(\d+)([A-Z])$/);
      const suffix=m?.[2]||'?';
      counts[suffix]=(counts[suffix]||0)+1;
      if(m){
        const set=tails[suffix]||new Set();
        set.add(Number(m[1])%100);tails[suffix]=set;
      }
    }
    console.log('[TWR ODPT] group',group,'unique',sorted.length,
      'suffixes',JSON.stringify(counts),
      'tails',JSON.stringify(Object.fromEntries(Object.entries(tails)
        .map(([s,set])=>[s,[...set].sort((a,b)=>a-b)]))));
    console.log('[TWR ODPT] full-number-set',group,JSON.stringify(sorted));
  }
}
(async()=>{
 const {records,source}=await load();
 audit(records,source);
})().catch(err=>console.log('[TWR ODPT] audit failed',err?.name||'error'));
