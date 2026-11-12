'use strict';

// Converts an independently authored/authorized flat CSV into the EXISTING
// public.import_jr_central_authorized_plan document format. This tool NEVER
// copies a public timetable website and NEVER writes to Supabase by itself.
// station_id values are the pre-registered physical IDs in line_stations.
// Usage:
// node scripts/prepare-jr-central-sql-plan.cjs --source rights.json --csv stops.csv --out plan.json
const fs = require('node:fs');

const COLUMNS = Object.freeze(['service_key','train_number','calendar_urn',
  'direction_urn','train_type','operating_dates','stop_sequence','station_id',
  'arrival','departure']);

function csvRows(input) {
  const rows=[]; let row=[],field='',quote=false;
  const s=String(input).replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(quote){
      if(c==='"'&&s[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quote=false;
      else field+=c;
    }else if(c==='"'){
      if(field.length)throw Error('CSV_QUOTE_IN_UNQUOTED_FIELD');
      quote=true;
    }else if(c===','){row.push(field);field='';}
    else if(c==='\r'||c==='\n'){
      if(c==='\r'&&s[i+1]==='\n')i++;
      row.push(field); field='';
      if(row.some(x=>x!==''))rows.push(row);
      row=[];
    }else field+=c;
  }
  if(quote)throw Error('CSV_UNCLOSED_QUOTE');
  if(field!==''||row.length){row.push(field);rows.push(row);}
  return rows;
}
function prepare(source, csv) {
  if(!source||typeof source!=='object'||Array.isArray(source)||
     !['original_compilation','licensed_for_republication'].includes(source.authorization)||
     !/^https:\/\/\S+$/.test(String(source.url||''))||
     !/^https:\/\/\S+$/.test(String(source.authorization_evidence_url||''))||
     !/^20\d\d-\d\d-\d\d$/.test(String(source.edition_date||'')))
    throw Error('SOURCE_RIGHTS_NOT_VERIFIED');
  const records=csvRows(csv);
  if(records.length<3)throw Error('CSV_NO_TRAIN_STOPS');
  const header=records.shift();
  if(header.join(',')!==COLUMNS.join(','))throw Error('CSV_COLUMN_ORDER_INVALID');
  const trains=new Map();
  for(let rowNumber=0;rowNumber<records.length;rowNumber++){
    const cells=records[rowNumber];
    if(cells.length!==COLUMNS.length)throw Error('CSV_COLUMN_COUNT:'+String(rowNumber+2));
    const row=Object.fromEntries(COLUMNS.map((name,i)=>[name,cells[i].trim()]));
    if(!row.service_key||!/^[0-9]{1,5}[A-Z]{0,2}$/.test(row.train_number)||
       !['odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday'].includes(row.calendar_urn)||
       !['odpt.RailDirection:Inbound','odpt.RailDirection:Outbound'].includes(row.direction_urn)||
       !['Local','Rapid','SectionRapid','SpecialRapid','LimitedExpress'].includes(row.train_type)||
       !/^\d+$/.test(row.stop_sequence)||!row.station_id||
       !/^(?:[01]\d|2\d):[0-5]\d$|^$/.test(row.arrival)||
       !/^(?:[01]\d|2\d):[0-5]\d$|^$/.test(row.departure)||
       (!row.arrival&&!row.departure))
      throw Error('CSV_INVALID_STOP:'+String(rowNumber+2));
    const days=row.operating_dates.split(';').map(x=>x.trim());
    if(!days.length||days.some(x=>!/^20\d\d-\d\d-\d\d$/.test(x))||
       new Set(days).size!==days.length)throw Error('CSV_INVALID_SERVICE_DATE');
    const key=row.service_key;
    const fields={train_number:row.train_number,calendar_urn:row.calendar_urn,
      direction_urn:row.direction_urn,train_type:row.train_type,operating_dates:days};
    let existing=trains.get(key);
    if(!existing){existing={...fields,stops:[],_source_key:key};trains.set(key,existing);}
    else for(const name of ['train_number','calendar_urn','direction_urn','train_type','operating_dates'])
      if(JSON.stringify(existing[name])!==JSON.stringify(fields[name]))
        throw Error('CSV_TRAIN_METADATA_CONFLICT:'+key);
    const index=Number(row.stop_sequence);
    if(index!==existing.stops.length)throw Error('CSV_STOP_ORDER_GAP:'+key);
    existing.stops.push({station_id:row.station_id,
      arrival:row.arrival||null,departure:row.departure||null});
  }
  const output=[...trains.values()].map(({_source_key,...train})=>{
    if(train.stops.length<2||!train.stops[0].departure||
       !train.stops[train.stops.length-1].arrival)
      throw Error('CSV_INCOMPLETE_TRAIN:'+_source_key);
    return train;
  });
  if(!output.length||output.length>1000)throw Error('CSV_UNSUPPORTED_TRAIN_COUNT');
  // SQL remains the authority for station registry, line/direction order,
  // 2026-11 holiday calendar, monotone clocks, and import permissions.
  return {source:{url:source.url,authorization:source.authorization,
    authorization_evidence_url:source.authorization_evidence_url,
    edition_date:source.edition_date},trains:output};
}

if(require.main===module){
  const args=process.argv.slice(2);
  const option=name=>{const idx=args.indexOf(name);return idx>=0?args[idx+1]:undefined;};
  try{
    if(!option('--source')||!option('--csv'))throw Error('REQUIRED_SOURCE_AND_CSV');
    const source=JSON.parse(fs.readFileSync(option('--source'),'utf8'));
    const csv=fs.readFileSync(option('--csv'),'utf8');
    const output=JSON.stringify(prepare(source,csv),null,2)+'\n';
    if(option('--out'))fs.writeFileSync(option('--out'),output);
    else process.stdout.write(output);
  }catch(error){
    process.stderr.write(String(error.message||error)+'\n');
    process.exitCode=1;
  }
}
module.exports={csvRows,prepare,COLUMNS};
