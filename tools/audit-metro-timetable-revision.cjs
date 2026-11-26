'use strict';
// Read-only provenance reconciliation. Never treats publication metadata as
// a service validity date. No raw timetable or credential is written/logged.
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const {PROXY,ORIGIN,fetchTimetableScope}=require('./audit-tobu-odpt-number-bands.cjs');
// Production read-only SQL snapshot 2026-11-27; regenerate via the existing
// metro_yokohama_final_coverage_review_readonly.sql fingerprint section.
const baseline=[
 [
  "Ginza",
  "TokyoMetro.Ginza",
  "SaturdayHoliday",
  618,
  "d89a7dc7e06fe5f44c1ce7e81b705b19"
 ],
 [
  "Ginza",
  "TokyoMetro.Ginza",
  "Weekday",
  728,
  "f53d7509b6e84fc399cbe027a15d0085"
 ],
 [
  "Hibiya",
  "TokyoMetro.Hibiya",
  "SaturdayHoliday",
  432,
  "acd48ad896ea471d08a72422f4ae271e"
 ],
 [
  "Hibiya",
  "TokyoMetro.Hibiya",
  "Weekday",
  591,
  "91b493b14ccb3c6d76abab715a201954"
 ],
 [
  "Marunouchi",
  "TokyoMetro.Marunouchi",
  "SaturdayHoliday",
  503,
  "07bf598e314b097cfacf9d0cb3b685f4"
 ],
 [
  "Marunouchi",
  "TokyoMetro.Marunouchi",
  "Weekday",
  686,
  "52d534a5881866c1d0a316caae44b3d4"
 ],
 [
  "Mita",
  "Toei.Mita",
  "SaturdayHoliday",
  352,
  "dda3aae754b73044fe77ef16b4395c52"
 ],
 [
  "Mita",
  "Toei.Mita",
  "Weekday",
  406,
  "b083c02a8dd3f1bb384e29b2c77e7a92"
 ],
 [
  "Tozai",
  "TokyoMetro.Tozai",
  "SaturdayHoliday",
  418,
  "6b7ea8ce7a320a35ead17e19e278ff3c"
 ],
 [
  "Tozai",
  "TokyoMetro.Tozai",
  "Weekday",
  589,
  "b5c1265068c04daf58b1d2e30d054807"
 ],
 [
  "YokohamaBlue",
  "YokohamaMunicipal.Blue",
  "SaturdayHoliday",
  329,
  "2f86a64ee11fd2957cbca2442ba14532"
 ],
 [
  "YokohamaBlue",
  "YokohamaMunicipal.Blue",
  "Weekday",
  369,
  "f54214ab516894ea40b490d1f2db2cb1"
 ],
 [
  "Yurakucho",
  "TokyoMetro.Yurakucho",
  "SaturdayHoliday",
  385,
  "36e15c799b6586c217a72a96f607f3ff"
 ],
 [
  "Yurakucho",
  "TokyoMetro.Yurakucho",
  "Weekday",
  458,
  "19a969c360dfb1d60a2fd83f8a711b86"
 ]
];
const md5=s=>createHash('md5').update(s,'utf8').digest('hex');
// The SQL input contains only strings/null and arrays. PostgreSQL jsonb
// array text uses comma-space separators; do not change stop order.
function canonical(x){
 if(Array.isArray(x))return '['+x.map(canonical).join(', ')+']';
 if(x===null||typeof x==='string')return JSON.stringify(x);
 throw Error('unexpected field type');
}
function record(r,railway,calendar){
 if(!r||r['odpt:railway']!==railway||r['odpt:calendar']!==calendar)throw Error('source scope mismatch');
 const id=r['owl:sameAs'];
 const fields=[id,railway,calendar,r['odpt:trainNumber'],r['odpt:railDirection'],r['odpt:trainType']];
 if(fields.some(x=>typeof x!=='string'||!x))throw Error('missing source identity');
 const dest=r['odpt:destinationStation']??[];
 const stops=r['odpt:trainTimetableObject'];
 if(!Array.isArray(dest)||dest.some(x=>typeof x!=='string')||!Array.isArray(stops)||!stops.length)throw Error('invalid destination or stops');
 const rows=stops.map(s=>{
  if(!s||typeof s!=='object')throw Error('invalid stop');
  const row=['odpt:arrivalStation','odpt:departureStation','odpt:arrivalTime','odpt:departureTime'].map(k=>s[k]??null);
  if(row.every(x=>x===null))throw Error('empty stop');
  return row;
 });
 return {id,hash:md5(canonical([...fields,dest,rows]))};
}
function inspect(rows,scope){
 const [line,rail,cal,expected,expectedHash]=scope,railway='odpt.Railway:'+rail,calendar='odpt.Calendar:'+cal;
 const report={line,calendar,expected,observed:rows.length,status:'unverified',revisionRestored:0,sourceMetadata:{}};
 if(!rows.length||rows.length>=1000){report.status=rows.length?'possible-cap':'empty-response';return report;}
 let entries;
 try{entries=rows.map(r=>record(r,railway,calendar));}catch(e){report.status='invalid-or-scope-mismatch';return report;}
 if(new Set(entries.map(x=>x.id)).size!==entries.length){report.status='duplicate-source-id';return report;}
 report.fingerprint=md5(entries.map(x=>x.hash).sort().join(''));
 for(const k of ['dc:date','dct:modified','dct:valid','odpt:date']){
  const dates=[...new Set(rows.map(r=>r[k]).filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}(?:T[0-9:.+Z-]+)?$/.test(x)))].sort();
  if(dates.length)report.sourceMetadata[k]=dates;
 }
 report.status=rows.length===expected&&report.fingerprint===expectedHash?'snapshot-content-match':'snapshot-content-difference';
 // A match is content evidence ONLY. Effective date requires source semantics
 // and a separately verified service validity window; no SQL mutation here.
 return report;
}
async function main(fetcher=globalThis.fetch){
 const health=await fetcher(PROXY+'?health=1',{headers:{Origin:ORIGIN,Accept:'application/json'},signal:AbortSignal.timeout(10000)});
 if(!health.ok||!(await health.json()).productionConfigured)throw Error('production proxy unavailable');
 const reports=[];
 for(const scope of baseline){
  const [line,rail,cal,expected]=scope;
  let report;
  try{const rows=await fetchTimetableScope(fetcher,{operator:rail.split('.')[0],type:'trainTimetable',railway:'odpt.Railway:'+rail,calendar:'odpt.Calendar:'+cal});
   report=inspect(rows,scope);
  }catch(e){report={line,calendar:cal,expected,status:'source-unavailable',revisionRestored:0};}
  reports.push(report);console.log(JSON.stringify(report));
 }
 const matched=reports.filter(x=>x.status==='snapshot-content-match').reduce((n,x)=>n+x.expected,0);
 console.log(JSON.stringify({scopeCount:reports.length,baselineRecords:6864,contentMatchedRecords:matched,revisionRestored:0}));
 return reports;
}
function selfTest(){
 const r={'owl:sameAs':'id','odpt:railway':'odpt.Railway:TokyoMetro.Ginza','odpt:calendar':'odpt.Calendar:Weekday','odpt:trainNumber':'A1001','odpt:railDirection':'direction','odpt:trainType':'type','odpt:destinationStation':['end'],'odpt:trainTimetableObject':[{'odpt:departureStation':'start','odpt:departureTime':'05:00'},{'odpt:arrivalStation':'end','odpt:arrivalTime':'05:05'}],'dc:date':'2026-09-19'};
 const key=record(r,r['odpt:railway'],r['odpt:calendar']).hash;
 const scope=['Ginza','TokyoMetro.Ginza','Weekday',1,md5(key)];
 assert.equal(canonical(['x',null,['a','b'],[[null,'s',null,'05:00']]]),'["x", null, ["a", "b"], [[null, "s", null, "05:00"]]]');
 assert.equal(md5(canonical(['x',null,['a','b'],[[null,'s',null,'05:00']]])),'4219b088398de1946fb84f9dccfd19e7');
 assert.equal(inspect([r],scope).status,'snapshot-content-match');
 assert.equal(inspect([r],scope).revisionRestored,0);
 assert.equal(inspect([{...r,'odpt:trainTimetableObject':r['odpt:trainTimetableObject'].slice().reverse()}],scope).status,'snapshot-content-difference');
 assert.equal(inspect([{...r,'odpt:calendar':'odpt.Calendar:SaturdayHoliday'}],scope).status,'invalid-or-scope-mismatch');
 assert.equal(inspect([r,r],scope).status,'duplicate-source-id');
 assert.equal(inspect([],scope).status,'empty-response');
 assert.equal(inspect(Array(1000).fill(r),scope).status,'possible-cap');
 console.log('Metro provenance self-test OK');
}
if(require.main===module){
 if(process.argv.includes('--self-test'))selfTest();
 else main().catch(()=>{console.error('Metro official source unavailable; no revision restored');process.exitCode=2;});
}
module.exports={canonical,record,inspect,selfTest,main};
