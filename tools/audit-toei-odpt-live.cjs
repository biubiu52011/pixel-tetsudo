'use strict';
// Read-only ODPT Toei Train observer. No operation-number conversion or DB writes.
const fs=require('node:fs');
const {getRows}=require('./build-train-number-png-catalog.cjs');
const SOURCE='https://api-public.odpt.org/api/v4/odpt:Train?odpt:operator=odpt.Operator:Toei';
const LINES=['Asakusa','Mita','Shinjuku','Oedo'];
function owner(s){return String(s||'').replace(/^odpt\.(?:Operator|TrainOwner):/,'');}
function format(n){
 if(!n)return 'missing';
 if(/^\d{3,4}$/.test(n))return 'numeric';
 if(/^\d{3,4}[A-Z]{1,2}$/.test(n))return 'suffixed';
 if(/^ODPT\d+$/.test(n))return 'opaque';
 return 'other';
}
function inspect(records,rows=getRows(),date=new Date().toISOString()){
 if(!Array.isArray(records))throw TypeError('Expected a JSON array of ODPT trains');
 const result={status:'observed',source:SOURCE,date,
  provider:'東京都交通局・公共交通オープンデータ協議会',license:'CC BY 4.0',
  // Number overlap with an archived GTFS roster is NOT an official crosswalk.
  officialCrosswalkVerifiedCount:0,returned:records.length,otherRailway:0,lines:{}};
 const sets={};
 for(const line of LINES){
  sets[line]=new Set();
  for(const r of rows)if(r.lineIds.length===1&&r.lineIds[0]===line&&
   r.operator==='Toei'&&Array.isArray(r.sourceRailways)&&
   r.sourceRailways.includes('odpt.Railway:Toei.'+line)&&
   Array.isArray(r.weekdayNumbers)&&Array.isArray(r.holidayNumbers))
   for(const n of (r.weekdayNumbers||[]).concat(r.holidayNumbers||[]))
    sets[line].add(String(n).toUpperCase());
  result.lines[line]={count:0,ownerMissing:0,numeric:0,overlap:0,ownedOverlap:0,
   providedVehicleType:0,formats:{},owners:{},examples:[]};
 }
 for(const r of records){
  if(!r||typeof r!=='object')continue;
  const line=LINES.find(l=>r['odpt:railway']==='odpt.Railway:Toei.'+l);
  if(!line){result.otherRailway++;continue;}
  const out=result.lines[line],n=String(r['odpt:trainNumber']||'').trim().toUpperCase(),
    o=owner(r['odpt:trainOwner']||r.trainOwner),f=format(n),hit=sets[line].has(n);
  out.count++;out.formats[f]=(out.formats[f]||0)+1;
  out.owners[o||'(missing)']=(out.owners[o||'(missing)']||0)+1;
  if(!o)out.ownerMissing++;
  if(f==='numeric')out.numeric++;
  if(String(r['odpt:vehicleType']||'').trim())out.providedVehicleType++;
  if(hit)out.overlap++;
  if(hit&&o==='Toei')out.ownedOverlap++;
  if(out.examples.length<5)out.examples.push({rawNumber:n,owner:o,format:f,
    stagedUnionMatch:hit,hasVehicleType:!!String(r['odpt:vehicleType']||'').trim()});
 }
 return result;
}
function summary(r){
 let s='# Toei ODPT source-number observation\n\nStatus: **'+r.status+'**\n\n';
 if(r.status!=='observed')return s+'**INCONCLUSIVE**: '+(r.error||'source unavailable')+'\n';
 s+='| Line | Trains | Numeric | Registered number overlap | Overlap + Toei owner | Missing owner | Vehicle type provided |\n';
 s+='|---|---:|---:|---:|---:|---:|---:|\n';
 for(const [name,v] of Object.entries(r.lines))
  s+='| '+name+' | '+v.count+' | '+v.numeric+' | '+v.overlap+' | '+v.ownedOverlap+' | '+v.ownerMissing+' | '+v.providedVehicleType+' |\n';
 return s+'\nNo conversion is performed. Registered number overlap DOES NOT prove an official train-number crosswalk, a confirmed model or actual carset.\n\nCredit: 東京都交通局・公共交通オープンデータ協議会 (CC BY 4.0).\n';
}
async function fetchOfficial(fetcher=globalThis.fetch){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
 try{
  const r=await fetcher(SOURCE,{signal:c.signal,redirect:'error',headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const t=await r.text();if(t.length>8*1024*1024)throw Error('Response too large');
  return JSON.parse(t);
 }finally{clearTimeout(timer);}
}
async function main(argv){
 const opt=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;};
 let result;
 try{
  const input=opt('--file')?JSON.parse(fs.readFileSync(opt('--file'),'utf8')):await fetchOfficial();
  result=inspect(input);
 }catch(e){result={status:'source-unavailable',source:SOURCE,
  date:new Date().toISOString(),officialCrosswalkVerifiedCount:0,
  error:String(e&&e.name||'Error').slice(0,40)+': '+String(e&&e.message||'').slice(0,100).replace(/https?:\/\/\S+/g,'[url]')};}
 if(opt('--output'))fs.writeFileSync(opt('--output'),JSON.stringify(result,null,2)+'\n');
 if(opt('--summary'))fs.appendFileSync(opt('--summary'),summary(result)+'\n');
 console.log(summary(result));return result;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={SOURCE,LINES,owner,format,inspect,summary,fetchOfficial,main};
