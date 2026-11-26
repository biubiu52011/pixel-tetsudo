'use strict';
// Read-only ODPT Toei Train observer. No operation-number conversion or DB writes.
const fs=require('node:fs');
const {getRows}=require('./build-train-number-png-catalog.cjs');
const SOURCE='https://api-public.odpt.org/api/v4/odpt:Train?odpt:operator=odpt.Operator:Toei';
const TIMETABLE_SOURCE='https://api-public.odpt.org/api/v4/odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei';
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

 // 只读官方列车时刻表：原始号码/日历/车主独立，保留来源时间字段但不推断有效期。
function inspectTimetable(records,rows=getRows(),date=new Date().toISOString()){
 if(!Array.isArray(records))throw TypeError('Expected a JSON array of ODPT timetables');
 const result={status:records.length?'observed':'empty-response',source:TIMETABLE_SOURCE,date,
  provider:'東京都交通局・公共交通オープンデータ協議会',license:'CC BY 4.0',
  returned:records.length,otherRailway:0,officialCrosswalkVerifiedCount:0,
  currentServiceDateVerified:false,actualVehicleConfirmed:false,lines:{}};
 const old={};
 for(const line of LINES){
  old[line]={weekday:new Set(),holiday:new Set()};
  for(const r of rows)if(r.lineIds.length===1&&r.lineIds[0]===line&&r.operator==='Toei'&&
    Array.isArray(r.sourceRailways)&&r.sourceRailways.includes('odpt.Railway:Toei.'+line)){
   for(const n of r.weekdayNumbers||[])old[line].weekday.add(String(n));
   for(const n of r.holidayNumbers||[])old[line].holiday.add(String(n));
  }
  result.lines[line]={count:0,missingNumber:0,missingCalendar:0,missingOwner:0,
   vehicleTypeProvided:0,sourceMetadata:{},groups:{}};
 }
 for(const r of records){
  if(!r||typeof r!=='object'){result.otherRailway++;continue;}
  const line=LINES.find(l=>r['odpt:railway']==='odpt.Railway:Toei.'+l);
  if(!line){result.otherRailway++;continue;}
  const out=result.lines[line],number=String(r['odpt:trainNumber']||''),
   calendar=String(r['odpt:calendar']||''),own=owner(r['odpt:trainOwner']),
   direction=String(r['odpt:railDirection']||''),type=String(r['odpt:trainType']||'');
  out.count++;
  if(!number)out.missingNumber++;if(!calendar)out.missingCalendar++;if(!own)out.missingOwner++;
  if(r['odpt:vehicleType'])out.vehicleTypeProvided++;
  for(const field of ['dc:date','dct:modified','dct:valid','odpt:date']){
   if(typeof r[field]!=='string'||!r[field])continue;
   const list=out.sourceMetadata[field]||(out.sourceMetadata[field]=[]);
   if(!list.includes(r[field]))list.push(r[field]);
  }
  if(!number||!calendar)continue;
  const key=JSON.stringify([calendar,own,direction,type]);
  const g=out.groups[key]||(out.groups[key]={calendar,owner:own,direction,trainType:type,
    records:0,numbers:[],literalOverlap:[],notInOldRoster:[]});
  g.records++;if(!g.numbers.includes(number))g.numbers.push(number);
 }
 for(const [line,out] of Object.entries(result.lines)){
  out.groups=Object.values(out.groups).sort((a,b)=>JSON.stringify([a.calendar,a.owner,a.direction,a.trainType]).localeCompare(JSON.stringify([b.calendar,b.owner,b.direction,b.trainType]),'en'));
  for(const g of out.groups){
   g.numbers.sort();const cal=g.calendar==='odpt.Calendar:Weekday'?'weekday':
    g.calendar==='odpt.Calendar:SaturdayHoliday'?'holiday':'';
   g.legacyCalendarComparable=!!cal;
   if(cal){g.literalOverlap=g.numbers.filter(n=>old[line][cal].has(n));
    g.notInOldRoster=g.numbers.filter(n=>!old[line][cal].has(n));}
  }
 }
 return result;
}
// 运营商级响应可能不覆盖四线；逐线路查询并记录各自响应范围，禁止把缺失当作零列车。
async function fetchTimetablesByLine(fetcher=globalThis.fetch,rows=getRows()){
 const records=[],queries={};
 await Promise.all(LINES.map(async line=>{
  const railway='odpt.Railway:Toei.'+line;
  const url=TIMETABLE_SOURCE+'&odpt:railway='+railway;
  try{
   const data=await fetchOfficial(fetcher,url);
   if(!Array.isArray(data))throw TypeError('Expected array');
   const own=data.filter(r=>r&&r['odpt:railway']===railway);
   queries[line]={status:!data.length?'empty-response':!own.length?'scope-mismatch':own.length!==data.length?'mixed-scope':'observed',
    returned:data.length,matching:own.length,source:url};
   records.push(...own);
  }catch(e){queries[line]={status:'source-unavailable',source:url,error:String(e&&e.name||'Error')+': '+String(e&&e.message||'').slice(0,100).replace(/https?:\/\/\S+/g,'[url]')};}
 }));
 const result=inspectTimetable(records,rows);
 result.queries=Object.fromEntries(LINES.map(line=>[line,queries[line]]));
 result.coverageComplete=false;
 return result;
}
function timetableSummary(r){
 let s='\n## 都营官方列车时刻表（只读）\n\n状态: **'+r.status+'**\n\n';
 if(r.status!=='observed')return s+(r.error||'无可验证记录')+'\n';
 s+='| 线路 | 来源记录 | 完整番号去重 | 车主缺失 | 车型字段 | 字面命中旧名单 | 新名单候选 |\n|---|---:|---:|---:|---:|---:|---:|\n';
 for(const [line,v] of Object.entries(r.lines)){
  const uniq=key=>new Set(v.groups.flatMap(g=>g[key])).size;
  s+='| '+line+' | '+v.count+' | '+uniq('numbers')+' | '+v.missingOwner+' | '+v.vehicleTypeProvided+' | '+uniq('literalOverlap')+' | '+uniq('notInOldRoster')+' |\n';
 }
 if(r.queries){
  s+='\n逐线路响应：'+JSON.stringify(r.queries)+'\n';
  s+='来源日期字段：'+JSON.stringify(Object.fromEntries(Object.entries(r.lines).map(([k,v])=>[k,v.sourceMetadata])))+'\n';
 }
 return s+'\n字面交集不证明同运营日、官方接续或实车车型。来源日期元数据不自动当作有效期。\n署名：東京都交通局・公共交通オープンデータ協議会 (CC BY 4.0)。\n';
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
async function fetchOfficial(fetcher=globalThis.fetch,source=SOURCE){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
 try{
  const r=await fetcher(source,{signal:c.signal,redirect:'error',headers:{Accept:'application/json'}});
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
 // 复用原审计入口和产物，不另建生产数据源；离线 --file 不触发网络。
 if(!opt('--file')||opt('--timetable-file')){
  try{
   result.timetable=opt('--timetable-file')?
    inspectTimetable(JSON.parse(fs.readFileSync(opt('--timetable-file'),'utf8'))):
    await fetchTimetablesByLine();
  }catch(e){result.timetable={status:'source-unavailable',source:TIMETABLE_SOURCE,
   officialCrosswalkVerifiedCount:0,currentServiceDateVerified:false,actualVehicleConfirmed:false,
   error:String(e&&e.name||'Error').slice(0,40)+': '+String(e&&e.message||'').slice(0,100).replace(/https?:\/\/\S+/g,'[url]')};}
 }
 const report=summary(result)+(result.timetable?timetableSummary(result.timetable):'');
 if(opt('--output'))fs.writeFileSync(opt('--output'),JSON.stringify(result,null,2)+'\n');
 if(opt('--summary'))fs.appendFileSync(opt('--summary'),report+'\n');
 console.log(report);return result;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={SOURCE,TIMETABLE_SOURCE,LINES,owner,format,inspect,inspectTimetable,summary,timetableSummary,fetchOfficial,fetchTimetablesByLine,main};
