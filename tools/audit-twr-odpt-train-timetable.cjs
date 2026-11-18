'use strict';
// Read-only snapshot audit against this site's existing production-key Edge proxy.
// No ODPT consumer key is read, printed, stored or committed here.
const url='https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/odpt-proxy?operator=TWR&type=trainTimetable';
const today='2026-11-18';
(async()=>{
  const response=await fetch(url,{headers:{Origin:'https://biubiu52011.github.io',Accept:'application/json'},signal:AbortSignal.timeout(22000)});
  console.log('[TWR ODPT] HTTP',response.status,'content-type',response.headers.get('content-type'));
  if(!response.ok)return;
  const raw=await response.json();
  const records=Array.isArray(raw)?raw:Array.isArray(raw?.data)?raw.data:[];
  const grouping=new Map();const stamps=new Set();
  for(const rec of records){
    const number=String(rec['odpt:trainNumber']||'');
    if(!number)continue;
    const cal=String(rec['odpt:calendar']||'').split(':').pop();
    const railway=String(rec['odpt:railway']||'').split(':').pop();
    const dir=String(rec['odpt:railDirection']||'').split(':').pop();
    const type=String(rec['odpt:trainType']||'').split(':').pop();
    const date=String(rec['dc:date']||'').slice(0,10);
    if(date)stamps.add(date);
    const key=[railway,cal,dir,type].join('|');
    const list=grouping.get(key)||new Set();list.add(number);grouping.set(key,list);
  }
  console.log('[TWR ODPT] records',records.length,'meta-dates',JSON.stringify([...stamps].sort()));
  for(const [group,numbers] of [...grouping].sort((a,b)=>a[0].localeCompare(b[0]))){
    const sorted=[...numbers].sort((a,b)=>parseInt(a,10)-parseInt(b,10)||a.localeCompare(b));
    const counts={};
    const tails={};
    for(const code of sorted){
      const suffix=code.match(/[a-zA-Z]+$/)?.[0]||'?';
      counts[suffix]=(counts[suffix]||0)+1;
      const m=code.match(/^(\\d+)([A-Z])$/);
      if(m){const tail=Number(m[1])%100;const set=tails[suffix]||new Set();set.add(tail);tails[suffix]=set;}
    }
    console.log('[TWR ODPT] group',group,'unique',sorted.length,
      'suffixes',JSON.stringify(counts),
      'tails',JSON.stringify(Object.fromEntries(Object.entries(tails).map(([s,set])=>[s,[...set].sort((a,b)=>a-b)]))));
    console.log('[TWR ODPT] full-number-set',group,JSON.stringify(sorted));
  }
})().catch(e=>console.log('[TWR ODPT] fetch failed',e?.name||'error'));