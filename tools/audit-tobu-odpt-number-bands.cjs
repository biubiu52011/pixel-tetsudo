'use strict';
/**
 * Tobu 2026 Challenge ODPT timetable -> existing gallery-reference envelope AUDIT.
 * Uses the pre-existing protected Edge ODPT proxy, never API credentials in Git.
 * Read-only: NEVER creates train-to-vehicle mappings or claims an actual carset.
 * node tools/audit-tobu-odpt-number-bands.cjs --output /tmp/tobu-audit.json --summary /tmp/summary.md
 */
const fs=require('node:fs');
const ORIGIN='https://biubiu52011.github.io';
const PROXY='https://pnupwfmgbtxqhpzsrhfn.supabase.co/functions/v1/odpt-proxy';
const TIMETABLE='https://ckan.odpt.org/dataset/tobu__r_train_timetable';
const CSV='data/audits/png-first-number-band-inventory-20261117.csv';
const SCOPES=[
 'TobuSkytree','Isesaki','Nikko','Kinugawa','Tojo','Ogose','Noda',
 'Utsunomiya','Koizumi','Sano','Kiryu','Kameido','Daishi'
];
const CALENDARS=['Weekday','SaturdayHoliday'];
// This index is for comparison only. Never turn "in envelope" into actual train stock.
const WATCH=[
 {model:'50050',png:'東武鉄道_50050型.png',line:'Hanzomon'},
 {model:'20400',png:'東武鉄道_20400型.png',line:'TobuUtsunomiya'},
 {model:'10030-50',png:'東武鉄道_10030型_50番台_更新車.png',line:'Koizumi'}
];
const tail=s=>String(s||'').split(':').pop();
function parseNumber(value){
 const str=String(value??'').trim().toUpperCase();
 // Challenge 2026 includes ordinary digit-leading numbers and Tobu's A-F/Y
 // operation prefixes. Keep a prefix separate so `A701E` can never satisfy
 // a published digit-only `701E` envelope.
 const match=/^([A-FY]?)(\d{1,6})([A-Z]{0,2})$/.exec(str);
 return match?{code:str,prefix:match[1],number:Number(match[2]),suffix:match[3]}:null;
}
function getEnvelopes(csvText){
 const lines=csvText.trimEnd().split(/\r?\n/).slice(1),out=[];
 for(const line of lines){
  // The first eight columns contain no quoted commas in the 3 tracked PNGs.
  for(const watch of WATCH){
   if(!line.startsWith('私铁,東武鉄道,')||!line.includes('/'+watch.png+','))continue;
   const x=line.split(',');
   if(x.length!==9||!x[3]||!/^\d+$/.test(x[4])||!/^\d+$/.test(x[5]))
    throw Error('Malformed monitored PNG band: '+watch.model);
   if(x[3]!==watch.line)throw Error('Unexpected line scope for '+watch.model);
   const a=Number(x[4]),b=Number(x[5]);if(b<a)throw Error('Reversed range');
   out.push({...watch,min:a,max:b,suffix:x[6],format:x[7]});
  }
 }
 if(out.length!==WATCH.length)throw Error('Expected exactly 3 existing Tobu wide PNG references; got '+out.length);
 return out;
}
function inspect(records,sourceInfo={},envelopes=getEnvelopes(fs.readFileSync(CSV,'utf8'))){
 if(!Array.isArray(records))throw TypeError('Expected an ODPT timetable array');
 const unique=new Set(),lines=new Map(),all=new Map(),issues={noNumber:0,badNumber:0,missingRailway:0},stamps=new Set();
 for(const r of records){
  if(!r||typeof r!=='object')continue;
  const raw=r['odpt:trainNumber'];if(raw==null||String(raw).trim()===''){issues.noNumber++;continue;}
  const num=parseNumber(raw);if(!num){issues.badNumber++;continue;}
  const railway=tail(r['odpt:railway']),calendar=tail(r['odpt:calendar']);
  const dir=tail(r['odpt:railDirection']),type=tail(r['odpt:trainType']);
  if(!railway)issues.missingRailway++;
  for(const stamp of [r['dc:date'],r['dct:issued']])if(stamp)stamps.add(String(stamp).slice(0,10));
  const key=[railway,calendar,dir,type,num.code].join('|');if(unique.has(key))continue;unique.add(key);
  const group=[railway,calendar,dir,type].join('|');
  const bag=lines.get(group)||new Set();bag.add(num.code);lines.set(group,bag);
  const where=all.get(num.code)||new Set();where.add([railway,calendar,dir].join('|'));all.set(num.code,where);
 }
 const summaries=[...lines].sort((a,b)=>a[0].localeCompare(b[0])).map(([scope,codes])=>{
  const prefixCounts={},suffixCounts={};for(const c of codes){const n=parseNumber(c);
   prefixCounts[n.prefix||'(none)']=(prefixCounts[n.prefix||'(none)']||0)+1;
   suffixCounts[n.suffix||'(none)']=(suffixCounts[n.suffix||'(none)']||0)+1;}
  return {scope,count:codes.size,prefixCounts,suffixCounts,
   firstExamples:[...codes].sort((a,b)=>parseNumber(a).number-parseNumber(b).number||a.localeCompare(b)).slice(0,5)};
 });
 const matches=envelopes.map(e=>{
  const matched=[...all.keys()].filter(x=>{const n=parseNumber(x);return !n.prefix&&n.suffix===e.suffix&&n.number>=e.min&&n.number<=e.max;})
   .sort((a,b)=>parseNumber(a).number-parseNumber(b).number||a.localeCompare(b));
  const railways=[...new Set(matched.flatMap(x=>[...all.get(x)].map(s=>s.split('|')[0])))].sort();
  // No automatic inference from a service's number or railway to its artwork.
  return {model:e.model,png:e.png,referenceLine:e.line,referenceEnvelope:`${e.min}-${e.max}${e.suffix}`,
   matchedPublishedCodes:matched.length,codeExamples:matched.slice(0,24),observedRailways:railways,
   verifiedTrainToPng:0,modelFieldCrosswalkVerified:false,sourceComplete:!!sourceInfo.complete};
 });
 return {status:records.length?'observed':'empty',source:TIMETABLE,route:'existing-protected-ODPT-proxy',
  challengeLimitedLicense:true,ingestedRecords:records.length,uniqueTimetableRows:unique.size,
  uniqueNumbers:all.size,observedStamps:[...stamps].sort(),groups:summaries,watched:matches,
  failures:sourceInfo.failures||[],complete:!!sourceInfo.complete,issues,
  trainToPngAuthorized:0,qualification:'Number-presence only. Calendar, route, actual formation, livery and physical PNG identity remain unverified.'};
}
function summary(data){
 let s='# Tobu ODPT TrainTimetable: read-only number/reference comparison\n\n';
 s+='Source: '+TIMETABLE+' (Challenge 2026 limited license; no credentials or full timetable stored).\n\n';
 s+='Status: **'+data.status+'**; input rows: '+(data.ingestedRecords||0)+
  '; unique numbers: '+(data.uniqueNumbers||0)+'; coverage: **'+(data.complete?'complete':'partial/unconfirmed')+'**.\n\n';
 s+='The following counts are **observed number-only candidates**, not PNG mappings.\n\n';
 s+='| Existing PNG | Wide reference envelope | Observed distinct matching codes | ODPT railway values | Confirmed vehicle IDs |\n|---|---|---:|---|---:|\n';
 for(const x of data.watched||[])s+='| '+x.model+' | '+x.referenceEnvelope+' | '+x.matchedPublishedCodes+
  ' | '+(x.observedRailways.join(', ')||'none')+' | 0 |\n';
 s+='\nGroups (railway / calendar / direction / trainType):\n\n';
 for(const g of data.groups||[])s+='- '+g.scope+': '+g.count+' unique; prefixes '+JSON.stringify(g.prefixCounts)+
  '; suffixes '+JSON.stringify(g.suffixCounts)+'\n';
 if(data.failures?.length)s+='\nUnretrieved scopes: '+JSON.stringify(data.failures)+'\n';
 s+='\n**Do not** shrink a range, publish a new mapping, or infer any specific PNG solely from these counts. Incomplete query coverage cannot prove absence of a train number.\n';
 return s;
}
async function fetchTimetableScope(fetcher,params){
  const url=new URL(PROXY);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  const response=await fetcher(url.toString(),{headers:{Origin:ORIGIN,Accept:'application/json'},
   signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const body=await response.json();
  const data=Array.isArray(body)?body:Array.isArray(body?.data)?body.data:null;
  if(!data)throw Error('Non-array timetable response');
  return data;
}
async function fetchScoped(fetcher=globalThis.fetch){
 const failures=[];let records=[];let complete=false;
 // Health probe reports only whether a secret is configured; never its value.
 // Missing challenge configuration must NOT be mistaken for empty timetables.
 try{
  const health=await fetcher(PROXY+'?health=1',{headers:{Origin:ORIGIN,Accept:'application/json'},
    signal:AbortSignal.timeout(10000)});
  if(!health.ok)throw Error('proxy health HTTP '+health.status);
  const info=await health.json();
  if(info?.challengeConfigured!==true){
   return {records,complete,failures:[{scope:'proxy-health',reason:'challenge consumer key not configured in Supabase Edge secrets'}]};
  }
 }catch(e){
  return {records,complete,failures:[{scope:'proxy-health',reason:String(e?.message||'unavailable').slice(0,95)}]};
 }

 // Query every railway/calendar pair explicitly. The unfiltered endpoint can
 // return exactly 1000 rows while omitting later railways, so a green capped
 // response is not evidence of complete source coverage.
 for(const scope of SCOPES){
  const railway='odpt.Railway:Tobu.'+scope;
  for(const calendarName of CALENDARS){
   const calendar='odpt.Calendar:'+calendarName;
   const label=scope+'/'+calendarName;
   try{
    const data=await fetchTimetableScope(fetcher,{operator:'Tobu',type:'trainTimetable',railway,calendar});
    records.push(...data);
    if(data.length>=1000)failures.push({scope:label,reason:'possible 1000-row response cap'});
   }catch(e){failures.push({scope:label,reason:String(e?.message||'unknown').slice(0,55)});}
  }
 }
 complete=failures.length===0;
 return {records,complete,failures};
}
async function main(argv=process.argv.slice(2)){
 const flag=f=>{const v=argv.find(x=>x.startsWith(f+'='));return v?v.slice(f.length+1):null;};
 let data;
 try{
  const input=flag('--file')?{records:JSON.parse(fs.readFileSync(flag('--file'),'utf8')),
     complete:true,failures:[]}:await fetchScoped();
  data=inspect(input.records,input);
 }catch(e){
  data={status:'source-unavailable',complete:false,ingestedRecords:0,uniqueNumbers:0,
   watched:[],groups:[],failures:[{scope:'audit',reason:String(e?.message||'unavailable').slice(0,100)}],
   trainToPngAuthorized:0};
 }
 const out=flag('--output');if(out)fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
 const text=summary(data);const md=flag('--summary');if(md)fs.appendFileSync(md,text);
 console.log(text);
 // A green workflow with 0 ODPT records is NOT a successful source audit.
 if(argv.includes('--require-observation') && !(data.status==='observed' && data.ingestedRecords>0 && data.uniqueNumbers>0)){
  console.error('[Tobu ODPT] SOURCE_UNAVAILABLE: no verified timetable records; do not treat 0 matches as actual train gaps.');
  process.exitCode=2;
 }
 return data;
}
if(require.main===module)main().catch(e=>{console.error('Tobu audit error',e?.message);process.exitCode=1;});
module.exports={ORIGIN,PROXY,TIMETABLE,SCOPES,CALENDARS,WATCH,parseNumber,getEnvelopes,inspect,summary,fetchTimetableScope,fetchScoped,main};
