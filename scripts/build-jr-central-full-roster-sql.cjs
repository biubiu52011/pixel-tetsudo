'use strict';

// Builds reviewable SQL batches from a RIGHTS-CLEARED complete source CSV.
// Never fetches or bulk mirrors JR Odekake / other timetable websites.
// Reuses the one existing authorized importer: no parallel database writer.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {prepare}=require('./prepare-jr-central-sql-plan.cjs');

const LINES=new Set(['TokaidoCentral','ChuoCentral','Gotemba','Minobu',
 'Iida','Takayama','Taita','Taketoyo','KansaiCentral','KiseiCentral',
 'Sangu','Meisho','MinoAkasaka']);
const CALENDARS=['odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday'];
const DIRECTIONS=['odpt.RailDirection:Inbound','odpt.RailDirection:Outbound'];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function invariant(ok,msg){if(!ok)throw Error(msg);}
function minutes(value){
 if(value===null)return null;
 const m=/^([01]\d|2\d):([0-5]\d)$/.exec(value);
 invariant(Boolean(m),'INVALID_SCHEDULE_CLOCK:'+String(value));
 return Number(m[1])*60+Number(m[2]);
}
function checkTimes(train){
 let last=null;
 for(const stop of train.stops){
  const arrival=minutes(stop.arrival),departure=minutes(stop.departure);
  const first=arrival===null?departure:arrival;
  invariant(first!==null,'SCHEDULE_STOP_WITHOUT_CLOCK:'+train.train_number);
  invariant(last===null||first>=last,
   'SCHEDULE_CLOCK_REVERSAL_OR_UNNORMALIZED_MIDNIGHT:'+train.train_number);
  invariant(arrival===null||departure===null||departure>=arrival,
   'SCHEDULE_NEGATIVE_DWELL:'+train.train_number);
  last=departure===null?arrival:departure;
 }
}
// Cannot be substituted by a public webpage or the publisher's general TOS.
// An actually granted licence and scope are prerequisites for full-table use.
function validateRights(source,grant){
 invariant(source&&source.authorization==='licensed_for_republication',
  'FULL_TABLE_REQUIRES_EXPLICIT_REPUBLICATION_LICENSE');
 invariant(grant&&grant.confirmed===true&&
  grant.permission==='scheduled_train_times_database_republication'&&
  typeof grant.grant_url==='string'&&/^https:\/\//.test(grant.grant_url)&&
  grant.grant_url!==source.url,'BULK_LICENSE_GRANT_NOT_DOCUMENTED');
 invariant(source.authorization_evidence_url===grant.grant_url,
  'SOURCE_AND_GRANT_URL_MISMATCH');
 invariant(source.edition_date==='2026-11-01',
  'EXISTING_SQL_IMPORTER_SUPPORTS_2026_11_ONLY');
}
function makeBatches(source,csv,roster,grant,batchSize=80){
 validateRights(source,grant);
 invariant(roster&&LINES.has(roster.line_key),'UNKNOWN_JRC_CANONICAL_LINE');
 invariant(roster.complete_scope===true,
  'COMPLETE_SCOPE_ROSTER_REQUIRED');
 invariant(roster.expected&&typeof roster.expected==='object',
  'INDEPENDENT_EXPECTED_ROSTER_REQUIRED');
 invariant(Number.isInteger(batchSize)&&batchSize>=1&&batchSize<=200,
  'INVALID_BATCH_SIZE');
 const doc=prepare(source,csv);
 const groups=Object.create(null),seenDates=new Map();
 for(const calendar of CALENDARS){
  groups[calendar]=Object.create(null);
  for(const direction of DIRECTIONS)groups[calendar][direction]=0;
 }
 for(const train of doc.trains){
  invariant(CALENDARS.includes(train.calendar_urn)&&
    DIRECTIONS.includes(train.direction_urn),'INVALID_TRAIN_SCOPE');
  checkTimes(train);
  groups[train.calendar_urn][train.direction_urn]++;
  for(const date of train.operating_dates){
   const key=train.calendar_urn+'|'+train.train_number+'|'+date;
   invariant(!seenDates.has(key),
    'DUPLICATE_NUMBER_OCCURRENCE_NEEDS_MANUAL_MERGE:'+key);
   seenDates.set(key,true);
  }
 }
 // Compare independently counted *column occurrences*, not just unique
 // train numbers: 2244 can show the same number in multiple timetable columns.
 for(const calendar of CALENDARS){
  const expected=roster.expected[calendar];
  invariant(expected&&typeof expected==='object',
   'MISSING_CALENDAR_IN_EXPECTED_ROSTER:'+calendar);
  for(const direction of DIRECTIONS){
   const count=expected[direction];
   invariant(Number.isInteger(count)&&count>=0,
    'MISSING_DIRECTION_COUNT:'+calendar+':'+direction);
   invariant(count===groups[calendar][direction],
    'FULL_ROSTER_COUNT_MISMATCH:'+calendar+':'+direction+
     ':expected='+count+':got='+groups[calendar][direction]);
  }
 }
 invariant(doc.trains.length>0,'EMPTY_AUTHORIZED_ROSTER');
 const batches=[];
 for(let i=0;i<doc.trains.length;i+=batchSize){
  const trips=doc.trains.slice(i,i+batchSize);
  const payload=JSON.stringify({source:doc.source,trains:trips});
  const escaped=payload.replace(/'/g,"''");
  const sql='-- Authorized JR Central plan import, batch '+(batches.length+1)+
   '. Full-day acceptance requires a separate production verification.\n'+
   '-- Scope: '+roster.line_key+' / source SHA-256 '+hash(csv)+'\n'+
   "SELECT * FROM public.import_jr_central_authorized_plan('"+
   roster.line_key+"','"+escaped+"'::jsonb);\n";
  batches.push({file:'batch-'+String(batches.length+1).padStart(3,'0')+'.sql',
   sql,templates:trips.length,stops:trips.reduce((n,t)=>n+t.stops.length,0),
   sha256:hash(sql)});
 }
 const report={
  line_key:roster.line_key,
  source_sha256:hash(csv),
  source_edition:source.edition_date,
  source_url:source.url,
  grant_url:grant.grant_url,
  source_template_count:doc.trains.length,
  source_stop_count:doc.trains.reduce((n,t)=>n+t.stops.length,0),
  counts:groups,
  sql_batches:batches.map(({file,templates,stops,sha256})=>(
   {file,templates,stops,sha256})),
  full_day_accepted:false,
  note:'Batches are NOT applied. Independently verify all route sections, dates, '+
   'station timing, source license, and production SQL acceptance before declaring complete.'
 };
 return {report,batches};
}
function cli(){
 const args=process.argv.slice(2);
 const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
 const src=option('--source'),csv=option('--csv'),roster=option('--roster');
 const grant=option('--grant'),output=option('--out');
 if(!src||!csv||!roster||!grant||!output)throw Error(
  'USAGE: --source rights.json --csv stops.csv --roster expected.json '+
  '--grant license-grant.json --out PRIVATE_DIRECTORY [--batch-size 80]');
 const r=makeBatches(
  JSON.parse(fs.readFileSync(src,'utf8')),
  fs.readFileSync(csv,'utf8'),
  JSON.parse(fs.readFileSync(roster,'utf8')),
  JSON.parse(fs.readFileSync(grant,'utf8')),
  Number(option('--batch-size')||80));
 fs.mkdirSync(output,{recursive:true});
 for(const b of r.batches)fs.writeFileSync(path.join(output,b.file),b.sql);
 fs.writeFileSync(path.join(output,'validation.json'),
  JSON.stringify(r.report,null,2)+'\n');
 process.stdout.write(JSON.stringify({out:output,...r.report},null,2)+'\n');
}
if(require.main===module){
 try{cli();}catch(e){console.error(String(e.message||e));process.exitCode=1;}
}
module.exports={makeBatches,checkTimes,validateRights};
