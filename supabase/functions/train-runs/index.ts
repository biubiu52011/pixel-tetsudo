import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Cache-Control": status === 200 ? cors["Cache-Control"] : "no-store",
      "Content-Type": "application/json; charset=utf-8" },
  });
}

// Dates published by Japan's Cabinet Office; same dates as the browser estimator.
// Treat unknown years as unverified instead of silently assuming weekdays.
const JP_HOLIDAYS: Record<string, string[]> = {
  "2026": ["01-01","01-12","02-11","02-23","03-20","04-29","05-03","05-04","05-05","05-06","07-20","08-11","09-21","09-22","09-23","10-12","11-03","11-23"],
  "2027": ["01-01","01-11","02-11","02-23","03-21","03-22","04-29","05-03","05-04","05-05","07-19","08-11","09-20","09-23","10-11","11-03","11-23"]
};
function serviceCalendars(serviceDate: string) {
  const year = serviceDate.slice(0, 4);
  if (!JP_HOLIDAYS[year]) throw new Error("UNVERIFIED_SERVICE_CALENDAR");
  const day = new Date(serviceDate + "T12:00:00+09:00").getUTCDay();
  if (!Number.isFinite(day)) throw new Error("INVALID_SERVICE_DATE");
  if (JP_HOLIDAYS[year].includes(serviceDate.slice(5)) || day === 0) {
    return ["odpt.Calendar:Holiday", "odpt.Calendar:SaturdayHoliday", "odpt.Calendar:Sunday"];
  }
  if (day === 6) return ["odpt.Calendar:Saturday", "odpt.Calendar:SaturdayHoliday"];
  return ["odpt.Calendar:Weekday"];
}

function calendarType(calendar?: string | null) {
  const value = String(calendar || "");
  if (value.includes("Weekday")) return "weekday";
  if (value.includes("SaturdayHoliday")) return "saturday_holiday";
  if (value.includes("Saturday")) return "saturday";
  if (value.includes("Sunday")) return "sunday";
  if (value.includes("Holiday")) return "holiday";
  return "special";
}

function minuteOf(time?: string | null) {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 4) h += 24;
  return h * 60 + min;
}

function sqlTime(time?: string | null) {
  if (!time) return null;
  return String(time).replace(/^([2-4][0-9]):/, (_m: string, h: string) =>
    String(Number(h) % 24).padStart(2, "0") + ":"
  );
}

function stationKey(urn: string) {
  const p = urn.split(".");
  return p[p.length - 1] || urn;
}

// A published revision replaces the whole line/calendar scope, including
// removed trips. Choosing per train number would resurrect deleted services.
function selectRevision(rows: any[], serviceDate: string, calendar: string | null) {
  const scope = rows.filter(r => {
    const source = Array.isArray(r.evidence_sources) ? r.evidence_sources[0] : r.evidence_sources;
    return r.effective_from && r.source_id && r.version_key &&
      source?.source_type === 'official' && Boolean(source.source_url) &&
      (!r.calendar_urn || r.calendar_urn === calendar);
  });
  const active = scope.filter(r => r.effective_from <= serviceDate)
    .sort((a,b) => b.effective_from.localeCompare(a.effective_from));
  if (!active.length) return scope.length ? { unavailable: true, reason:'not_yet_effective' } : null;
  const newest = active.filter(r => r.effective_from === active[0].effective_from);
  const precise = newest.filter(r => r.calendar_urn === calendar);
  const choices = precise.length ? precise : newest;
  if (choices.length !== 1) throw new Error('AMBIGUOUS_TIMETABLE_REVISION');
  return choices[0].effective_to && serviceDate > choices[0].effective_to ? { unavailable: true } : choices[0];
}

// The revision set is line-scoped, not calendar-scoped: fetch it once per
// request, then select the appropriate published revision for each calendar.
async function loadRevisionRows(db: any, lineId: string) {
  const {data,error} = await db.from('timetable_revisions')
    .select('id,version_key,effective_from,effective_to,calendar_urn,source_id,evidence_sources(source_url,source_type)')
    .eq('line_id',lineId).order('effective_from',{ascending:false});
  if (error) throw error;
  return data || [];
}

function scheduleVehicleType(mapped: any, revision: any) {
  // Train-level planned vehicle evidence is valid across every verified
  // continuation segment. It is a MODEL in the publication plan, not an
  // observed physical formation or a dated rolling-stock working.
  const publishedPlan = ['official_service_vehicle_plan',
    'published_number_family_plan'].includes(mapped.mapping_level);
  const datedPlan = ['dated_schedule_rule',
    'dated_operation_owner'].includes(mapped.mapping_level);
  if (!publishedPlan && !datedPlan) return '';
  if (publishedPlan && (!mapped.vehicle_source_id || !mapped.vehicle_source_url)) return '';
  // A source from a previous revision never certifies a newer published plan.
  if (revision && (mapped.vehicle_revision_date !== revision.effective_from ||
      !mapped.vehicle_source_id || !mapped.vehicle_source_url)) return '';
  return String(mapped.vehicle_type || '');
}

function matchPlannedOperation(run: any, mappings: any[], revision: any) {
  const stops = run.stops || [], first = stops[0], last = stops[stops.length-1];
  const base = {status:'unverified',candidates:[] as any[],previous_code:run.operation_code || ''};
  if (!first || !last || !revision?.version_key || revision.unavailable) return base;
  const departure = first.departure_minute ?? minuteOf(first.departure_time);
  const arrival = last.arrival_minute ?? minuteOf(last.arrival_time);
  const candidates = mappings.filter(m => m.verification_status === 'verified' && m.verified_at &&
    m.evidence_sources?.source_url && m.source_id && m.operation_code &&
    ['official','reference','timetable'].includes(m.evidence_sources.source_type) &&
    m.line_id === run.line_id && m.operator === run.operator && m.network_key === run.network_key &&
    m.calendar_type === run.calendar_type && m.train_number === run.train_number &&
    m.rail_direction === run.rail_direction && m.timetable_version === revision.version_key &&
    m.effective_from <= run.service_date && (!m.effective_to || m.effective_to >= run.service_date) &&
    m.origin_station === first.station_urn && m.destination_station === last.station_urn &&
    m.departure_minute === departure && m.arrival_minute === arrival &&
    m.match_evidence?.role === 'published-working-plan');
  // Distinct evidence rows are competing candidates even if the code is equal.
  // No first-row, suffix, acquisition-date or artwork-based tie breaker.
  if (candidates.length !== 1) return {...base,status:candidates.length ? 'conflict' : 'unmatched',
    candidates:candidates.map(m=>({id:m.id,operation_code:m.operation_code,source_id:m.source_id}))};
  const m = candidates[0];
  return {status:'verified',candidates:[],mapping_id:m.id,operation_code:m.operation_code,
    source_id:m.source_id,source_url:m.evidence_sources.source_url,verified_at:m.verified_at,
    timetable_version:m.timetable_version,effective_from:m.effective_from,effective_to:m.effective_to,
    match_evidence:m.match_evidence};
}

async function linkPlannedOperations(db: any, runs: any[], revision: any) {
  if (!runs.length) return;
  const mappings: any[] = [];
  if (revision?.version_key && !revision.unavailable) {
    for (let first=0;first<35000;first+=700) {
      const {data,error} = await db.from('train_operation_mappings')
        .select('*,evidence_sources(source_url,source_type,evidence_grade)')
        .eq('line_id',runs[0].line_id).eq('verification_status','verified')
        .order('id').range(first,first+699);
      if (error) throw error;
      mappings.push(...data || []);
      if ((data || []).length < 700) break;
      if (first+700>=35000) throw new Error('OPERATION_MAPPING_RESULT_TOO_LARGE');
    }
  }
  runs.forEach(run => {
    const match = matchPlannedOperation(run,mappings,revision);
    run.operation_match = match;
    run.operation_code = match.status === 'verified' ? match.operation_code : '';
  });
}

/**
 * Read recurring SQL timetable templates when a line has no upstream API and
 * there is no date-specific run. Calendar variants are alternatives.
 * Page both queries because Supabase Data API defaults to at most 1000 rows.
 */
async function readManualTemplateRuns(db: any, lineId: string, serviceDate: string, timetableOperator: string | null): Promise<Response> {
  async function pages(makeQuery: (first: number, last: number) => any) {
    const out: any[] = [];
    const size = 700;
    for (let first = 0; first < 35000; first += size) {
      const { data, error } = await makeQuery(first, first + size - 1);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("INVALID_SQL_PAGE");
      out.push(...data);
      if (data.length < size) return out;
    }
    throw new Error("SQL_RESULT_TOO_LARGE");
  }
  // Process independent SQL batches with at most three concurrent requests.
  // Promise.all retains input batch order for canonical station and alias data.
  async function batchedRows<T>(
    items: T[], batchSize: number,
    fetchBatch: (batch: T[]) => Promise<any[]>,
  ): Promise<any[]> {
    const rows: any[] = [];
    const maxConcurrent = 3;
    for (let offset = 0; offset < items.length; offset += batchSize * maxConcurrent) {
      const reads: Promise<any[]>[] = [];
      for (let start = offset; start < Math.min(items.length, offset + batchSize * maxConcurrent); start += batchSize) {
        reads.push(fetchBatch(items.slice(start, start + batchSize)));
      }
      for (const batch of await Promise.all(reads)) rows.push(...batch);
    }
    return rows;
  }
  let templates: any[] = [];
  let selectedCalendar: string | null = null;
  let selectedRevision: any = null;
  const calendars = serviceCalendars(serviceDate);
  const revisionRows = await loadRevisionRows(db,lineId);
  for (const calendar of calendars) {
    const revision = selectRevision(revisionRows,serviceDate,calendar);
    // A future dedicated Holiday diagram cannot hide a currently valid
    // SaturdayHoliday alternative before that dedicated diagram takes effect.
    if (revision?.unavailable && revision.reason === 'not_yet_effective') {
      selectedRevision = revision;
      continue;
    }
    const selected = revision?.unavailable ? [] : await pages((first, last) => {
      let query = db.from("manual_timetable_templates")
      .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date,operating_dates")
      .eq("line_key", lineId).eq("calendar_urn", calendar);
      query = revision ? query.eq('revision_id',revision.id) : query.is('revision_id',null);
      return query.order("id").range(first,last);
    });
    // ChiyodaBranch has only KitaAyase-bound alias rows. The 2026
    // opposite-direction train plans already exist under Chiyoda. Reuse
    // those canonical sources for branch display without importing duplicates.
    if (lineId === "ChiyodaBranch" && !revision) {
      const opposite = await pages((first, last) => db.from("manual_timetable_templates")
        .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date,operating_dates")
        .eq("line_key", "Chiyoda")
        .eq("calendar_urn", calendar)
        .eq("direction_urn", "odpt.RailDirection:TokyoMetro.YoyogiUehara")
        .is("revision_id", null)
        .order("id").range(first, last));
      selected.push(...opposite);
    }
    if (selected.length || revision) { templates = selected; selectedCalendar = calendar; selectedRevision = revision; break; }
  }
  // Kabe / 可部線: 87 synthetic 12-stop Yokokawa-Kabe legacy grids
  // (10 x four-minute gaps, then three) must NEVER become November 2026
  // Hiroshima–Aki-Kameyama train positions. JR West's official issue
  // lists real 740M/866M/868M, and 2019 operator fleet is 227 Red Wing;
  // neither source supplies full 2026-11 stop clocks / physical carsets.
  if(lineId==="Kabe"&&/^2026-11-\d{2}$/.test(serviceDate)&&
     !selectedRevision&&templates.length>0){
    const expected=selectedCalendar==="odpt.Calendar:Weekday"?54:
      selectedCalendar==="odpt.Calendar:SaturdayHoliday"?33:0;
    if(!expected||templates.length!==expected)
      throw new Error("KABE_2611_SYNTHETIC_SOURCE_COVERAGE_CHANGED");
    const [{data:legacy,error:legacyError},{data:official,error:officialError}]=
      await Promise.all([
        db.from("published_jrwest_kabe_2611_source_quarantine")
          .select("source_template_id,source_train_number,calendar_urn,direction_urn,source_path,source_stop_keys,source_clock_status,reference_models,png_paths,number_date_verified,actual_vehicle_confirmed,authorizes_png,authorizes_2611_position")
          .eq("edition","2611").eq("calendar_urn",selectedCalendar),
        db.from("published_jrwest_kabe_2611_number_reference")
          .select("train_number,calendar_scope,official_timetable_issue,official_source_url,origin_key,destination_key,line_fleet,fleet_source_url,number_evidence,number_date_verified,stop_clocks_verified,actual_vehicle_confirmed,png_paths,authorizes_png,authorizes_2611_position")
          .eq("edition","2611").eq("line_key","Kabe")
      ]);
    if(legacyError||officialError)throw legacyError||officialError;
    if(!Array.isArray(legacy)||legacy.length!==expected)
      throw new Error("KABE_2611_LEGACY_QUARANTINE_MISSING");
    const byId=new Map(legacy.map((r:any)=>[Number(r.source_template_id),r]));
    if(byId.size!==expected)throw new Error("KABE_2611_SOURCE_ID_DUPLICATE");
    for(const src of templates){
      const p:any=byId.get(Number(src.id)),num=String(src.train_number||""),
        dir=String(src.direction_urn||"");
      if(!p||p.source_train_number!==num||
         !/^70[0-9]{2}MH?$/.test(num)||
         (selectedCalendar==="odpt.Calendar:SaturdayHoliday")!==num.endsWith("MH")||
         src.railway_urn!=="odpt.Railway:JR-West.Kabe"||
         src.train_type_urn!=="odpt.TrainType:JR-West.Local"||
         src.source_path!=="data/timetables/Kabe-manual.js"||
         src.vehicle_type_label!==null||src.source_revision_date!==null||
         !["odpt.RailDirection:Inbound","odpt.RailDirection:Outbound"].includes(dir)||
         p.calendar_urn!==selectedCalendar||p.direction_urn!==dir||
         p.source_path!==src.source_path||
         !Array.isArray(p.source_stop_keys)||p.source_stop_keys.length!==12||
         p.source_stop_keys[0]!==(
           dir==="odpt.RailDirection:Inbound"?"Kabe":"Yokokawa")||
         p.source_stop_keys[11]!==(
           dir==="odpt.RailDirection:Inbound"?"Yokokawa":"Kabe")||
         p.source_clock_status!=="synthetic_4min_grid_not_2611"||
         !Array.isArray(p.reference_models)||
         p.reference_models.join("|")!=="227系0番台（Red Wing）"||
         !Array.isArray(p.png_paths)||p.png_paths.length!==0||
         p.number_date_verified!==false||p.actual_vehicle_confirmed!==false||
         p.authorizes_png!==false||p.authorizes_2611_position!==false)
        throw new Error("KABE_2611_SOURCE_PROOF_CONFLICT");
    }
    const refRules:any={
      "740M":["saturday_holiday","https://timetable.jr-odekake.net/train-timetable/139551?date=20261031"],
      "866M":["daily","https://timetable.jr-odekake.net/train-timetable/140121?date=20261031"],
      "868M":["daily","https://timetable.jr-odekake.net/train-timetable/140131?date=20261031"]
    };
    if(!Array.isArray(official)||official.length!==3||
       new Set(official.map((r:any)=>r.train_number)).size!==3)
      throw new Error("KABE_2611_OFFICIAL_NUMBER_REFERENCE_INCOMPLETE");
    const currentRefs:any[]=[];
    for(const ref of official){
      const rule=refRules[ref.train_number];
      if(!rule||ref.calendar_scope!==rule[0]||
         ref.official_source_url!==rule[1]||
         ref.official_timetable_issue!=="2026-11"||
         ref.line_fleet!=="227系0番台（Red Wing）"||
         ref.origin_key!=="Aki-Kameyama"||
         ref.destination_key!=="Hiroshima"||
         ref.fleet_source_url!==
           "https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf"||
         ref.number_evidence!=="official_2026_11_issue_reference_only"||
         ref.number_date_verified!==false||ref.stop_clocks_verified!==false||
         ref.actual_vehicle_confirmed!==false||ref.authorizes_png!==false||
         ref.authorizes_2611_position!==false||
         !Array.isArray(ref.png_paths)||ref.png_paths.length!==0)
        throw new Error("KABE_2611_OFFICIAL_NUMBER_REFERENCE_CONFLICT");
      if(ref.calendar_scope==="daily"||
         selectedCalendar==="odpt.Calendar:SaturdayHoliday")
        currentRefs.push({train_number:ref.train_number,
          calendar_scope:ref.calendar_scope,
          line_fleet_candidate:ref.line_fleet,
          number_source_url:ref.official_source_url,
          fleet_source_url:ref.fleet_source_url,
          number_date_verified:false,stop_clocks_verified:false,
          actual_vehicle_confirmed:false,
          authorizes_png:false,authorizes_2611_position:false});
    }
    return json({ok:true,complete:false,partial:false,cache:"MISS",
      line_id:"Kabe",service_date:serviceDate,
      source:"LEGACY_SYNTHETIC_CLOCKS_QUARANTINED",
      source_coverage:"87_historical_12_station_grid_not_2026_11",
      plan_status:"unverified",calendar_status:"selected",
      selected_calendar:selectedCalendar,no_service_confirmed:false,
      quarantined_legacy_sources:expected,
      official_number_fleet_references:currentRefs,
      date_verified_runs:0,date_unverified_runs:0,runs:[]});
  }

  // The existing manual timetable owner may certify a finite set of
  // actual operating dates for an imported source (Nov 2026 temporary
  // shinkansen). The imported calendar remains provenance, not a daily
  // operating assertion. Merge only officially date-whitelisted sources
  // across Weekday/SaturdayHoliday; never include all historical rows.
  // An empty list retires a source from the current plan. NULL preserves
  // the other lines' existing recurring-calendar logic.
  if (/Shinkansen$/.test(lineId) && /^2026-11-\d{2}$/.test(serviceDate)) {
    const {data:datedSources,error:datedError}=await db
      .from("manual_timetable_templates")
      .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date,operating_dates")
      .eq("line_key",lineId)
      .contains("operating_dates",[serviceDate])
      .is("revision_id",null).order("id");
    if(datedError)throw datedError;
    const existing=new Set(templates.map((t:any)=>Number(t.id)));
    for (const t of datedSources||[]) {
      if(!Array.isArray(t.operating_dates) ||
         !t.operating_dates.some((d:any)=>String(d).slice(0,10)===serviceDate) ||
         t.line_key!==lineId ||
         !String(t.railway_urn||"").endsWith("."+lineId) ||
         !["odpt.Calendar:Weekday","odpt.Calendar:SaturdayHoliday"].includes(t.calendar_urn)) {
        throw new Error("SHINKANSEN_2611_DATE_WHITELIST_SOURCE_INVALID");
      }
      if (!existing.has(Number(t.id))) {
        templates.push(t);
        existing.add(Number(t.id));
      }
    }
  }
  // Apply the verified exact-date whitelist to the existing template
  // source at the point of selection, before canonical identity, stop
  // fetching and vehicle evidence. This also excludes historical
  // source templates with [] from the Nov 2026 train map; unrelated
  // trains keep NULL and follow their existing calendar/revision.
  if (/Shinkansen$/.test(lineId)) {
    templates=templates.filter((t:any)=>
      t.operating_dates==null ||
      (Array.isArray(t.operating_dates) &&
        t.operating_dates.some((d:any)=>String(d).slice(0,10)===serviceDate)));
  }
  // 2026-11-02 is a WEEKDAY, yet JR East explicitly runs all six
  // "おもいで湯けむり" rapid D trains on the HOLIDAY source timetable.
  // Enroll only the six source IDs certified by the existing SQL roster,
  // never include the 9727/9728D 2027 legacy imports or the six
  // duplicate/truncated rapid source occurrences.
  if(lineId==="RikutoEast" && serviceDate==="2026-11-02" &&
     selectedCalendar==="odpt.Calendar:Weekday" && !selectedRevision){
    const {data:rapidProof,error:rapidProofErr}=await db
      .from("published_rikuto_east_2611_number_roster")
      .select("source_template_id").eq("edition","2611")
      .eq("line_key","RikutoEast")
      .eq("calendar_urn","odpt.Calendar:SaturdayHoliday")
      .eq("segment_key","kogota_naruko_omoide_rapid");
    if(rapidProofErr||(rapidProof||[]).length!==6)
      throw new Error("RIKUTO_EAST_2611_NOV2_RAPID_PROOF_UNAVAILABLE");
    const ids=(rapidProof||[]).map((p:any)=>Number(p.source_template_id));
    if(new Set(ids).size!==6||ids.some((id:number)=>!Number.isSafeInteger(id)||id<=0))
      throw new Error("RIKUTO_EAST_2611_NOV2_SOURCE_INVALID");
    const {data:rapidSources,error:rapidSourcesErr}=await db
      .from("manual_timetable_templates")
      .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date,operating_dates")
      .eq("line_key","RikutoEast")
      .eq("calendar_urn","odpt.Calendar:SaturdayHoliday")
      .is("revision_id",null).in("id",ids);
    if(rapidSourcesErr||(rapidSources||[]).length!==6)
      throw new Error("RIKUTO_EAST_2611_NOV2_SOURCES_NOT_FOUND");
    templates.push(...rapidSources);
  }
  // Retain both original SQL imports, but serve one verified itinerary.
  if (lineId === "SaikyoKawagoe") {
    const seen = new Set<string>();
    templates = templates.filter((t: any) => {
      const key = t.physical_service_key ?
        [t.calendar_urn,t.railway_urn,t.physical_service_key].join("|") : "";
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (!templates.length) {
    // A missing calendar is not evidence that the line has no trains.
    // In particular, some imported intercity timetables contain Weekday-only
    // rows even though their actual operation calendar was never verified.
    const { data: other, error: otherError } = await db.from("manual_timetable_templates")
      .select("calendar_urn").eq("line_key", lineId).limit(1);
    if (otherError) throw otherError;
    const hasOtherCalendar = !!(other && other.length);
    return json({ ok: true, complete: false, partial: false, cache: "MISS",
      revision:selectedRevision,plan_status:selectedRevision ? 'revision_without_trains' : 'unverified',
      source: hasOtherCalendar ? "CALENDAR_NOT_VERIFIED" : "NO_API_NO_DATA",
      calendar_status: hasOtherCalendar ? "unverified" : "no_source",
      no_service_confirmed: false, line_id: lineId, service_date: serviceDate, runs: [] });
  }


  // Canonical train schedule is the sole identity authority; original source
  // templates remain evidence, never a second source of truth for vehicle type.
  const sourceResolution = new Map<number, any>();
  const resolutionRows = await batchedRows(templates, 100, async (batch) => {
    const { data, error } = await db.from("train_timetable_source_resolution")
      .select("source_template_id,timetable_id,member_role,group_evidence,timetable_validity,mapping_level,vehicle_type,vehicle_source_id,vehicle_source_url,vehicle_revision_date,vehicle_artwork_path,operation_code,operation_source_id,operation_revision_date,operation_owner,operation_owner_source_url")
      .in("source_template_id", batch.map((t: any) => t.id));
    if (error) throw error;
    return data || [];
  });
  for (const row of resolutionRows) sourceResolution.set(row.source_template_id, row);
  // Reject a partial mapping instead of silently serving the old line-based
  // identity. The importer keeps this projection synchronized atomically.
  if (templates.some((t: any) => !sourceResolution.has(t.id))) {
    throw new Error("UNMAPPED_CANONICAL_TIMETABLE_SOURCE");
  }
  // Binary PLAN confirmation must come from evidence provenance, not from
  // the presence of a mapped family name. B-grade fan working inferences are
  // still UNCONFIRMED; A/B official service evidence is admissible.
  // Keep source metadata internal and never infer a physical carset.
  const vehicleEvidenceById = new Map<number, { source_type: string; evidence_grade: string }>();
  const evidenceIds = [...new Set([...sourceResolution.values()]
    .map((row: any) => Number(row.vehicle_source_id))
    .filter((id: number) => Number.isInteger(id) && id > 0))];
  const vehicleEvidenceRows = await batchedRows(evidenceIds, 100, async (ids) => {
    const { data, error } = await db.from("evidence_sources")
      .select("id,source_type,evidence_grade").in("id", ids);
    if (error) throw error;
    return data || [];
  });
  for (const row of vehicleEvidenceRows) vehicleEvidenceById.set(Number(row.id), row);
  const seenCanonical = new Set<number>();
  templates = templates.filter((t: any) => {
    const key = Number(sourceResolution.get(t.id).timetable_id);
    if (seenCanonical.has(key)) return false;
    seenCanonical.add(key);
    return true;
  });

  const byTemplate = new Map<number, any[]>();
  // Keep IN-lists small; each batch retains its existing paginated stop query.
  const sourceStops = await batchedRows(templates, 100, (batch) =>
    pages((first, last) => db.from("manual_timetable_template_stops")
      .select("template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock")
      .in("template_id", batch.map((t: any) => t.id))
      .order("template_id").order("stop_sequence").range(first, last)));
  for (const stop of sourceStops) {
    const list = byTemplate.get(stop.template_id) || [];
    list.push(stop);
    byTemplate.set(stop.template_id, list);
  }

  // Only preverified continuation chains receive a merged end-to-end station
  // sequence. Never join trains here by time, number, or neighboring station.
  const connectedIds = [...new Set(templates
    .map((t: any) => sourceResolution.get(t.id))
    .filter((m: any) => m?.group_evidence === "verified_continuation")
    .map((m: any) => Number(m.timetable_id)))];
  const aliasLines = ["ChuoRapid","ChuoMain","ShonanShinjuku","Tokaido","Takasaki","UtsunomiyaJR"];
  const includeAliases = aliasLines.includes(lineId);
  // A single bounded read returns exact view-backed canonical stops, member
  // lines, and (where needed) source-number aliases. The RPC does not invent
  // new timetable identities or infer rolling stock. Keep only 40 IDs per call.
  const bundles = await batchedRows(connectedIds, 40, async (ids) => {
    const { data, error } = await db.rpc("train_runs_canonical_bundle", {
      p_timetable_ids: ids, p_include_members: includeAliases
    });
    if (error) throw error;
    if (!data || !Array.isArray(data.stops) ||
        !Array.isArray(data.lines) || !Array.isArray(data.members)) {
      throw new Error("INVALID_CANONICAL_BUNDLE");
    }
    return [data];
  });
  const canonicalStopsById = new Map<number, any[]>();
  const canonicalLinesById = new Map<number, string[]>();
  const canonicalSourceMembers: any[] = [];
  const scopedIds = new Set(connectedIds);
  for (const bundle of bundles) {
    for (const row of bundle.stops) {
      const id = Number(row.timetable_id);
      if (!scopedIds.has(id)) throw new Error("CANONICAL_BUNDLE_OUT_OF_SCOPE");
      const stops = canonicalStopsById.get(id) || [];
      stops.push(row);
      canonicalStopsById.set(id, stops);
    }
    for (const row of bundle.lines) {
      const id = Number(row.timetable_id);
      if (!scopedIds.has(id)) throw new Error("CANONICAL_BUNDLE_OUT_OF_SCOPE");
      const lines = canonicalLinesById.get(id) || [];
      if (row.line_key && !lines.includes(row.line_key)) lines.push(row.line_key);
      canonicalLinesById.set(id, lines);
    }
    for (const row of bundle.members) {
      if (!includeAliases || !scopedIds.has(Number(row.timetable_id))) {
        throw new Error("CANONICAL_BUNDLE_OUT_OF_SCOPE");
      }
      canonicalSourceMembers.push(row);
    }
  }
  if (connectedIds.some(id => !(canonicalStopsById.get(id) || []).length)) {
    throw new Error("CANONICAL_CONTINUATION_STOPS_UNAVAILABLE");
  }
  // A verified train may cross two lines, but never infer continuity by
  // train number. Both source line identities must be certified by SQL.
  if (connectedIds.some(id => !(canonicalLinesById.get(id) || []).length)) {
    throw new Error("CANONICAL_CONTINUATION_LINES_UNAVAILABLE");
  }
  // Public train numbers can change across Takao/Tachikawa and Ofuna/Omiya.
  // Preserve each SQL source member as an alias only for verified continuations.
  const canonicalAliasesById = new Map<number, any[]>();
  if (includeAliases) {
    const aliasIds = connectedIds.filter(id => {
      const lines = canonicalLinesById.get(id) || [];
      return (lines.includes("ChuoRapid") && lines.includes("ChuoMain")) ||
        (lines.includes("ShonanShinjuku") &&
          ["Tokaido","Takasaki","UtsunomiyaJR"].some(other => lines.includes(other)));
    });
    const aliasIdSet = new Set(aliasIds);
    for (const source of canonicalSourceMembers) {
      const id = Number(source.timetable_id);
      if (!aliasIdSet.has(id)) continue;
      if (!source.train_number || !source.railway_urn) {
        throw new Error("CANONICAL_TRAIN_NUMBER_ALIAS_SOURCE_UNAVAILABLE");
      }
      const aliases = canonicalAliasesById.get(id) || [];
      const alias = { line_key: source.line_key, train_number: source.train_number,
        railway_urn: source.railway_urn, direction_urn: source.direction_urn };
      if (!aliases.some((x: any) => x.line_key === alias.line_key &&
        x.train_number === alias.train_number &&
        x.railway_urn === alias.railway_urn &&
        x.direction_urn === alias.direction_urn)) aliases.push(alias);
      canonicalAliasesById.set(id, aliases);
    }
    if (aliasIds.some(id => !(canonicalAliasesById.get(id) || []).length)) {
      throw new Error("CANONICAL_VERIFIED_TRAIN_NUMBER_ALIASES_UNAVAILABLE");
    }
  }

  // Osaka's historical manually imported schedules contain station-only
  // references: 203 on OsakaLoop and 94 on OsakaHigashi across both calendars.
  // Do not treat a single station clock as a train, match it to a vehicle
  // operation, or interpolate its unknown itinerary. Retain the original SQL
  // template for later verification. Other lines retain their existing rules.
  let suppressedOsakaStationFragments = 0;
  if (lineId === "OsakaLoop" || lineId === "OsakaHigashi") {
    const initialSources = templates.length;
    templates = templates.filter((t: any) => {
      const mapped = sourceResolution.get(t.id);
      const sourceStops: any[] = mapped?.group_evidence === "verified_continuation"
        ? (canonicalStopsById.get(Number(mapped.timetable_id)) || [])
        : (byTemplate.get(t.id) || []);
      if (sourceStops.length < 2) return false;
      const stations = new Set(sourceStops
        .filter((s: any) => !!(s.arrival_clock || s.departure_clock))
        .map((s: any) => String(s.station_urn || s.arrival_station_urn || s.departure_station_urn || "")));
      return stations.size >= 2;
    });
    suppressedOsakaStationFragments = initialSources - templates.length;
  }

  // Never attempt location interpolation on a published run whose next
  // station occurs earlier on the same service day without a midnight wrap.
  // The source remains stored for provenance; this is a reversible,
  // non-destructive runtime quarantine of source_only timetable fragments.
  // No clock or railway vehicle model is inferred.
  let suppressedClockReversalRuns = 0;
  {
    const beforeClockCheck = templates.length;
    templates = templates.filter((t: any) => {
      const evidence = sourceResolution.get(t.id);
      if (evidence?.group_evidence !== "source_only") return true;
      const stops: any[] = byTemplate.get(t.id) || [];
      for (let i = 1; i < stops.length; i++) {
        const prevClock = String(stops[i - 1].departure_clock || stops[i - 1].arrival_clock || "");
        const nextClock = String(stops[i].arrival_clock || stops[i].departure_clock || "");
        const midnightWrap = prevClock >= "20:00" && nextClock <= "04:00";
        if (prevClock && nextClock && prevClock > nextClock && !midnightWrap) return false;
      }
      return true;
    });
    suppressedClockReversalRuns = beforeClockCheck - templates.length;
  }

  // Vehicle type may be verified by a *different* timetable segment of
  // the very same through train. At the canonical Osaki boundary, accept a
  // single exact Rinkai model only when BOTH schedules agree on operating
  // calendar, train number, boundary station and precise scheduled clock.
  // This projects evidence in the response; historical SQL labels remain
  // unchanged, and no train-number-only or line-default model is invented.
  const boundaryVehicle = new Map<number, string>();
  if (lineId === "SaikyoKawagoe" && selectedCalendar) {
    const ambiguous = templates.filter((t: any) =>
      String(t.vehicle_type_label || "").split("/").filter(Boolean).length > 1);
    const numbers = [...new Set(ambiguous.map((t: any) => String(t.train_number || "")).filter(Boolean))];
    if (numbers.length) {
      const rinkaiTemplates: any[] = [];
      for (let i = 0; i < numbers.length; i += 100) {
        const batch = await pages((first, last) => db.from("manual_timetable_templates")
          .select("id,train_number,vehicle_type_label")
          .eq("line_key", "Rinkai").eq("calendar_urn", selectedCalendar)
          .in("train_number", numbers.slice(i, i + 100))
          .order("id").range(first, last));
        rinkaiTemplates.push(...batch.filter((t: any) =>
          t.vehicle_type_label && !String(t.vehicle_type_label).includes("/")));
      }
      const rinkaiStops = new Map<number, any[]>();
      for (let i = 0; i < rinkaiTemplates.length; i += 100) {
        const ids = rinkaiTemplates.slice(i, i + 100).map((t: any) => t.id);
        const rows = await pages((first, last) => db.from("manual_timetable_template_stops")
          .select("template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock")
          .in("template_id", ids).order("template_id").order("stop_sequence").range(first, last));
        rows.forEach((s: any) => {
          const a = rinkaiStops.get(s.template_id) || [];
          a.push(s);
          rinkaiStops.set(s.template_id, a);
        });
      }
      // A candidate that has a conflicting or duplicate Rinkai model is
      // unresolved, not a reason to pick whichever row happened to sort first.
      const linkCandidates = new Map<string, string[]>();
      const stopName = (s: any) => String(s?.arrival_station_urn || s?.departure_station_urn || "").split(".").pop();
      const clock = (v: any) => String(v || "").slice(0, 5);
      rinkaiTemplates.forEach((t: any) => {
        const stops = rinkaiStops.get(t.id) || [];
        const first = stops[0];
        if (!first || stopName(first) !== "Osaki") return;
        const dep = clock(first.departure_clock || first.arrival_clock);
        if (!dep) return;
        const key = String(t.train_number) + "|" + dep;
        const list = linkCandidates.get(key) || [];
        list.push(String(t.vehicle_type_label).trim());
        linkCandidates.set(key, list);
      });
      ambiguous.forEach((t: any) => {
        const stops = byTemplate.get(t.id) || [];
        const last = stops[stops.length - 1];
        if (!last || stopName(last) !== "Osaki") return;
        const arrival = clock(last.arrival_clock || last.departure_clock);
        const list = linkCandidates.get(String(t.train_number) + "|" + arrival) || [];
        if (list.length !== 1) return;
        const verifiedModel = list[0];
        const candidates = String(t.vehicle_type_label || "").split("/").map((s: string) => s.trim());
        if (candidates.includes(verifiedModel)) boundaryVehicle.set(t.id, verifiedModel);
      });
    }
  }

  // Project a *candidate* generic picture only when the historical source
  // names one model AND the gallery has exactly one generic image for the
  // same operator + same vehicle model. This is NOT verified current stock,
  // a carset or an artwork override; TrainVehicle decides definitive icons.
  const candidateModels = [...new Set(templates.filter((t: any) => {
    const m = sourceResolution.get(t.id);
    return m?.mapping_level === "source_single_type_candidate" &&
      !!String(t.vehicle_type_label || "").trim() &&
      !String(t.vehicle_type_label).includes("/");
  }).map((t: any) => String(t.vehicle_type_label).trim()))];
  const candidateArtworkByOwnerModel = new Map<string, string[]>();
  for (let i = 0; i < candidateModels.length; i += 50) {
    const { data: imageRows, error: imageError } = await db.from("vehicle_image_assets")
      .select("operator,vehicle_type,image_path")
      .eq("is_generic", true).eq("asset_status", "available")
      .in("vehicle_type", candidateModels.slice(i, i + 50));
    if (imageError) throw imageError;
    for (const image of imageRows || []) {
      const key = String(image.operator) + "\u0000" + String(image.vehicle_type).trim();
      const paths = candidateArtworkByOwnerModel.get(key) || [];
      if (image.image_path && !paths.includes(image.image_path)) paths.push(image.image_path);
      candidateArtworkByOwnerModel.set(key, paths);
    }
  }

// JR East 2611 source-template-specific published train-number crosswalk.
// The official table pairs 列車名 with 列車番号. No suffix math, date inference,
// route-fleet model guess or conversion into an operation code is permitted.
// These rows certify the NUMBER only; historical source clocks and operating
// dates are still subject to their existing independent coverage audit.
const publishedShinkansenNumbersBySource =
  new Map<number, {number:string; url:string}>();
// The 2611 JR-East booklet also publishes the JR-Hokkaido Shinkansen.
// Match the existing SQL source railway/operator precisely; it is not
// a license to infer H5/E5 ownership or a single rolling-stock PNG.
const officialShinkansenRailwayOwner =
  ["NishiKyushuShinkansen","KyushuShinkansen"].includes(lineId)
  ? "JR-Kyushu"
  : lineId==="SanyoShinkansen" ? "JR-West"
  : lineId==="TokaidoShinkansen" ? "JR-Central"
  : lineId==="HokkaidoShinkansen" ? "JR-Hokkaido" : "JR-East";
if (/Shinkansen$/.test(lineId) &&
    /^2026-11-\d{2}$/.test(serviceDate) &&
    selectedCalendar &&
    String(timetableOperator || officialShinkansenRailwayOwner) ===
      officialShinkansenRailwayOwner) {
  const batch = templates.filter((t:any) =>
    String(t.railway_urn||"")==="odpt.Railway:"+
      officialShinkansenRailwayOwner+"."+lineId);
  for (let first=0; first<batch.length; first+=100) {
    const ids=batch.slice(first,first+100).map((t:any)=>Number(t.id));
    const {data, error}=await db.from("published_train_number_evidence")
      .select("edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope")
      .eq("edition","2611").eq("line_key",lineId)
      // The source may be an officially date-whitelisted Weekday import
      // running on a Saturday/holiday; validate against src.calendar_urn
      // below, never require it to match today's selected diagram.
      .in("source_template_id",ids);
    if(error)throw error;
    const sources=new Map(batch.map((t:any)=>[Number(t.id),t]));
    for(const proof of data||[]) {
      const src:any=sources.get(Number(proof.source_template_id));
      const proofNumber=String(proof.train_number||"");
      const proofUrl=String(proof.official_source_url||"");
      // Published full numbers are certified by the source's own
      // operator-specific timetable. JR Kyushu's Kamome train uses G,
      // whereas the connecting Relay Kamome uses H; do not confuse them.
      const validOfficialNumber = lineId==="NishiKyushuShinkansen"
        ? (/^[0-9]{4}G$/.test(proofNumber) &&
          /^https:\/\/www\.jrkyushu-timetable\.jp\/sp\/2611\/[0-9]{4}\/[0-9]{8}\.html\?d=2026(?:10|11)[0-9]{2}&t=[A-Za-z0-9]+$/.test(proofUrl))
        : ["TokaidoShinkansen","SanyoShinkansen","KyushuShinkansen"].includes(lineId)
        ? (/^[0-9]{1,5}A$/.test(proofNumber) && (
          /^https:\/\/timetable\.jr-odekake\.net\/train-timetable\/[0-9]+\?date=202611[0-9]{2}$/.test(proofUrl) ||
          /^https:\/\/www\.jrkyushu-timetable\.jp\/sp\/2611\/[0-9]{4}\/[0-9]{8}\.html\?d=202611[0-9]{2}&t=[A-Za-z0-9]+$/.test(proofUrl) ||
          /^https:\/\/timetables\.jreast\.co\.jp\/2611\/(?:timetable-v|train)\//.test(proofUrl)
          ))
        : (/^[0-9]{1,5}[BCEM]$/.test(proofNumber) &&
          /^https:\/\/timetables\.jreast\.co\.jp\/2611\/(?:timetable-v|train)\//.test(proofUrl));
      if(!src || proof.line_key!==lineId ||
        proof.calendar_urn!==src.calendar_urn ||
        proof.direction_urn!==src.direction_urn ||
        proof.verification_scope!=="train_number_only" ||
        !validOfficialNumber) {
        throw new Error("INVALID_SHINKANSEN_OFFICIAL_NUMBER_EVIDENCE");
      }
      const key=Number(proof.source_template_id);
      if(publishedShinkansenNumbersBySource.has(key))
        throw new Error("AMBIGUOUS_SHINKANSEN_PUBLISHED_NUMBER");
      publishedShinkansenNumbersBySource.set(key,{
        number:String(proof.train_number),url:String(proof.official_source_url)
      });
    }
  }
}

// Shinkansen reference PNGs are authorized by the EXISTING 2611 SQL
// exact-number roster, never by the service nickname or a broad model-family
// gallery match. Duplicated rows for the same number/model/path are harmless;
// conflicting evidence fails closed for that train, not for the whole line.
const publishedShinkansenPngByNumber =
  new Map<string,{model:string;path:string}>();
if (/Shinkansen$/.test(lineId) && /^2026-11-\d{2}$/.test(serviceDate) &&
    publishedShinkansenNumbersBySource.size > 0) {
  const {data:rules,error:rulesError}=await db
    .from("published_train_png_number_ranges")
    .select("edition,line_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed")
    .eq("edition","2611").eq("line_key",lineId);
  if(rulesError)throw rulesError;
  const paths=[...new Set((rules||[]).map((r:any)=>
    String(r.png_reference||"").replace(/^\.\.\//,""))
    .filter((p:string)=>/^images\/列车\/[^/]+\/[^/]+\.png$/.test(p)))];
  const available=new Set<string>();
  for(let first=0;first<paths.length;first+=100){
    const {data:assets,error:assetsError}=await db.from("vehicle_image_assets")
      .select("image_path,vehicle_type,operator")
      .eq("asset_status","available").eq("file_format_status","native_png")
      .eq("operator",officialShinkansenRailwayOwner)
      .in("image_path",paths.slice(first,first+100));
    if(assetsError)throw assetsError;
    for(const a of assets||[])
      available.add(String(a.vehicle_type)+"\u0000"+String(a.image_path));
  }
  const conflicts=new Set<string>();
  for(const p of rules||[]){
    const n=Number(p.min_number),suffix=String(p.suffix||"");
    const number=String(n)+suffix,model=String(p.vehicle_model||"");
    const path=String(p.png_reference||"");
    if(!Number.isInteger(n)||n<1||n!==Number(p.max_number)||
       !/^[A-Z]$/.test(suffix)||p.requires_exact_roster!==true||
       p.actual_vehicle_confirmed!==false||
       !String(p.source_url||"").startsWith("https://")||
       !available.has(model+"\u0000"+path.replace(/^\.\.\//,""))||
       conflicts.has(number))continue;
    const prior=publishedShinkansenPngByNumber.get(number);
    if(prior && (prior.model!==model||prior.path!==path)){
      publishedShinkansenPngByNumber.delete(number);
      conflicts.add(number);
    }else if(!prior){
      publishedShinkansenPngByNumber.set(number,{model,path});
    }
  }
}

// JR East 2611: train *service name* is not the railway train number.
const JR_EAST_SHINKANSEN_OFFICIAL_2611: Record<string, {number:string; url:string}> = {
  "HokurikuShinkansen|かがやき501|Tokyo|06:16": {
    number: "3501E", url: "https://timetables.jreast.co.jp/2611/train/095/098481.html"
  },
  "JoetsuShinkansen|Toki301|Tokyo|06:08": {
    number: "1301C", url: "https://timetables.jreast.co.jp/2611/train/035/038221.html"
  },
  "TohokuShinkansen|Hayabusa29|Tokyo|14:44": {
    number: "29B", url: "https://timetables.jreast.co.jp/2611/train/125/129731.html"
  },
  "AkitaShinkansen|こまち1|Tokyo|06:32": {
    number: "3001M", url: "https://timetables.jreast.co.jp/2611/train/030/033833.html"
  },
  // Tsubasa 121 runs as 121B to Fukushima and 121M after Fukushima.
  // The SQL Yamagata segment starts at Fukushima 07:48, not Tokyo.
  "YamagataShinkansen|つばさ121|Fukushima|07:48": {
    number: "121M", url: "https://timetables.jreast.co.jp/2611/train/025/029831.html"
  },
};

function resolveJrEastShinkansenNumber(t: any, serviceDate: string, firstStop: any) {
  const line = String(t.line_key || "");
  const label = String(t.train_number || "").trim();
  if (!["TohokuShinkansen","HokurikuShinkansen","YamagataShinkansen",
    "AkitaShinkansen","JoetsuShinkansen"].includes(line) ||
      !String(t.railway_urn || "").startsWith("odpt.Railway:JR-East.") ||
      !label || /^[0-9]{1,5}[A-Z]$/.test(label) || /^[0-9]{1,5}$/.test(label)) {
    return null;
  }
  const origin = stationKey(String(firstStop?.station_urn ||
    firstStop?.departure_station_urn || firstStop?.arrival_station_urn || ""));
  const clock = String(firstStop?.departure_clock || firstStop?.arrival_clock || "").slice(0,5);
  const key = [line,label,origin,clock].join("|");
  const official = /^2026-11-\d{2}$/.test(serviceDate)
    ? JR_EAST_SHINKANSEN_OFFICIAL_2611[key] : undefined;
  // Unverified names remain visible as SERVICE NAMES; never manufacture a
  // B/M/E/C suffix or claim that the service name is a JR train number.
  return {
    number: official?.number || "",
    serviceName: label,
    status: official ? "official-2611-origin-clock" : "unverified-service-name",
    officialUrl: official?.url || null,
  };
}


  // JR East 2611, 2026-11-07 only: the recurring ODPT source uses cancelled
  // normal numbers. Its nine Sotobo station clocks are independently identical
  // to the official replacement's complete published Sotobo segment.
  // Do not rewrite or certify the immutable source template/canonical ID.
  // Substitute the DATED public number after an exact nine/eleven-stop match,
  // an official A-grade source entry, and explicit operating-day scope.
  async function applyBosoNovember7DatedNumbers(runs: any[]): Promise<number> {
    if (serviceDate !== "2026-11-07" || !["Sotobo","Uchibo"].includes(lineId)) return 0;
    const uchiboCancelled = new Set(["3680F","3606F"]);
    const uchiboAlternatives: Record<string,{number:string,key:string,signature:string}> = {
      "3680F": {number:"9680M",key:"20261104-jre-2611-boso-1107-uchibo-9680m",
        signature:"Kimitsu::06:02|Kisarazu:06:09:06:10|Sodegaura:06:15:06:16|Nagaura:06:19:06:20|Anegasaki:06:24:06:25|Goi:06:29:06:30|Yawatajuku:06:33:06:34|Hamano:06:36:06:37|Soga:06:40:06:43|HonChiba:06:46:06:46|Chiba:06:49:"},
      "3606F": {number:"9606M",key:"20261104-jre-2611-boso-1107-uchibo-9606m",
        signature:"Kimitsu::06:29|Kisarazu:06:36:06:37|Sodegaura:06:42:06:43|Nagaura:06:46:06:47|Anegasaki:06:51:06:51|Goi:06:56:06:57|Yawatajuku:07:00:07:01|Hamano:07:03:07:04|Soga:07:08:07:09|HonChiba:07:12:07:12|Chiba:07:15:"}
    };

    const sotoboAlternatives: Record<string,{number:string,key:string,signature:string}> = {
      "3573F": {number:"9573M",key:"20261104-jre-2611-boso-1107-sotobo-9573m",
        signature:"Chiba::05:21|HonChiba:05:23:05:23|Soga:05:26:05:27|Kamatori:05:31:05:32|Honda:05:35:05:36|Toke:05:40:05:41|Oami:05:44:05:45|Mobara:05:53:05:54|KazusaIchinomiya:06:01:"},
      "3719F": {number:"9887M",key:"20261104-jre-2611-boso-1107-sotobo-9887m",
        signature:"Chiba::09:27|HonChiba:09:29:09:30|Soga:09:33:09:39|Kamatori:09:44:09:44|Honda:09:47:09:48|Toke:09:52:09:53|Oami:09:57:09:57|Mobara:10:05:10:06|KazusaIchinomiya:10:13:"},
      "3845F": {number:"8939M",key:"20261104-jre-2611-boso-1107-sotobo-8939m",
        signature:"Chiba::10:26|HonChiba:10:28:10:28|Soga:10:32:10:37|Kamatori:10:41:10:42|Honda:10:45:10:46|Toke:10:50:10:51|Oami:10:54:10:55|Mobara:11:03:11:04|KazusaIchinomiya:11:11:"}
    };
    // An invalid/absent provenance row fails closed; never turn a cancelled
    // 2026-11-07 normal service into a speculative replacement train.
    const sources = new Map<string, any>();
    const alternatives = lineId === "Sotobo" ? sotoboAlternatives : uchiboAlternatives;
    {
      const keys = Object.values(alternatives).map(x=>x.key);
      const {data,error} = await db.from("evidence_sources")
        .select("source_key,source_url,source_type,evidence_grade")
        .in("source_key",keys);
      if (error) throw error;
      (data || []).forEach((s: any)=>sources.set(s.source_key,s));
    }
    let replaced = 0;
    for (const run of runs) {
      if (run.calendar_type !== "saturday_holiday" ||
          run.operator !== "JR-East" ||
          run.train_type !== "odpt.TrainType:JR-East.Rapid" ||
          run.canonical_group_evidence !== "source_only" ||
          run.network_key !== "odpt.Railway:JR-East." + lineId) continue;
      const originalNumber = run.train_number;
      const replacement = alternatives[originalNumber];
      if (!replacement && lineId === "Uchibo" && uchiboCancelled.has(originalNumber)) {
        run.operation_status = "cancelled";
        continue;
      }
      if (!replacement) continue;
      // This original normal service does not run on 11/7 in ANY case.
      run.operation_status = "cancelled";
      const source = sources.get(replacement.key);
      const validSource = source?.source_type === "official" &&
        source?.evidence_grade === "A" &&
        typeof source?.source_url === "string" &&
        (source.source_url.startsWith("https://timetables.jreast.co.jp/2611/train/") ||
         source.source_url.startsWith("https://timetables.jreast.co.jp/en/2611/train/"));
      if (!validSource || !Array.isArray(run.stops) ||
          run.stops.length !== (lineId === "Uchibo" ? 11 : 9) ||
          run.rail_direction !== "odpt.RailDirection:" +
            (lineId === "Uchibo" ? "Inbound" : "Outbound")) continue;
      const signature = run.stops.map((stop: any) =>
        [stop.station_key, String(stop.arrival_time || "").slice(0,5),
          String(stop.departure_time || "").slice(0,5)].join(":")).join("|");
      if (signature !== replacement.signature) continue;
      // A dated replacement is a NEW public train NUMBER, not the old
      // source's vehicle operation, formation or verified canonical identity.
      run.train_number = replacement.number;
      run.id = "official-dated-train:2026-11-07:" + lineId + ":" + replacement.number;
      run.trip_id = run.id;
      run.operation_status = "scheduled";
      run.operation_code = "";
      run.operation_owner = null;
      run.operation_owner_source_url = null;
      run.canonical_timetable_id = null;
      run.canonical_group_evidence = "source_only";
      run.canonical_line_ids = [];
      run.canonical_number_aliases = [];
      run.source_trip_id = null;
      run.previous_timetable_ids = [];
      run.next_timetable_ids = [];
      run.plan_source = "official-20261107-number-stop-verified-override";
      run.train_number_verification = "official-20261107-all-" + run.stops.length + "-stops";
      run.train_number_source_url = source.source_url;
      run.timetable_validity = "date_verified";
      run.timetable_date_verified = true;
      run.source_revision_date = null;
      run.vehicle_type_label = null;
      run.vehicle_type_candidates = null;
      run.vehicle_mapping_level = "unresolved";
      run.vehicle_plan_confirmed = false;
      run.vehicle_artwork_path = null;
      run.vehicle_evidence_source = null;
      run.vehicle_evidence_source_id = null;
      run.vehicle_evidence_url = null;
      replaced++;
    }
    return replaced;
  }

  const result = templates.map((t) => {
    const operator = timetableOperator || /^odpt\.Railway:([^.]+)\./.exec(t.railway_urn || "")?.[1] || "";
    const mapped = sourceResolution.get(t.id);
    const ownerFromUrn = /^odpt\.Railway:([^.]+)\./.exec(String(t.railway_urn || ""))?.[1] || "";
    const candidateKey = ownerFromUrn + "\u0000" + String(t.vehicle_type_label || "").trim();
    const candidateImages = mapped.mapping_level === "source_single_type_candidate"
      ? (candidateArtworkByOwnerModel.get(candidateKey) || []) : [];
    const candidateArtwork = candidateImages.length === 1 ? candidateImages[0] : null;
    const ruleType = scheduleVehicleType(mapped,selectedRevision);
    const publishedPlan = ['official_service_vehicle_plan',
      'published_number_family_plan'].includes(mapped.mapping_level);
    // On a through train the lead source might be the Joban rapid section,
    // whose historical source template has no vehicle field. A model candidate
    // recorded on a different verified member belongs to the canonical TRAIN.
    // Keep candidates explicitly unverified instead of silently erasing them.
    const trainCandidate = mapped.mapping_level === 'source_single_type_candidate'
      ? String(mapped.vehicle_type || '').trim() : '';
    // Source-backed operator/line fleet is a reference, not a certified train.
    const fleetReferenceLabel = ['official_single_fleet_plan',
      'official_model_family_plan'].includes(mapped.mapping_level) &&
      mapped.vehicle_source_id && mapped.vehicle_source_url
        ? String(mapped.vehicle_type || '').trim() : '';
    const verifiedBoundaryType = String(boundaryVehicle.get(t.id) || "");
    const conflict = !!(ruleType && verifiedBoundaryType && ruleType !== verifiedBoundaryType);
    const exactScheduleType = conflict ? "" : (ruleType || verifiedBoundaryType);
    const scheduleLevel = conflict ? "conflicting_scheduled_evidence"
      : ruleType ? mapped.mapping_level
      : verifiedBoundaryType ? "verified_scheduled_boundary"
      : mapped.mapping_level || "unresolved";
    const completeStops = mapped.group_evidence === "verified_continuation"
      ? canonicalStopsById.get(mapped.timetable_id) : null;
    const staticOfficialNumber = resolveJrEastShinkansenNumber(
      t, serviceDate, (byTemplate.get(t.id) || [])[0]);
    const sqlOfficialNumber = publishedShinkansenNumbersBySource.get(Number(t.id));
    if(sqlOfficialNumber && staticOfficialNumber?.number &&
       staticOfficialNumber.number !== sqlOfficialNumber.number)
      throw new Error("CONFLICTING_SHINKANSEN_OFFICIAL_NUMBER");
    const officialNumber = sqlOfficialNumber ? {
      number:sqlOfficialNumber.number, serviceName:String(t.train_number||""),
      status:"official-2611-sql-exact-roster",
      officialUrl:sqlOfficialNumber.url
    } : staticOfficialNumber;
    // Official train number, single planned model and native operator PNG.
    // This is an illustrative PLAN asset, not an observed physical carset.
    const pngProof=sqlOfficialNumber &&
      publishedShinkansenPngByNumber.get(sqlOfficialNumber.number);
    const pngEvidence=pngProof &&
      vehicleEvidenceById.get(Number(mapped.vehicle_source_id));
    const verifiedPublishedPng=pngProof &&
      mapped.mapping_level==="official_service_vehicle_plan" &&
      exactScheduleType===pngProof.model && !conflict &&
      pngEvidence?.source_type==="official" &&
      ["A","B"].includes(String(pngEvidence.evidence_grade||""))
        ? pngProof.path : null;
    return {
      // Only SQL-certified identical itineraries share identity across line sources.
      // Keep separate line records/stops; never dedupe by departure time alone.
      id: "canonical-train-timetable:" + mapped.timetable_id,
      // Cancellation is applied by dated SQL evidence below, not an empty exception list.
      operation_status: "scheduled",
      canonical_timetable_id: mapped.timetable_id,
      canonical_group_evidence: mapped.group_evidence,
      canonical_line_ids: mapped.group_evidence === "verified_continuation"
        ? (canonicalLinesById.get(Number(mapped.timetable_id)) || []) : [],
      canonical_number_aliases: mapped.group_evidence === "verified_continuation"
        ? (canonicalAliasesById.get(Number(mapped.timetable_id)) || []) : [],
      line_id: lineId,
      service_date: serviceDate,
      calendar_type: calendarType(
        Array.isArray(t.operating_dates) && selectedCalendar
          ? selectedCalendar : t.calendar_urn),
      service_id: Array.isArray(t.operating_dates) && selectedCalendar
        ? selectedCalendar : t.calendar_urn,
      trip_id: "canonical-train-timetable:" + mapped.timetable_id,
      plan_source: "sql-recurring-timetable",
      operator, network_key: t.railway_urn,
      train_number: officialNumber ? officialNumber.number : t.train_number,
      service_name: officialNumber?.serviceName || null,
      source_train_label: officialNumber?.serviceName || null,
      train_number_verification: officialNumber?.status || "source-record",
      train_number_source_url: officialNumber?.officialUrl || null,
      operation_code: mapped.operation_code || "",
      operation_owner: mapped.operation_owner || null,
      operation_owner_source_url: mapped.operation_owner_source_url || null,
      rail_direction: t.direction_urn,
      train_type: t.train_type_urn,
      destination_station: t.destination_urns?.[0] || null,
      // A single source label is a candidate, not observed rolling stock.
      // Only decisive, source-dated timetable rules may identify a planned type.
      vehicle_type_label: exactScheduleType || null,
      // Source-backed train-level candidates override stale raw labels only
      // in the candidate channel; preserve historical source for provenance.
      // Official line fleets are fallback references, never exact models.
      vehicle_type_candidates: trainCandidate || fleetReferenceLabel || t.vehicle_type_label || null,
      vehicle_historical_source_label: t.vehicle_type_label || null,
      vehicle_candidate_source_id: mapped.mapping_level === "source_single_type_candidate"
        ? (mapped.vehicle_source_id || null) : null,
      vehicle_candidate_source_url: mapped.mapping_level === "source_single_type_candidate"
        ? (mapped.vehicle_source_url || null) : null,
      vehicle_candidate_artwork_path: candidateArtwork,
      vehicle_candidate_artwork_status: candidateArtwork
        ? "historical-single-model-operator-generic-unverified" : null,
      vehicle_mapping_level: scheduleLevel,
      // Confirmed means this recurring PLAN model is certified by official
      // service/number evidence; it never means actual dispatch confirmation.
      vehicle_plan_confirmed: Boolean(
        ruleType && !conflict && publishedPlan &&
        vehicleEvidenceById.get(Number(mapped.vehicle_source_id))?.source_type === "official" &&
        ["A", "B"].includes(String(
          vehicleEvidenceById.get(Number(mapped.vehicle_source_id))?.evidence_grade || ""
        ))
      ),
      vehicle_evidence_source: ruleType && !conflict
        ? (publishedPlan ? "database-published-service-plan"
          : mapped.mapping_level === "dated_operation_owner"
            ? "database-dated-operation-owner" : "database-dated-schedule-rule")
        : verifiedBoundaryType && !conflict ? "verified-scheduled-boundary:Rinkai/Osaki" : null,
      vehicle_evidence_source_id: ruleType && !conflict ? mapped.vehicle_source_id : null,
      vehicle_evidence_url: ruleType && !conflict ? mapped.vehicle_source_url : null,
      // Only source-dated unique model PNG; never a guessed formation/livery.
      vehicle_artwork_path: verifiedPublishedPng ||
        (ruleType && !conflict && !publishedPlan
          ? (mapped.vehicle_artwork_path || null) : null),
      source_template_id: Number(t.id),
      source_trip_id: t.source_trip_id || null,
      previous_timetable_ids: t.previous_timetable_ids || [],
      next_timetable_ids: t.next_timetable_ids || [],
      timetable_provenance: t.source_path || null,
      source_revision_date: selectedRevision?.effective_from || t.source_revision_date || null,
      plan_revision: selectedRevision,
      // Stop completeness is not evidence that a historical source is current.
      timetable_validity: selectedRevision ? 'published_revision' : (mapped.timetable_validity || "undated_not_current_verified"),
      timetable_date_verified: !!selectedRevision || mapped.timetable_validity === "date_verified",
      stops: (completeStops || byTemplate.get(t.id) || []).map((s: any) => {
        const urn = s.station_urn || s.arrival_station_urn || s.departure_station_urn || "";
        return {
          station_urn: urn,
          station_key: stationKey(urn),
          // Original member-stop values, not generated suffixes.
          source_train_number: completeStops ? String(s.train_number || "") : "",
          source_line_key: completeStops ? String(s.line_key || "") : "",
          arrival_time: sqlTime(s.arrival_clock),
          departure_time: sqlTime(s.departure_clock),
          arrival_minute: minuteOf(s.arrival_clock),
          departure_minute: minuteOf(s.departure_clock),
        };
      }),
    };
  });
  // 米坂線 (internal Yonezawa) JR East 2611: only the eight-station
  // Yonezawa--Imaizumi rail shuttle survives. All 1/2/3/.../22 rows in
  // the historic SQL are REPLACEMENT BUSES (some falsely labelled Local).
  // Never project a train from the long-disrupted Imaizumi--Sakamachi line.
  // Sources: JR 252 d/u 1/2 and JR East 2026 maintenance cancellation.
  if(lineId==="Yonezawa"&&/^2026-11-\d{2}$/.test(serviceDate)){
    const rail=["Yonezawa","Minami-Yonezawa","Nishi-Yonezawa",
      "Narushima","Chugun","Uzen-Komatsu","Inukawa","Imaizumi"];
    // Exact official start and end clocks for each numbered RAIL trip.
    // These endpoints are also present in the existing 78-row manual SQL.
    // Intermediate SQL stop clocks are historical; don't certify their
    // complete November revision or the physical carset.
    const clockByNumber:Record<string,[string,string]>={
      "7143D":["05:46","06:18"],"7145D":["06:38","07:09"],
      "7147D":["07:38","08:17"],"7149D":["10:29","10:58"],
      "7151D":["12:16","12:45"],"7153D":["15:58","16:28"],
      "7155D":["17:21","17:50"],"7157D":["18:37","19:06"],
      "7159D":["20:45","21:14"],"7142D":["06:01","06:31"],
      "7144D":["06:49","07:24"],"7146D":["08:00","08:30"],
      "7148D":["09:25","09:55"],"7150D":["11:30","12:00"],
      "7152D":["15:02","15:32"],"7154D":["16:38","17:08"],
      "7156D":["18:00","18:30"],"7158D":["19:30","20:00"]
    };
    const maintenanceDays=new Set([
      "2026-11-09","2026-11-10","2026-11-11",
      "2026-11-12","2026-11-13"
    ]);
    const maintenanceTrains=new Set(["7149D","7150D","7151D","7152D"]);
    const rawById=new Map(templates.map((t:any)=>[Number(t.id),t]));
    const clock=(x:any)=>String(x||"").slice(0,5);
    const stop=(x:any)=>stationKey(String(x?.station_urn||
      x?.departure_station_urn||x?.arrival_station_urn||""));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],n=String(run.train_number||"");
      const source:any=rawById.get(Number(run.source_template_id));
      const direction=n.endsWith("D")&&/^71(?:4[2-9]|5[0-9])D$/.test(n)
        ?(Number(n.slice(0,-1))%2?"Outbound":"Inbound"):"";
      const stops=byTemplate.get(Number(run.source_template_id))||[];
      const expected=direction==="Outbound"?rail:rail.slice().reverse();
      const datesCancelled=maintenanceDays.has(serviceDate)&&maintenanceTrains.has(n);
      if(!clockByNumber[n]||!direction||datesCancelled||
        !source||source.line_key!=="Yonezawa"||
        source.source_path!=="data/timetables/Yonezawa-manual.js"||
        source.calendar_urn!==selectedCalendar||
        source.direction_urn!=="odpt.RailDirection:"+direction||
        source.railway_urn!=="odpt.Railway:JR-East.Yonezawa"||
        source.train_type_urn!=="odpt.TrainType:JR-East.Local"||
        run.network_key!==source.railway_urn||
        run.train_number!==source.train_number||
        run.rail_direction!==source.direction_urn||
        run.train_type!==source.train_type_urn||
        !Array.isArray(run.stops)||run.stops.length!==rail.length||
        !Array.isArray(stops)||stops.length!==rail.length||
        stops.some((st:any,j:number)=>stop(st)!==expected[j])||
        run.stops.some((st:any,j:number)=>stationKey(st.station_urn||"")!==expected[j])||
        clock(stops[0].departure_clock)!==clockByNumber[n][0]||
        clock(stops[stops.length-1].arrival_clock)!==clockByNumber[n][1]){
        result.splice(i,1);continue;
      }
      const officialUrl="https://timetables.jreast.co.jp/2611/timetable-v/252"+
        (direction==="Outbound"?"d":"u")+
        (selectedCalendar==="odpt.Calendar:Weekday"?"1":"2")+".html";
      run.train_number_verification="official-2611-yonesaka-rail-only";
      run.train_number_source_url=officialUrl;
      // No dated rolling-stock dispatch or current intermediate-stop
      // revision is established by an official number/endpoint match.
      run.timetable_date_verified=false;
      run.timetable_validity="undated_not_current_verified";
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="キハ110系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"jr-east-2611-252-rail-ends",lineId:"Yonezawa",
        trainNumber:n,serviceDate,calendar:selectedCalendar,
        direction:run.rail_direction,sourceTemplateId:Number(run.source_template_id),
        sourceStopKeys:expected,segmentKey:"yonezawa_imaizumi_rail",
        plannedCandidates:["キハ110系"],model:null,pngReference:null,
        officialSourceUrl:officialUrl,
        stopClockStatus:"origin_terminus_only_2611_verified",
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Kamaishi <-> TohokuMain 2611 named Hinabi through trains.
  // Canonical itineraries now join two SQL sources; the published November
  // run-day roster must gate BOTH sides. Do not let an undated TohokuMain
  // source template resurrect 8621D/8622D on a non-operating weekend.
  if(lineId==="TohokuMain" && /^2026-11-/.test(serviceDate)) {
    const {data:hinabiThrough,error:hinabiThroughError}=
      await db.from("published_kamaishi_2611_through_segments")
        .select("train_number,calendar_urn,operating_dates,canonical_timetable_id")
        .eq("edition","2611")
        .in("train_number",["8621D","8622D"]);
    if(hinabiThroughError)throw hinabiThroughError;
    const datesByNumber=new Map((hinabiThrough||[]).map((row:any)=>
      [row.train_number,row]));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      if(run.train_number!=="8621D"&&run.train_number!=="8622D")continue;
      const proof:any=datesByNumber.get(run.train_number);
      if(!proof||proof.calendar_urn!==selectedCalendar ||
         Number(proof.canonical_timetable_id)!==Number(run.canonical_timetable_id)||
         !Array.isArray(proof.operating_dates)||
         !proof.operating_dates.map((date:any)=>String(date).slice(0,10)).includes(serviceDate)){
        result.splice(i,1);
        continue;
      }
      run.train_type="odpt.TrainType:JR-East.Rapid";
      run.service_name="ひなび 釜石";
      run.train_number_verification="official-2611-hinabi-through-calendar";
    }
  }
  // JR-WEST ONLY: OitoWest 南小谷--糸魚川.
  // 19 official numbered JR-West 4xxD services in both calendars.
  // 28 source templates are HISTORICAL 3-stop Minami/Nakatsuchi/Kita
  // fragments, not accurate nine-station Itoigawa itineraries.
  // 10 roster entries have NO source stops; never invent positions.
  // 790x were replacement BUSES ONLY UNTIL October 31: not trains.
  // The valid KiHa120-300 fleet is orange/red Okayama livery; the only
  // gallery 120 PNGs are wrong regional colors, so NO train PNG.
  if(lineId==="OitoWest"&&/^2026-11-/.test(serviceDate)){
    const {data:roster,error:rosterErr}=
      await db.from("published_oito_west_2611_number_roster")
        .select("source_template_id,train_number,calendar_urn,direction_urn,train_type_urn,source_scope,original_stop_keys,excluded_dates,vehicle_model,png_reference,official_source_url,clock_source_status,reference_only,actual_vehicle_confirmed")
        .eq("edition","2611").eq("line_key","OitoWest")
        .eq("calendar_urn",selectedCalendar);
    if(rosterErr)throw rosterErr;
    if((roster||[]).length!==19)
      throw new Error("OITO_WEST_2611_NUMBER_ROSTER_UNAVAILABLE");
    const byId=new Map((roster||[]).filter((r:any)=>
      r.source_template_id!=null).map((r:any)=>
        [Number(r.source_template_id),r]));
    const orderedDown=["Minami-Otari","Nakatsuchi","Kita-Otari"];
    const publishedUp=new Set(["420D","422D","424D","426D","428D",
      "430D","432D","434D","436D","438D"]);
    const publishedDown=new Set(["421D","423D","425D","427D",
      "429D","431D","433D","435D","437D"]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],n=String(run.train_number||"");
      if(!/^[0-9]{3}D$/.test(n)){
        // In particular 7901-7906 historical bus plans never get
        // projected onto this *railway train* map in November.
        result.splice(i,1);continue;
      }
      const p:any=byId.get(Number(run.source_template_id));
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      const expected=inbound?[...orderedDown].reverse():orderedDown;
      const calendar=p&&p.calendar_urn===selectedCalendar;
      const numberMatch=(inbound?publishedUp:publishedDown).has(n);
      const actual=Array.isArray(run.stops)?run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||""):[];
      const excluded=(p?.excluded_dates||[]).map((d:any)=>
        String(d).slice(0,10));
      if(!p||!calendar||!numberMatch||
         p.source_scope!=="historical_three_station_partial"||
         p.train_number!==n||p.direction_urn!==run.rail_direction||
         p.train_type_urn!=="odpt.TrainType:JR-West.Local"||
         run.train_type!==p.train_type_urn||
         run.network_key!=="odpt.Railway:JR-West.Oito"||
         p.vehicle_model!=="キハ120形300番台（大糸線・岡山色）"||
         p.png_reference!==null||
         p.clock_source_status!=="historical_partial_not_2611_verified"||
         p.reference_only!==true||p.actual_vehicle_confirmed!==false||
         excluded.includes(serviceDate)||
         (serviceDate==="2026-11-08"&&["429D","430D"].includes(n))||
         !Array.isArray(p.original_stop_keys)||
         actual.length!==3||p.original_stop_keys.length!==3||
         actual.some((st:string,j:number)=>
           st!==expected[j]||st!==p.original_stop_keys[j])){
        result.splice(i,1);continue;
      }
      run.train_number_verification="official-2611-jrwest-oito-partial-source";
      run.train_number_source_url=p.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jrwest-2611-number-roster",
        lineId:"OitoWest",trainNumber:n,serviceDate:serviceDate,
        calendar:p.calendar_urn,direction:run.rail_direction,
        trainType:run.train_type,sourceTemplateId:Number(p.source_template_id),
        sourceStopKeys:p.original_stop_keys,
        scope:"jr_west_minami_otari_itoigawa_partial",
        sourceScope:p.source_scope,model:p.vehicle_model,
        pngReference:null,officialSourceUrl:p.official_source_url,
        excludedDates:p.excluded_dates||[],
        stopClockStatus:p.clock_source_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // JR-East-only Oito, Matsumoto–Minami-Otari. Existing JR-West
  // 4xxD diesel and 790x bus/segregated records are out of scope:
  // NEVER mutate, classify or suppress them in this branch.
  // JR-East M ordinary/Azusa/Hakuba + 8361D/8362D Furusato alone.
  // Source numbers and historic SQL CLOCKS are different proof levels.
  if(lineId==="Oito"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterErr},{data:ranges,error:rangeErr}]=
      await Promise.all([
        db.from("published_oito_east_2611_number_roster")
          .select("source_template_id,train_number,calendar_urn,direction_urn,train_type_urn,service_kind,operating_dates,source_stop_keys,vehicle_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Oito")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Oito")
      ]);
    if(rosterErr||rangeErr)throw(rosterErr||rangeErr);
    const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?69:72;
    if((roster||[]).length!==expectedCount||(ranges||[]).length!==4)
      throw new Error("OITO_EAST_2611_NUMBER_ROSTER_UNAVAILABLE");
    const byTemplate=new Map((roster||[]).map((r:any)=>
      [Number(r.source_template_id),r]));
    const eastStations=new Set(["Azumi-Kutsukake","Azumi-Oiwake",
      "Azusabashi","Chikuni","Hakuba","Hakuba-Oike","Hakuyacho",
      "Hitoichiba","Hosono","Hotaka","Iimori","Inao","Kamishiro",
      "Kita-Hosono","Kita-Matsumoto","Kita-Omachi","Matsumoto",
      "Minami-Kamishiro","Minami-Omachi","Minami-Otari",
      "Minami-Toyoshina","Nakagaya","Shimatakamatsu","Shimauchi",
      "Shinano-Kizaki","Shinano-Matsukawa","Shinano-Moriue",
      "Shinano-Omachi","Shinano-Tokiwa","Shinshu-Ariake",
      "Toyoshina","Uminoguchi","Yanaba"]);
    const resortDates=new Set(["2026-11-01","2026-11-02",
      "2026-11-03","2026-11-06","2026-11-08","2026-11-09",
      "2026-11-13","2026-11-14","2026-11-15","2026-11-16",
      "2026-11-20","2026-11-21","2026-11-22","2026-11-23",
      "2026-11-27","2026-11-28","2026-11-29","2026-11-30"]);
    const hakubaDates=new Set(["2026-11-01","2026-11-21",
      "2026-11-22","2026-11-23"]);
    const approved=new Map([
      ["211系（長野地区）","../images/列车/JR東日本/JR東日本_211系_長野色.png"],
      ["E127系100番台","../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png"],
      ["E353系","../images/列车/JR東日本/JR東日本_E353系.png"],
      ["HB-E300系（リゾートビューふるさと）",
       "../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png"]
    ]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],n=String(run.train_number||"");
      // Leave JR-West D numbers and already separated buses entirely
      // untouched; only validate East M and dedicated East resort D.
      if(!(/^[0-9]+M$/.test(n)||n==="8361D"||n==="8362D"))
        continue;
      const p:any=byTemplate.get(Number(run.source_template_id));
      if(!p||p.train_number!==n||p.calendar_urn!==selectedCalendar||
         p.direction_urn!==run.rail_direction||
         p.train_type_urn!==run.train_type||
         run.network_key!=="odpt.Railway:JR-East.Oito"||
         p.reference_only!==true||p.actual_vehicle_confirmed!==false||
         p.stop_clock_status!=="historical_not_2611_verified"||
         !Array.isArray(run.stops)||!Array.isArray(p.source_stop_keys)){
        result.splice(i,1);continue;
      }
      const number=/^([0-9]+)([MD])$/.exec(n);
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      const actual=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(!number||Number(number[1])%2!==(inbound?0:1)||
         actual.length!==p.source_stop_keys.length||
         actual.length<4||actual.length>33||
         actual.some((st:string,j:number)=>
           !eastStations.has(st)||st!==p.source_stop_keys[j])){
        result.splice(i,1);continue;
      }
      const kind=p.service_kind;
      const dates=(p.operating_dates||[]).map((d:any)=>
        String(d).slice(0,10));
      if(kind==="december_only"){
        result.splice(i,1);continue;
      }
      if(kind==="resort_furusato"){
        if(!["8361D","8362D"].includes(n)||
           run.train_type!=="odpt.TrainType:JR-East.Rapid"||
           dates.length!==resortDates.size||
           dates.some((d:string)=>!resortDates.has(d))||
           !resortDates.has(serviceDate)){
          result.splice(i,1);continue;
        }
      }else if(kind==="hakuba_limited"||kind==="hakuba_local"){
        const isLimited=kind==="hakuba_limited";
        if(!((isLimited&&["8041M","8042M"].includes(n))||
           (!isLimited&&["8352M","8353M"].includes(n)))||
           run.train_type!=="odpt.TrainType:JR-East."+
             (isLimited?"LimitedExpress":"Local")||
           dates.length!==hakubaDates.size||
           dates.some((d:string)=>!hakubaDates.has(d))||
           !hakubaDates.has(serviceDate)){
          result.splice(i,1);continue;
        }
      }else if(kind!=="regular"||dates.length!==0){
        result.splice(i,1);continue;
      }
      const model=String(p.vehicle_model||"");
      const png=p.png_reference||null;
      const suffix=number[2];
      if(png&&(approved.get(model)!==png||
         !(ranges||[]).some((r:any)=>
           r.requires_exact_roster===true&&r.vehicle_model===model&&
           r.png_reference===png&&r.suffix===suffix&&
           Number(number[1])>=r.min_number&&
           Number(number[1])<=r.max_number))){
        result.splice(i,1);continue;
      }
      // 5232M lacks a credible specific source-fleet label. It gets
      // its verified number but NO invented representative vehicle PNG.
      if(!png&&model){
        result.splice(i,1);continue;
      }
      run.train_number_verification="official-2611-oito-east-number-date";
      run.train_number_source_url=p.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=model||null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      if(kind==="resort_furusato")run.service_name="リゾートビューふるさと";
      if(kind==="hakuba_limited")run.service_name="はくば";
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Oito",
        trainNumber:n,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:p.calendar_urn,
        trainType:run.train_type,serviceKind:kind,
        scope:"jr_east_matsumoto_minami_otari",
        sourceTemplateId:Number(p.source_template_id),
        sourceStopKeys:p.source_stop_keys,
        railwayFrom:actual[0],railwayTo:actual[actual.length-1],
        plannedCandidates:model?[model]:[],
        model:model||null,pngReference:png,
        officialSourceUrl:p.official_source_url,
        operatingDates:dates,
        stopClockStatus:p.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // 中央線・総武線各駅停車 (JR 659) 2026-11: old source rows
  // are NOT independently verified edition-2611 number/clock evidence.
  // B/C yellow JR local stock now includes E231-500, E231-0, E235-0;
  // B/C is NOT a physical formation code and authorizes NO exact PNG.
  // Y/A belongs to Tozai through services; its existing 659/671
  // number/calendar/direction/owner crosswalk remains the ONLY family
  // illustration authority (never infer 05/07/15000 or E231-800 from Y).
  // Old E353 5003M/5050M are 2-stop expresses, not local trains.
  // Suigun (main) + SuigunBranch (Hitachi-Ota) 2611:
  // exact source-template/calendar/railway and date-scoped exceptions.
  // Do not project obsolete manual 9821D/9822D stop clocks or fake
  // a KiHa E130 PNG for the independent Kazekko trolley.
  if(["Suigun","SuigunBranch"].includes(lineId)&&
     /^2026-11-/.test(serviceDate)){
    const {data:suigunScope,error:suigunError}=await db
      .from("published_suigun_2611_fleet_scope")
      .select("source_template_id,calendar_urn,direction_urn,train_number,source_type_urn,published_type_urn,source_occurrence,fleet_role,candidate_models,illustration_model,png_reference,operating_dates,excluded_dates,number_evidence_scope,source_url,reference_only,actual_vehicle_confirmed")
      .eq("edition","2611").eq("line_key",lineId)
      .eq("calendar_urn",selectedCalendar);
    const expected=lineId==="Suigun"?
      (selectedCalendar==="odpt.Calendar:Weekday"?76:83):30;
    if(suigunError||(suigunScope||[]).length!==expected)
      throw new Error("SUIGUN_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE");
    const byTemplate=new Map((suigunScope||[]).map((x:any)=>
      [Number(x.source_template_id),x]));
    if(byTemplate.size!==expected)
      throw new Error("SUIGUN_2611_DUPLICATE_SOURCE_SCOPE");
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const proof:any=byTemplate.get(Number(run.source_template_id));
      const dates=Array.isArray(proof?.operating_dates)?
        proof.operating_dates.map((d:any)=>String(d).slice(0,10)):[];
      const exclusions=Array.isArray(proof?.excluded_dates)?
        proof.excluded_dates.map((d:any)=>String(d).slice(0,10)):[];
      if(!proof||proof.calendar_urn!==run.service_id||
         proof.direction_urn!==run.rail_direction||
         proof.train_number!==run.train_number||
         proof.source_type_urn!==run.train_type||
         run.network_key!=="odpt.Railway:JR-East."+lineId||
         proof.reference_only!==true||
         proof.actual_vehicle_confirmed!==false||
         !Array.isArray(proof.candidate_models)||
         exclusions.includes(serviceDate)||
         (dates.length>0&&!dates.includes(serviceDate))||
         !(proof.fleet_role==="kiha_e130_0_reference"||
           proof.fleet_role==="kazekko_excursion_no_png")||
         (proof.fleet_role==="kiha_e130_0_reference"?
           (proof.illustration_model!=="キハE130系0番台"||
            proof.png_reference!=="../images/列车/JR東日本/JR東日本_キハE130系0番台.png"||
            proof.candidate_models.length!==1||
            proof.candidate_models[0]!=="キハE130系0番台"||
            proof.published_type_urn!=="odpt.TrainType:JR-East.Local"):
           (lineId!=="Suigun"||
            !["9821D","9822D"].includes(run.train_number)||
            proof.png_reference!==null||proof.illustration_model!==null||
            proof.candidate_models.length!==0||
            proof.published_type_urn!=="odpt.TrainType:JR-East.Rapid"))){
        result.splice(i,1);continue;
      }
      const trolley=proof.fleet_role==="kazekko_excursion_no_png";
      run.train_type=proof.published_type_urn;
      if(trolley)run.service_name="風っこ水郡線紅葉号";
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=trolley?null:"キハE130系0番台";
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.train_number_verification=proof.number_evidence_scope;
      run.timetable_date_verified=false;
      run.published_number_fleet_reference={
        source:"jr-east-2611-suigun-243",lineId:lineId,
        trainNumber:run.train_number,serviceDate:serviceDate,
        sourceTemplateId:Number(run.source_template_id),
        calendar:proof.calendar_urn,direction:proof.direction_urn,
        trainType:proof.published_type_urn,
        candidateModels:proof.candidate_models,
        illustrationModel:proof.illustration_model,
        pngReference:proof.png_reference,
        sourceUrl:proof.source_url,
        operatingDates:dates,excludedDates:exclusions,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Shinonoi 2611: use existing published 383 Shinano plans, and
  // retain conservative 211/E127 line illustration on historical locals.
  // Calendar/number proof is NOT 2026-11 stop-clock or actual-car proof.
  if(lineId==="Shinonoi"&&/^2026-11-/.test(serviceDate)){
    const {data:scope,error:scopeErr}=await db
      .from("published_shinonoi_2611_fleet_scope")
      .select("source_template_id,calendar_urn,direction_urn,train_number,train_type_urn,fleet_role,candidate_models,illustration_model,number_evidence_scope,source_url,reference_only,actual_vehicle_confirmed")
      .eq("edition","2611").eq("line_key","Shinonoi")
      .eq("calendar_urn",selectedCalendar);
    if(scopeErr||(scope||[]).length!==144)
      throw new Error("SHINONOI_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE");
    const bySource=new Map((scope||[]).map((v:any)=>
      [Number(v.source_template_id),v]));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const proof:any=bySource.get(Number(run.source_template_id));
      if(!proof||proof.calendar_urn!==run.service_id||
         proof.direction_urn!==run.rail_direction||
         proof.train_number!==run.train_number||
         proof.train_type_urn!==run.train_type||
         run.network_key!=="odpt.Railway:JR-East.Shinonoi"||
         proof.reference_only!==true||
         proof.actual_vehicle_confirmed!==false||
         !Array.isArray(proof.candidate_models)||
         proof.candidate_models.length<1||
         !["mixed_local","rapid_211_reference","shinano_383"]
           .includes(proof.fleet_role)||
         (proof.fleet_role==="shinano_383"?
           proof.number_evidence_scope!=="existing_official_service_vehicle_plan":
           proof.number_evidence_scope!=="historical_source_only")){
        result.splice(i,1);continue;
      }
      // The 52 Shinano model plans are officially sourced, but no
      // numbered train is a confirmed physical 383 formation.
      const shinano=proof.fleet_role==="shinano_383";
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=proof.candidate_models.join(" / ");
      run.vehicle_plan_confirmed=shinano;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.train_number_verification=shinano
        ?"official-2611-shinano-service-number"
        :"historical-source-only-116-2611";
      run.timetable_date_verified=false;
      run.published_number_fleet_reference={
        source:"jr-east-2611-shinonoi-116",lineId:"Shinonoi",
        trainNumber:run.train_number,serviceDate:serviceDate,
        trainType:proof.train_type_urn,calendar:proof.calendar_urn,
        direction:proof.direction_urn,
        sourceTemplateId:Number(run.source_template_id),
        numberEvidenceScope:proof.number_evidence_scope,
        models:proof.candidate_models,
        illustrationModel:proof.illustration_model,
        sourceUrl:proof.source_url,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Senzan 2611: protect actual running dates as well as planned
  // illustrations; preserve all historical source templates for audit.
  if(lineId==="Senzan"&&/^2026-11-/.test(serviceDate)){
    const {data:rows,error:err}=await db.from("published_senzan_2611_fleet_scope")
      .select("source_template_id,calendar_urn,direction_urn,train_number,source_type_urn,published_type_urn,fleet_role,candidate_models,illustration_model,source_url,operating_dates,reference_only,actual_vehicle_confirmed")
      .eq("edition","2611").eq("line_key","Senzan")
      .eq("calendar_urn",selectedCalendar);
    if(err||(rows||[]).length!==106)
      throw new Error("SENZAN_2611_NUMBER_FLEET_SCOPE_UNAVAILABLE");
    const scope=new Map((rows||[]).map((x:any)=>
      [Number(x.source_template_id),x]));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const proof:any=scope.get(Number(run.source_template_id));
      const dates=Array.isArray(proof?.operating_dates)
        ?proof.operating_dates.map((d:any)=>String(d).slice(0,10)):[];
      if(!proof||proof.calendar_urn!==run.service_id||
         proof.direction_urn!==run.rail_direction||
         proof.train_number!==run.train_number||
         proof.source_type_urn!==run.train_type||
         run.network_key!=="odpt.Railway:JR-East.Senzan"||
         proof.reference_only!==true||
         proof.actual_vehicle_confirmed!==false||
         (proof.fleet_role==="satono_dated"
           ?(!["8821D","8822D"].includes(run.train_number)||
             proof.published_type_urn!=="odpt.TrainType:JR-East.Rapid"||
             !dates.includes(serviceDate))
           :proof.fleet_role!=="regular_e721"||
             !/^[0-9]{3,4}M$/.test(run.train_number)||dates.length!==0)){
        result.splice(i,1);continue;
      }
      run.train_type=proof.published_type_urn;
      if(proof.fleet_role==="satono_dated")
        run.service_name="いろどりSATONO";
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=proof.candidate_models.join(" / ");
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.train_number_verification="official-2611-number-calendar";
      run.timetable_date_verified=false;
      run.published_number_fleet_reference={
        source:"jr-east-2611-senzan-265",lineId:"Senzan",
        trainNumber:run.train_number,serviceDate:serviceDate,
        trainType:proof.published_type_urn,calendar:proof.calendar_urn,
        direction:proof.direction_urn,models:proof.candidate_models,
        illustrationModel:proof.illustration_model,
        sourceUrl:proof.source_url,operatingDates:dates,
        actualVehicleConfirmed:false,referenceOnly:true
      };
    }
  }
  // Ryomo 2611: number-scoped fleet reference only. Exclude historical
  // 9482M/9484M/9486M without deleting the original source templates.
  if(lineId==="Ryomo"&&/^2026-11-/.test(serviceDate)){
    const {data:scope,error:scopeError}=await db
      .from("published_ryomo_2611_fleet_scope")
      .select("source_template_id,calendar_urn,direction_urn,train_number,train_type_urn,fleet_role,candidate_models,illustration_model,source_url,reference_only,actual_vehicle_confirmed,formation_id")
      .eq("edition","2611").eq("line_key","Ryomo")
      .eq("calendar_urn",selectedCalendar);
    const required=selectedCalendar==="odpt.Calendar:Weekday"?114:117;
    if(scopeError||(scope||[]).length!==required)
      throw new Error("RYOMO_2611_NUMBER_FLEET_SCOPE_UNAVAILABLE");
    const scopeById=new Map((scope||[]).map((x:any)=>
      [Number(x.source_template_id),x]));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const found:any=scopeById.get(Number(run.source_template_id));
      if(!found||run.train_number!==found.train_number||
         run.rail_direction!==found.direction_urn||
         run.service_id!==found.calendar_urn||
         run.train_type!==found.train_type_urn||
         run.network_key!=="odpt.Railway:JR-East.Ryomo"||
         found.reference_only!==true||
         found.actual_vehicle_confirmed!==false||
         found.formation_id!==null){
        result.splice(i,1);continue;
      }
      // Import labels were E231/E233 for every service, including 211M.
      // A dated official number may authorize a reference picture, NEVER
      // a daily physical formation or an EXACT vehicle status.
      run.vehicle_type_candidates=found.candidate_models.join(" / ");
      run.vehicle_type_label=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.train_number_verification="official-2611-number-scope";
      run.timetable_date_verified=false;
      run.published_number_fleet_reference={
        source:"jr-east-2611-ryomo-237",
        lineId:"Ryomo",trainNumber:run.train_number,
        calendar:found.calendar_urn,direction:found.direction_urn,
        plannedCandidates:found.candidate_models,
        illustrationModel:found.illustration_model,
        numberVerified:true,actualVehicleConfirmed:false,
        sourceUrl:found.source_url
      };
    }
  }
  if(lineId==="ChuoSobuLocal"&&/^2026-11-/.test(serviceDate)){
    const {data:scope,error:scopeErr}=await db
      .from("published_chuo_sobu_2611_source_scope")
      .select("source_template_id,line_key,calendar_urn,direction_urn,train_number,segment_key,source_stop_keys,candidate_models,official_line_source_url,source_clock_status,train_number_verification,reference_only,actual_vehicle_confirmed,png_reference")
      .eq("edition","2611").eq("line_key","ChuoSobuLocal")
      .eq("calendar_urn",selectedCalendar);
    const required=selectedCalendar==="odpt.Calendar:Weekday"?664:515;
    if(scopeErr||(scope||[]).length!==required)
      throw new Error("CHUO_SOBU_2611_SOURCE_SCOPE_UNAVAILABLE");
    const bySource=new Map((scope||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const p:any=bySource.get(Number(run.source_template_id));
      if(!p||p.line_key!=="ChuoSobuLocal"||
        p.train_number!==run.train_number||
        p.direction_urn!==run.rail_direction||
        p.calendar_urn!==run.service_id||
        p.source_clock_status!=="historical_not_2611_verified"||
        p.train_number_verification!=="historical_source_only"||
        p.reference_only!==true||p.actual_vehicle_confirmed!==false||
        p.png_reference!==null||
        run.network_key!=="odpt.Railway:JR-East.ChuoSobuLocal"||
        !Array.isArray(p.source_stop_keys)||
        !Array.isArray(run.stops)||
        run.stops.length<2||run.stops.length>p.source_stop_keys.length){
        result.splice(i,1);continue;
      }
      const keys=run.stops.map((s:any)=>
        String(s.station_urn||"").split(".").pop()||"");
      if(keys.some((key:string,j:number)=>key!==p.source_stop_keys[j])){
        result.splice(i,1);continue;
      }
      const ordinary=p.segment_key==="jr_ordinary_bc";
      const through=p.segment_key==="tozai_through_ya";
      if(p.segment_key==="foreign_limited_express_m"){
        // The ChuoMain/E353 evidence is a different service namespace.
        result.splice(i,1);continue;
      }
      if(!(ordinary||through)||
        run.train_type!=="odpt.TrainType:JR-East.Local"||
        (ordinary?!/^[0-9]{3,4}[BC]$/.test(run.train_number):
          !/^[0-9]{3,4}[YA]$/.test(run.train_number))){
        result.splice(i,1);continue;
      }
      // Keep clock/number uncertainty explicit. Do not elevate old source
      // models into an official number-to-formation or artwork claim.
      run.train_number_verification="historical-source-only-659-2611";
      run.train_number_source_url=null;
      run.timetable_date_verified=false;
      run.vehicle_type_label=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      if(ordinary)run.vehicle_type_candidates=
        "E231系500番台 / E231系0番台 / E235系0番台";
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-source-scope-historical",
        lineId:"ChuoSobuLocal",trainNumber:run.train_number,
        calendar:p.calendar_urn,direction:run.rail_direction,
        sourceTemplateId:Number(run.source_template_id),
        sourceStopKeys:p.source_stop_keys,
        segmentKey:p.segment_key,
        plannedCandidates:p.candidate_models,
        numberVerified:false,model:null,pngReference:null,
        officialLineSourceUrl:p.official_line_source_url,
        stopClockStatus:p.source_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // 陸羽東線 2611: 45 regular numbers in both calendars + six
  // dated "おもいで湯けむり" rapid numbers. 2024 flood leaves
  // Naruko-Onsen–Shinjo CLOSED, buses aren't railway runs.
  // All 104 legacy SQL sources are audited: 96 admissible + eight
  // duplicate, shortened or NOT-November sources. The source_id/stop
  // array, not numeric range or free-text KiHa110, admits each train.
  if(lineId==="RikutoEast" && /^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterErr},
      {data:excluded,error:excludedErr},
      {data:range,error:rangeErr}]=await Promise.all([
      db.from("published_rikuto_east_2611_number_roster")
        .select("source_template_id,calendar_urn,direction_urn,train_number,source_stop_keys,train_type_urn,service_name,segment_key,valid_dates,vehicle_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
        .eq("edition","2611").eq("line_key","RikutoEast"),
      db.from("published_rikuto_east_2611_excluded_source_audit")
        .select("source_template_id").eq("edition","2611").eq("line_key","RikutoEast"),
      db.from("published_train_png_number_ranges")
        .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster,actual_vehicle_confirmed")
        .eq("edition","2611").eq("line_key","RikutoEast")
    ]);
    if(rosterErr||excludedErr||rangeErr||
       (roster||[]).length!==96||(excluded||[]).length!==8||
       (range||[]).length!==2)
      throw new Error("RIKUTO_EAST_2611_OFFICIAL_ROSTER_UNAVAILABLE");
    const bySource=new Map((roster||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    const forbidden=new Set((excluded||[]).map((p:any)=>
      Number(p.source_template_id)));
    const specials=new Set(["2026-11-01","2026-11-02","2026-11-03",
      "2026-11-07","2026-11-08","2026-11-14","2026-11-15",
      "2026-11-21","2026-11-22","2026-11-23","2026-11-28","2026-11-29"]);
    const route=["Kogota","Kita-Ura","Rikuzen-Yachi","Furukawa",
      "Tsukume","Nishi-Furukawa","Higashi-Ohsaki","Nishi-Ohsaki",
      "Iwadeyama","Yubikan","Kaminome","Igetsuki","Kawatabi-Onsen",
      "Naruko-Gotenyu","Naruko-Onsen"];
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const id=Number(run.source_template_id);
      const p:any=bySource.get(id);
      if(!p||forbidden.has(id)||
        run.network_key!=="odpt.Railway:JR-East.RikutoEast"||
        p.train_number!==run.train_number||
        p.direction_urn!==run.rail_direction||
        p.calendar_urn!==run.service_id||
        p.stop_clock_status!=="historical_not_2611_verified"||
        p.reference_only!==true||p.actual_vehicle_confirmed!==false||
        p.vehicle_model!=="キハ110系"||
        run.train_type!=="odpt.TrainType:JR-East.Local"||
        !Array.isArray(p.source_stop_keys)||p.source_stop_keys.length<2||
        !Array.isArray(run.stops)){
        result.splice(i,1);continue;
      }
      const keys=run.stops.map((s:any)=>
        String(s.station_urn||"").split(".").pop()||"");
      if(keys.length!==p.source_stop_keys.length||
        keys.some((s:string,k:number)=>s!==p.source_stop_keys[k])||
        keys.some((s:string,k:number)=>{
          const position=route.indexOf(s);
          return position<0||(k>0&&(
            run.rail_direction==="odpt.RailDirection:Inbound"?
              position>=route.indexOf(keys[k-1]):
              position<=route.indexOf(keys[k-1])));
        })){
        result.splice(i,1);continue;
      }
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      const officialUrl="https://timetables.jreast.co.jp/2611/timetable-v/268"+
        (inbound?"u":"d")+
        (p.calendar_urn==="odpt.Calendar:Weekday"?"1":"2")+".html";
      if(!["odpt.RailDirection:Inbound","odpt.RailDirection:Outbound"]
         .includes(run.rail_direction)||p.official_source_url!==officialUrl){
        result.splice(i,1);continue;
      }
      const rapid=p.segment_key==="kogota_naruko_omoide_rapid";
      const regular=p.segment_key==="kogota_naruko_regular";
      const numbers=rapid?
        (inbound?["9722D","9724D","9726D"]:["9721D","9723D","9725D"]):
        [];
      const expectedName=rapid?
        "おもいで湯けむり"+run.train_number.slice(-2,-1)+"号":"";
      const validDates=Array.isArray(p.valid_dates)?
        p.valid_dates.map((d:any)=>String(d).slice(0,10)):[];
      const expectedPng=rapid?
        "../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png":
        "../images/列车/JR東日本/JR東日本_キハ110系.png";
      if(!(rapid||regular)||
        p.png_reference!==expectedPng||
        (rapid?(p.calendar_urn!=="odpt.Calendar:SaturdayHoliday"||
          !numbers.includes(run.train_number)||
          !specials.has(serviceDate)||
          !validDates.includes(serviceDate)||
          validDates.length!==12||
          p.train_type_urn!=="odpt.TrainType:JR-East.Rapid"||
          p.service_name!==expectedName):
          (p.calendar_urn!==selectedCalendar||validDates.length!==0||
          p.train_type_urn!=="odpt.TrainType:JR-East.Local"||
          p.service_name!==""))){
        result.splice(i,1);continue;
      }
      run.train_type=p.train_type_urn;
      run.service_name=p.service_name||null;
      run.train_number_verification="official-2611-rikuto-east-number-date-source";
      run.train_number_source_url=p.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="キハ110系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"RikutoEast",
        trainNumber:run.train_number,serviceDate:serviceDate,
        calendar:p.calendar_urn,direction:p.direction_urn,
        trainType:p.train_type_urn,serviceName:p.service_name,
        segmentKey:p.segment_key,
        sourceTemplateId:id,sourceStopKeys:p.source_stop_keys,
        validDates:validDates,plannedCandidates:["キハ110系"],
        model:p.vehicle_model,pngReference:p.png_reference,
        officialSourceUrl:p.official_source_url,
        stopClockStatus:p.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // 男鹿線 2611: 29 ordinary official M numbers per calendar.
  // Historical SQL has only 23 weekday and 29 holiday sources, plus SIX
  // weekday services documented in the official timetable but ABSENT from
  // original SQL. Never fabricate missing positions from public numbers.
  // Maintenance 2026-11-05 cancels 1130/32/34 and 1131/33/35M.
  // 1145M on 2026-11-20 has DIFFERENT clocks: no old-clock projection.
  // Model is a representative EV-E801 ACCUM FAMILY, never physical unit.
  if(lineId==="Oga"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterErr},{data:range,error:rangeErr}]=
      await Promise.all([
        db.from("published_oga_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,source_template_id,source_stop_keys,calendar_scope,excluded_dates,clock_change_dates,vehicle_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Oga")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Oga")
      ]);
    if(rosterErr||rangeErr)throw(rosterErr||rangeErr);
    if((roster||[]).length!==29||(range||[]).length!==1)
      throw new Error("OGA_2611_NUMBER_SQL_ROSTER_UNAVAILABLE");
    const bySource=new Map((roster||[]).filter((row:any)=>
      row.source_template_id!=null).map((row:any)=>
      [Number(row.source_template_id),row]));
    const allowed=new Set(["Oiwake","Detohama","Kamifutada",
      "Futada","Tenno","Funakoshi","Wakimoto","Hadachi","Oga"]);
    const outbound=["Oiwake","Detohama","Kamifutada","Futada",
      "Tenno","Funakoshi","Wakimoto","Hadachi","Oga"];
    const forbiddenNov5=new Set(["1130M","1132M","1134M",
      "1131M","1133M","1135M"]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],proof:any=
        bySource.get(Number(run.source_template_id));
      if(!proof||proof.calendar_scope!=="sql_rail_service"||
         proof.calendar_urn!==selectedCalendar||
         run.network_key!=="odpt.Railway:JR-East.Oga"||
         run.train_number!==proof.train_number||
         run.rail_direction!==proof.direction_urn||
         run.train_type!==proof.train_type_urn||
         proof.reference_only!==true||
         proof.actual_vehicle_confirmed!==false||
         !Array.isArray(run.stops)||
         !Array.isArray(proof.source_stop_keys)){
        result.splice(i,1);continue;
      }
      const excluded=(proof.excluded_dates||[]).map((d:any)=>
        String(d).slice(0,10));
      const altered=(proof.clock_change_dates||[]).map((d:any)=>
        String(d).slice(0,10));
      if(excluded.includes(serviceDate)||altered.includes(serviceDate)||
         (serviceDate==="2026-11-05"&&
           forbiddenNov5.has(run.train_number))||
         (serviceDate==="2026-11-20"&&run.train_number==="1145M")){
        result.splice(i,1);continue;
      }
      const number=/^([0-9]{4})M$/.exec(String(run.train_number||""));
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      const stops=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      const expected=inbound?[...outbound].reverse():outbound;
      if(!number||Number(number[1])%2!==(inbound?0:1)||
         stops.length!==9||proof.source_stop_keys.length!==9||
         stops.some((key:string,j:number)=>
           key!==expected[j]||key!==proof.source_stop_keys[j]||
           !allowed.has(key))){
        result.splice(i,1);continue;
      }
      const inRange=(range||[]).some((r:any)=>
        r.segment_key==="oiwake_oga_regular_rail"&&
        r.requires_exact_roster===true&&
        Number(number[1])>=r.min_number&&Number(number[1])<=r.max_number&&
        r.suffix==="M"&&r.vehicle_model===proof.vehicle_model&&
        r.png_reference===proof.png_reference);
      if(!inRange||proof.vehicle_model!=="EV-E801系"||
         proof.png_reference!=="../images/列车/JR東日本/JR東日本_EV-E801系.png"||
         proof.stop_clock_status!=="historical_not_2611_verified"){
        result.splice(i,1);continue;
      }
      run.train_number_verification="official-2611-oga-number-sql-rail";
      run.train_number_source_url=proof.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="EV-E801系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Oga",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:proof.calendar_urn,
        trainType:run.train_type,segmentKey:"oiwake_oga_regular_rail",
        calendarScope:proof.calendar_scope,
        sourceTemplateId:Number(proof.source_template_id),
        sourceStopKeys:proof.source_stop_keys,
        railwayFrom:expected[0],railwayTo:expected[8],
        plannedCandidates:["EV-E801系"],
        model:proof.vehicle_model,pngReference:proof.png_reference,
        officialSourceUrl:proof.official_source_url,
        excludedDates:proof.excluded_dates||[],
        clockChangeDates:proof.clock_change_dates||[],
        stopClockStatus:proof.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // JR-East Ominato 2026-11: the 18 officially published D numbers are
  // validated against 36 exact source templates in shared SQL evidence.
  // Historical 9227D/9236D belong to December, not November. The 32xxD
  // "しもきた" services are Rapid even though older SQL calls them Local.
  // November 10–13 track work cancels six numbers. Never project them.
  // KiHa100 series is a *planned model family*, not a confirmed carset;
  // no matching JR-East KiHa100 gallery PNG is currently available.
  if(lineId==="Ominato"&&/^2026-11-/.test(serviceDate)){
    const {data:published,error:publishedErr}=await db
      .from("published_train_number_evidence")
      .select("source_template_id,train_number,calendar_urn,direction_urn,official_source_url,verification_scope")
      .eq("edition","2611").eq("line_key","Ominato")
      .eq("calendar_urn",selectedCalendar);
    if(publishedErr||(published||[]).length!==18)
      throw new Error("OMINATO_2611_OFFICIAL_NUMBER_EVIDENCE_UNAVAILABLE");
    const bySource=new Map((published||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    const allowed=new Set(["Noheji","Kita-Noheji","Arito","Fukoshi",
      "Mutsu-Yokohama","Arihata","Chikagawa","Kanayasawa",
      "Akagawa","Shimokita","Ominato"]);
    const rapidNumbers=new Set(["3225D","3226D","3228D","3230D","3233D"]);
    const cancelled=new Set(["223D","229D","234D","3225D","3228D","3230D"]);
    const maintenance=serviceDate>="2026-11-10"&&serviceDate<="2026-11-13";
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],proof:any=bySource.get(Number(run.source_template_id));
      const number=String(run.train_number||"");
      const dir=String(run.rail_direction||"");
      const num=/^([0-9]{3,4})D$/.exec(number);
      const inbound=dir==="odpt.RailDirection:Inbound";
      const expectedUrl="https://timetables.jreast.co.jp/2611/timetable-v/278"+
        (inbound?"u":"d")+
        (selectedCalendar==="odpt.Calendar:Weekday"?"1":"2")+".html";
      if(!proof||!num||proof.train_number!==number||
         proof.calendar_urn!==selectedCalendar||
         proof.direction_urn!==dir||
         proof.verification_scope!=="train_number_only"||
         proof.official_source_url!==expectedUrl||
         run.network_key!=="odpt.Railway:JR-East.Ominato"||
         run.train_type!=="odpt.TrainType:JR-East.Local"||
         Number(num[1])%2!==(inbound?0:1)||
         !Array.isArray(run.stops)||
         (maintenance&&cancelled.has(number))){
        result.splice(i,1);continue;
      }
      const stops=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      const first=inbound?"Ominato":"Noheji",
        last=inbound?"Noheji":"Ominato";
      if(stops.length<4||stops.length>11||
         stops[0]!==first||stops[stops.length-1]!==last||
         stops.some((st:string)=>!allowed.has(st))||
         new Set(stops).size!==stops.length){
        result.splice(i,1);continue;
      }
      const isRapid=rapidNumbers.has(number);
      if(isRapid){
        run.train_type="odpt.TrainType:JR-East.Rapid";
        run.service_name="しもきた";
      }
      run.train_number_verification="official-2611-ominato-number-sql-rail";
      run.train_number_source_url=proof.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="キハ100系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Ominato",
        trainNumber:number,serviceDate:serviceDate,
        direction:dir,calendar:selectedCalendar,
        trainType:run.train_type,serviceName:isRapid?"しもきた":"",
        sourceTemplateId:Number(run.source_template_id),
        model:"キハ100系",pngReference:null,
        officialSourceUrl:proof.official_source_url,
        stopClockStatus:"historical_not_2611_verified",
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // 奥羽本線 / 山形線 2611: one source-scoped classification for
  // historical OuMain (776) and Yamagata (299). Never treat the old
  // universal "701/E721" label as an exact current vehicle identity.
  // Shinkansen records exist in their own independent line inventories;
  // one-station rows are not positions, and Gono resort dates must be
  // checked against Gono's dedicated official calendar.
  if((lineId==="OuMain"||lineId==="Yamagata")&&/^2026-11-/.test(serviceDate)){
    const {data:scope,error:scopeErr}=await db
      .from("published_oumain_2611_source_scope")
      .select("source_template_id,line_key,calendar_urn,direction_urn,train_number,segment_key,source_stop_keys,model_candidates,service_type_override,source_clock_status,number_source_status,reference_only,actual_vehicle_confirmed,png_reference,verified_november_operating_dates,service_date_source_url")
      .eq("edition","2611").eq("line_key",lineId)
      .eq("calendar_urn",selectedCalendar);
    const scopeCount=lineId==="OuMain"?
      (selectedCalendar==="odpt.Calendar:Weekday"?345:431):
      (selectedCalendar==="odpt.Calendar:Weekday"?137:162);
    if(scopeErr||(scope||[]).length!==scopeCount)
      throw new Error("OU_2611_SOURCE_SCOPE_UNAVAILABLE");
    const bySource=new Map((scope||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    let ogaNumbers=new Map<string,any>();
    let tsugaruNumbers=new Map<number,any>();
    if(lineId==="OuMain"){
      const {data:oga,error:ogaErr}=await db
        .from("published_oga_2611_number_roster")
        .select("train_number,calendar_urn,calendar_scope,excluded_dates,clock_change_dates,reference_only,actual_vehicle_confirmed")
        .eq("edition","2611").eq("line_key","Oga")
        .eq("calendar_urn",selectedCalendar);
      if(ogaErr||(oga||[]).length!==29)
        throw new Error("OU_2611_OGA_THROUGH_PROOF_UNAVAILABLE");
      ogaNumbers=new Map((oga||[]).map((p:any)=>[String(p.train_number),p]));
      const {data:tsugaru,error:tsugaruErr}=await db
        .from("published_oumain_2611_tsugaru_number_roster")
        .select("source_template_id,calendar_urn,direction_urn,train_number,train_type_urn,source_stop_keys,service_name,vehicle_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
        .eq("edition","2611").eq("line_key","OuMain")
        .eq("calendar_urn",selectedCalendar);
      if(tsugaruErr||(tsugaru||[]).length!==6)
        throw new Error("OU_2611_TSUGARU_E751_ROSTER_UNAVAILABLE");
      tsugaruNumbers=new Map((tsugaru||[]).map((r:any)=>
        [Number(r.source_template_id),r]));
    }
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],proof:any=bySource.get(Number(run.source_template_id));
      if(!proof||proof.line_key!==lineId||
        proof.train_number!==run.train_number||
        proof.calendar_urn!==selectedCalendar||
        proof.direction_urn!==run.rail_direction||
        proof.source_clock_status!=="historical_not_2611_verified"||
        proof.number_source_status!=="historical_source_only"||
        proof.reference_only!==true||proof.actual_vehicle_confirmed!==false||
        proof.png_reference!==null||
        run.network_key!=="odpt.Railway:JR-East."+lineId||
        !Array.isArray(run.stops)||!Array.isArray(proof.source_stop_keys)){
        result.splice(i,1);continue;
      }
      const stops=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(stops.length!==proof.source_stop_keys.length||
        stops.some((s:string,k:number)=>s!==proof.source_stop_keys[k])){
        result.splice(i,1);continue;
      }
      // NULL = no date proof yet. A non-null, possibly empty official
      // date set is authoritative. February-only YOKOTE 9459M has no
      // November dates; 9463M only ran November 2–4.
      if(proof.verified_november_operating_dates!==null){
        const dates=proof.verified_november_operating_dates;
        if(!Array.isArray(dates)||
           !dates.some((date:any)=>String(date).slice(0,10)===serviceDate)){
          result.splice(i,1);continue;
        }
      }
      if(["insufficient_source_stops","akita_shinkansen_shared",
          "yamagata_shinkansen_shared","gono_resort_through"]
          .includes(proof.segment_key)){
        result.splice(i,1);continue;
      }
      // Oga services share only their Akita–Oiwake segment. The published
      // Oga roster, not number parity, decides whether it ran that date.
      if(proof.segment_key==="oga_accum_through"){
        const oga=ogaNumbers.get(String(run.train_number));
        const excluded=(oga?.excluded_dates||[]).map((d:any)=>String(d).slice(0,10));
        const changed=(oga?.clock_change_dates||[]).map((d:any)=>String(d).slice(0,10));
        if(!oga||oga.calendar_scope!=="sql_rail_service"||
           oga.reference_only!==true||oga.actual_vehicle_confirmed!==false||
           excluded.includes(serviceDate)||changed.includes(serviceDate)){
          result.splice(i,1);continue;
        }
      }
      // 439M's old full Yuzawa–Yokote clocks are invalid on Nov 9/10.
      // Do not display the abolished partial segment as an intact train.
      if(lineId==="OuMain"&&run.train_number==="439M"&&
         (serviceDate==="2026-11-09"||serviceDate==="2026-11-10")&&
         stops.includes("Yuzawa")&&stops.includes("Yokote")){
        result.splice(i,1);continue;
      }
      // Official 258 d/u 1/2 gives 6 E751 services with exact train
      // numbers in both calendar scopes. Historical stop *clocks* remain
      // unverified; the approved PNG is illustrative, not a carset claim.
      if(proof.segment_key==="tsugaru_limited_express_candidate"){
        const t:any=tsugaruNumbers.get(Number(run.source_template_id));
        const name:string={
          "2021M":"スーパーつがる1号","2022M":"スーパーつがる2号",
          "2041M":"つがる41号","2042M":"つがる42号",
          "2043M":"つがる43号","2044M":"つがる44号"
        }[String(run.train_number)]||"";
        const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
        const officialUrl="https://timetables.jreast.co.jp/2611/timetable-v/258"+
          (inbound?"u":"d")+
          (selectedCalendar==="odpt.Calendar:Weekday"?"1":"2")+".html";
        if(!t||!name||t.train_number!==run.train_number||
          t.calendar_urn!==selectedCalendar||
          t.direction_urn!==run.rail_direction||
          t.train_type_urn!=="odpt.TrainType:JR-East.LimitedExpress"||
          t.service_name!==name||t.vehicle_model!=="E751系"||
          t.png_reference!=="../images/列车/JR東日本/JR東日本_E751系.png"||
          t.official_source_url!==officialUrl||
          t.stop_clock_status!=="historical_not_2611_verified"||
          t.reference_only!==true||t.actual_vehicle_confirmed!==false||
          !Array.isArray(t.source_stop_keys)||
          t.source_stop_keys.length!==stops.length||
          t.source_stop_keys.some((s:string,j:number)=>s!==stops[j])||
          stops[0]!==(inbound?"Aomori":"Akita")||
          stops[stops.length-1]!==(inbound?"Akita":"Aomori")){
          result.splice(i,1);continue;
        }
        run.train_type=t.train_type_urn;
        run.service_name=t.service_name;
        run.train_number_verification="official-2611-oumain-tsugaru-e751-sql";
        run.train_number_source_url=t.official_source_url;
        run.vehicle_type_label=null;
        run.vehicle_type_candidates=t.vehicle_model;
        run.vehicle_candidate_artwork_path=null;
        run.vehicle_candidate_artwork_status=null;
        run.vehicle_artwork_path=null;
        run.vehicle_plan_confirmed=false;
        run.vehicle_evidence_source=null;
        run.vehicle_evidence_source_id=null;
        run.vehicle_evidence_url=null;
        run.published_number_fleet_reference={
          source:"sql-jreast-2611-number-roster",lineId:"OuMain",
          trainNumber:run.train_number,serviceDate:serviceDate,
          direction:run.rail_direction,calendar:selectedCalendar,
          trainType:run.train_type,segmentKey:"akita_aomori_tsugaru_e751",
          serviceName:t.service_name,
          sourceTemplateId:Number(run.source_template_id),
          sourceStopKeys:t.source_stop_keys,
          plannedCandidates:["E751系"],
          model:t.vehicle_model,pngReference:t.png_reference,
          officialSourceUrl:t.official_source_url,
          stopClockStatus:t.stop_clock_status,
          referenceOnly:true,actualVehicleConfirmed:false
        };
        continue;
      }
      if(proof.service_type_override){
        run.train_type="odpt.TrainType:JR-East."+proof.service_type_override;
      }
      // Candidate model != observed physical trainset. No family PNG can
      // be drawn solely from a historical source or these number ranges.
      if(!run.vehicle_plan_confirmed&&!run.vehicle_evidence_source){
        run.vehicle_type_label=null;
        run.vehicle_type_candidates=Array.isArray(proof.model_candidates)&&
          proof.model_candidates.length?proof.model_candidates.join(" / "):null;
        run.vehicle_candidate_artwork_path=null;
        run.vehicle_candidate_artwork_status=null;
        run.vehicle_artwork_path=null;
        run.vehicle_plan_confirmed=false;
      }
      run.train_number_verification="historical-source-only-ou-2611";
      run.published_number_fleet_reference={
        source:"sql-ou-2611-source-scope",lineId:lineId,
        trainNumber:run.train_number,serviceDate:serviceDate,
        calendar:selectedCalendar,direction:run.rail_direction,
        sourceTemplateId:Number(run.source_template_id),
        segmentKey:proof.segment_key,
        plannedCandidates:proof.model_candidates||[],
        model:null,pngReference:null,
        stopClockStatus:"historical_not_2611_verified",
        officialNumberVerified:false,referenceOnly:true,
        actualVehicleConfirmed:false
      };
    }
  }
  // JR-East Ofunato 2611: original SQL combines two DIFFERENT modes
  // under line ID Ofunato: 123 BRT F/K entries, 34 KiHa110 rail D
  // entries over two calendars, and two KiHa100 POKEMON holiday D entries.
  // No BRT bus can become a train position or inherit a railway PNG.
  // The historic SQL labelled Pokemon "Local/キハ110系"; JR 269 u2/d2
  // publishes it as a Rapid with KiHa100 speciality stock. No Pokemon
  // PNG exists in the library: preserve its actual *number* and railway
  // stop plan without inventing an image, livery or physical car identity.
  // Hinabi 9327D/9336D is FEBRUARY 2027, not November 2026.
  if(lineId==="Ofunato" && /^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterErr},{data:ranges,error:rangeErr}]=
      await Promise.all([
        db.from("published_ofunato_2611_number_roster")
          .select("source_template_id,train_number,calendar_urn,direction_urn,original_train_type_urn,published_train_type_urn,transport_scope,operating_dates,source_stop_keys,vehicle_model,png_reference,service_name,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Ofunato")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Ofunato")
          .eq("segment_key","ichinoseki_kesennuma_regular_rail")
      ]);
    if(rosterErr||rangeErr)throw(rosterErr||rangeErr);
    const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?83:76;
    if((roster||[]).length!==expectedCount||(ranges||[]).length!==1)
      throw new Error("OFUNATO_2611_RAIL_BRT_NUMBER_ROSTER_UNAVAILABLE");
    const byTemplate=new Map((roster||[]).map((r:any)=>
      [Number(r.source_template_id),r]));
    const allowed=new Set(["Ichinoseki","Mataki","Rikuchu-Kanzaki",
      "Iwanoshita","Rikuchu-Matsukawa","Geibikei","Shibajuku",
      "Surisawa","Senmaya","Konashi","Yagoshi","Orikabe",
      "Niitsuki","Kesennuma"]);
    const pokemonDates=new Set(["2026-11-01","2026-11-03",
      "2026-11-07","2026-11-08","2026-11-14","2026-11-15",
      "2026-11-21","2026-11-22","2026-11-23","2026-11-28",
      "2026-11-29"]);
    const pokemonDown=["Ichinoseki","Rikuchu-Matsukawa",
      "Geibikei","Senmaya","Kesennuma"];
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],proof:any=
        byTemplate.get(Number(run.source_template_id));
      // Including F, K, duplicate or unproved D: no railway run.
      if(!proof||proof.transport_scope==="brt_only"||
         run.network_key!=="odpt.Railway:JR-East.Ofunato"||
         proof.calendar_urn!==selectedCalendar||
         run.train_number!==proof.train_number||
         run.rail_direction!==proof.direction_urn||
         run.train_type!==proof.original_train_type_urn||
         proof.reference_only!==true||
         proof.actual_vehicle_confirmed!==false||
         !Array.isArray(run.stops)||
         !Array.isArray(proof.source_stop_keys)){
        result.splice(i,1);continue;
      }
      const actualStops=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(actualStops.length!==proof.source_stop_keys.length||
         actualStops.some((key:string,j:number)=>
           key!==proof.source_stop_keys[j]||!allowed.has(key))){
        result.splice(i,1);continue;
      }
      const match=/^([0-9]+)D$/.exec(String(run.train_number||""));
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      if(!match||Number(match[1])%2!==(inbound?0:1)){
        result.splice(i,1);continue;
      }
      const pokemon=proof.transport_scope==="rail_pokemon";
      if(pokemon){
        const operated=(proof.operating_dates||[]).map((d:any)=>
          String(d).slice(0,10));
        const expectedStops=inbound?[...pokemonDown].reverse():pokemonDown;
        if(selectedCalendar!=="odpt.Calendar:SaturdayHoliday"||
           !pokemonDates.has(serviceDate)||
           !operated.includes(serviceDate)||
           operated.length!==pokemonDates.size||
           operated.some((date:string)=>!pokemonDates.has(date))||
           !["8327D","8336D"].includes(run.train_number)||
           proof.published_train_type_urn!=="odpt.TrainType:JR-East.Rapid"||
           proof.vehicle_model!=="キハ100系（POKÉMON with YOU）"||
           proof.png_reference!==null||
           actualStops.length!==5||
           actualStops.some((key:string,j:number)=>key!==expectedStops[j])){
          result.splice(i,1);continue;
        }
        run.train_type="odpt.TrainType:JR-East.Rapid";
        run.service_name="ポケモントレイン気仙沼号";
        // No KiHa100 Pokemon artwork exists. Never promote a generic
        // KiHa110 gallery image, even if the source's historic label did.
        run.vehicle_historical_source_label=null;
        run.vehicle_mapping_level=null;
      }else if(proof.transport_scope==="rail_regular"){
        const length=run.train_number==="322D"?9:14;
        const n=Number(match[1]);
        const approved=(ranges||[]).some((r:any)=>
          r.requires_exact_roster===true &&
          r.segment_key==="ichinoseki_kesennuma_regular_rail"&&
          n>=r.min_number&&n<=r.max_number&&r.suffix==="D"&&
          r.vehicle_model===proof.vehicle_model&&
          r.png_reference===proof.png_reference);
        if(length!==actualStops.length||!approved||
           proof.vehicle_model!=="キハ110系"||
           proof.png_reference!=="../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png"||
           proof.published_train_type_urn!=="odpt.TrainType:JR-East.Local"||
           !/^[0-9]{3}D$/.test(run.train_number)){
          result.splice(i,1);continue;
        }
      }else{result.splice(i,1);continue;}
      if(proof.stop_clock_status!=="historical_not_2611_verified"){
        result.splice(i,1);continue;
      }
      run.train_number_verification="official-2611-ofunato-rail-number-date";
      run.train_number_source_url=proof.official_source_url;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=proof.vehicle_model;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_artwork_path=null;
      run.vehicle_plan_confirmed=false;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Ofunato",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:proof.calendar_urn,
        trainType:run.train_type,segmentKey:"ichinoseki_kesennuma_rail",
        transportScope:proof.transport_scope,
        sourceTemplateId:Number(proof.source_template_id),
        sourceStopKeys:proof.source_stop_keys,
        plannedCandidates:[proof.vehicle_model],
        model:proof.vehicle_model,pngReference:proof.png_reference,
        serviceName:proof.service_name||"",
        officialSourceUrl:proof.official_source_url,
        operatingDates:pokemon?(proof.operating_dates||[]):[],
        stopClockStatus:proof.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Kosei: historical 180 source runs, but ONLY 179 M / MH service
  // rows have a credible normal fleet family. The Saturday-only source
  // 9017DH is a D train mislabeled Local by the historical import and
  // MUST NOT be drawn as an ordinary 2026-11 train; official 9017D
  // is a dated seasonal Hanaakari, not a standing Local.
  // M+H weekend is a calendar marker, not an operation/carset code.
  if(lineId==="Kosei"&&/^2026-11-/.test(serviceDate)){
    const {data:roster,error:scopeError}=await db
      .from("published_jrwest_kosei_2611_source_fleet")
      .select("source_template_id,edition,line_key,railway_urn,source_train_number,historical_public_number,calendar_urn,direction_urn,train_type_urn,corridor_segment,source_stop_keys,candidate_models,candidate_png_paths,source_path,source_fleet_url,source_route_url,timetable_validity,reference_only,number_date_verified,actual_vehicle_confirmed,authorizes_png")
      .eq("edition","2611").eq("line_key","Kosei")
      .eq("calendar_urn",selectedCalendar);
    if(scopeError)throw scopeError;
    const expected=selectedCalendar==="odpt.Calendar:Weekday"?90:89;
    if((roster||[]).length!==expected)
      throw new Error("JRWEST_KOSEI_2611_SOURCE_FLEET_UNAVAILABLE");
    const bySource=new Map((roster||[]).map((a:any)=>
      [Number(a.source_template_id),a]));
    if(bySource.size!==expected)
      throw new Error("JRWEST_KOSEI_2611_DUPLICATE_SOURCE_ID");
    const corridor=["Kyoto","Yamashina","Ootsu-Kyou","Karasaki",
      "Hieizan-Sakamoto","Ogoto-Onsen","Katata","Ono-Kansai",
      "Wani","Hourai","Shiga","Hira","Oumi-Maiko","Kitakomatsu",
      "Oumi-Takashima","Adogawa","Shin'asahi","Oumiimazu",
      "Oumi-Naka-Shou","Makino","Nagahara-Kansai","Omi-Shiotsu"];
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const p:any=bySource.get(Number(run.source_template_id));
      if(!p){result.splice(i,1);continue;}
      const number=String(run.train_number||"");
      const m=/^([0-9]{3,4}M)(H?)$/.exec(number);
      const isNorth=run.rail_direction==="odpt.RailDirection:Inbound";
      const isSouth=run.rail_direction==="odpt.RailDirection:Outbound";
      const kind=String(run.train_type||"").split(".").pop();
      const stops=Array.isArray(run.stops)?run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()):[];
      const idx=stops.map((station:string)=>corridor.indexOf(station));
      const northerlyShort=kind==="Local"&&
        ["Omi-Shiotsu","Nagahara-Kansai"].includes(stops[0])&&
        stops[stops.length-1]==="Oumiimazu";
      const group=northerlyShort?"north_shuttle":kind==="Local"?"other_local":
        kind==="Rapid"?"rapid":"special_rapid";
      const models=group==="north_shuttle"?"223系|225系|521系":
        group==="other_local"?"221系|223系|225系":"223系|225系";
      const url=group==="north_shuttle"
        ?"https://train.mi-ktt.ne.jp/rosen/koseisen/"
        :"https://www.westjr.co.jp/fan/paper/local/";
      if(!m||(!isNorth&&!isSouth)||stops.length<2||
         (selectedCalendar==="odpt.Calendar:SaturdayHoliday")!==(m[2]==="H")||
         run.network_key!=="odpt.Railway:JR-West.Kosei"||
         !["Local","Rapid","SpecialRapid"].includes(kind)||
         idx.some((x:number)=>x<0)||
         idx.some((x:number,j:number)=>j>0&&
           (isSouth?x<=idx[j-1]:x>=idx[j-1]))||
         p.line_key!=="Kosei"||p.railway_urn!==run.network_key||
         p.source_train_number!==number||
         p.historical_public_number!==m[1]||
         p.calendar_urn!==selectedCalendar||
         p.direction_urn!==run.rail_direction||
         p.train_type_urn!==run.train_type||
         p.corridor_segment!==group||p.source_path!=="data/timetables/Kosei-manual.js"||
         p.timetable_validity!=="undated_not_current_verified"||
         p.reference_only!==true||p.number_date_verified!==false||
         p.actual_vehicle_confirmed!==false||p.authorizes_png!==false||
         p.source_fleet_url!==url||
         p.source_route_url!=="https://www.train-guide.westjr.co.jp/kosei.html"||
         !Array.isArray(p.source_stop_keys)||
         p.source_stop_keys.length!==stops.length||
         stops.some((k:string,j:number)=>p.source_stop_keys[j]!==k)||
         !Array.isArray(p.candidate_models)||
         p.candidate_models.join("|")!==models||
         !Array.isArray(p.candidate_png_paths)||
         p.candidate_png_paths.length!==0){
        result.splice(i,1);continue;
      }
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=p.candidate_models.join(" / ");
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.published_number_fleet_reference={
        source:"sql-jrwest-kosei-2611-source-family",
        lineId:"Kosei",trainNumber:number,sourceTrainNumber:number,
        historicalNumber:m[1],calendar:p.calendar_urn,
        direction:p.direction_urn,trainType:p.train_type_urn,
        serviceDate,sourceTemplateId:Number(p.source_template_id),
        corridorSegment:p.corridor_segment,
        sourceStopKeys:p.source_stop_keys,
        candidateModels:p.candidate_models,
        candidateAssets:p.candidate_png_paths,
        fleetSourceUrl:p.source_fleet_url,
        routeSourceUrl:p.source_route_url,
        timetableValidity:p.timetable_validity,
        referenceOnly:true,numberDateVerified:false,
        actualVehicleConfirmed:false,authorizesPNG:false
      };
    }
  }

  // JR-West Nara Line: the existing 331 historical source rows remain
  // immutable. ONLY 21 source-template IDs are approved for November
  // 2026 after full original-stop comparisons. The historical source
  // wrongly calls 2636M/2646M (Miyakoji Rapid) and seasonal 8061M/
  // 8062M (Inishie limited express) Local; correct PUBLIC service type
  // only after an EXACT source/calendar/stop-clock match. Never infer
  // actual carsets, fleet PNG, or other 26xx/806x service dates.
  if(lineId==="Nara"&&/^2026-11-\d{2}$/.test(serviceDate)){
    const {data:proofs,error:proofError}=await db
      .from("published_jrwest_nara_2611_clock_evidence")
      .select("source_template_id,source_train_number,published_train_number,calendar_urn,direction_urn,source_train_type_urn,published_train_type,published_train_type_label,published_service_name,source_stop_count,official_source_url,valid_from,valid_to,actual_vehicle_confirmed,authorizes_png,verified_source_match")
      .eq("calendar_urn",selectedCalendar);
    if(proofError)throw proofError;
    const expectedNara=selectedCalendar==="odpt.Calendar:Weekday"?9:12;
    if((proofs||[]).length!==expectedNara||
       new Set((proofs||[]).map((p:any)=>Number(p.source_template_id))).size!==expectedNara)
      throw new Error("JRWEST_NARA_2611_CLOCK_PROOF_COVERAGE_CHANGED");
    const naraBySource=new Map((proofs||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    for(const run of result){
      const p:any=naraBySource.get(Number(run.source_template_id));
      if(!p)continue;
      const original:any[]=byTemplate.get(Number(run.source_template_id))||[];
      const stops:any[]=Array.isArray(run.stops)?run.stops:[];
      const officialType=p.published_train_type==="Local"?"Local"
        :p.published_train_type==="MiyakojiRapid"?"Rapid"
        :p.published_train_type==="LimitedExpress"?"LimitedExpress":null;
      const expectedLabel=p.published_train_type==="Local"?"普通"
        :p.published_train_type==="MiyakojiRapid"?"みやこ路快速"
        :p.published_train_type==="LimitedExpress"?"特急":null;
      const expectedCount=p.published_train_type==="Local"?21
        :p.published_train_type==="MiyakojiRapid"?11
        :p.published_train_type==="LimitedExpress"?3:null;
      if(p.verified_source_match!==true||
         p.calendar_urn!==selectedCalendar||
         String(p.valid_from).slice(0,10)>serviceDate||
         String(p.valid_to).slice(0,10)<serviceDate||
         p.actual_vehicle_confirmed!==false||p.authorizes_png!==false||
         !officialType||p.published_train_type_label!==expectedLabel||
         p.source_train_type_urn!=="odpt.TrainType:JR-West.Local"||
         p.published_train_number!==String(p.source_train_number).replace(/H$/,"")||
         !/^[0-9]{3,4}M$/.test(p.published_train_number)||
         run.canonical_group_evidence!=="source_only"||
         run.network_key!=="odpt.Railway:JR-West.Nara"||
         run.train_number!==p.source_train_number||
         run.train_type!==p.source_train_type_urn||
         run.rail_direction!==p.direction_urn||
         Number(p.source_stop_count)!==expectedCount||
         stops.length!==expectedCount||original.length!==expectedCount||
         original.some((o:any,i:number)=>
           stationKey(String(o.station_urn||o.departure_station_urn||o.arrival_station_urn||""))!==
             stationKey(String(stops[i]?.station_urn||""))||
           sqlTime(o.arrival_clock)!==stops[i]?.arrival_time||
           sqlTime(o.departure_clock)!==stops[i]?.departure_time))
        throw new Error("JRWEST_NARA_2611_CLOCK_SOURCE_CONFLICT");
      run.published_train_number=p.published_train_number;
      run.published_train_type="odpt.TrainType:JR-West."+officialType;
      run.published_train_type_label=p.published_train_type_label;
      run.train_type="odpt.TrainType:JR-West."+officialType;
      if(p.published_service_name)run.service_name=p.published_service_name;
      run.train_number_verification="official-2611-nara-source-stop-clock";
      run.train_number_source_url=p.official_source_url;
      run.timetable_validity="date_verified";
      run.timetable_date_verified=true;
      run.plan_source="official-2611-nara-original-source-clock-verified";
      // A service's public train type is NOT its precise physical carset.
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=null;
      run.vehicle_mapping_level="unresolved";
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_evidence_source=null;
      run.vehicle_evidence_source_id=null;
      run.vehicle_evidence_url=null;
      run.published_number_fleet_reference={
        source:"sql-jrwest-nara-2611-original-clock",lineId:"Nara",
        sourceTemplateId:Number(p.source_template_id),
        sourceTrainNumber:p.source_train_number,
        calendar:p.calendar_urn,direction:p.direction_urn,
        publicTrainNumber:p.published_train_number,
        publicTrainType:p.published_train_type,
        publicTrainTypeLabel:p.published_train_type_label,
        sourceStopCount:expectedCount,
        officialSourceUrl:p.official_source_url,
        referenceOnly:true,stopClocksVerified:true,
        actualVehicleConfirmed:false,authorizesPng:false
      };
    }
  }

  // Date-verified Kosei source-only locals, including north/inbound:
  // the 83 source-only original 4/5/7/13/18/21/22-stop clocks were independently
  // compared with the official November 2026 issue. The SQL invoker
  // view re-hashes the ORIGINAL timetable stops on every request.
  // Never relabel an unverified source run, infer a physical carset,
  // render a PNG, or treat the holiday importer H as a train number.
  if(lineId==="Kosei"&&/^2026-11-\d{2}$/.test(serviceDate)){
    const {data:clocks,error:clockError}=await db
      .from("published_jrwest_kosei_2611_clock_evidence")
      .select("source_template_id,source_train_number,published_train_number,calendar_urn,direction_urn,official_source_url,valid_from,valid_to,actual_vehicle_confirmed,authorizes_png,verified_source_match,stop_count")
      .eq("calendar_urn",selectedCalendar);
    if(clockError)throw clockError;
    const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?42:41;
    if((clocks||[]).length!==expectedCount||
       new Set((clocks||[]).map((p:any)=>Number(p.source_template_id))).size!==expectedCount)
      throw new Error("JRWEST_KOSEI_2611_VERIFIED_CLOCK_COVERAGE_CHANGED");
    const byClockSource=new Map((clocks||[]).map((p:any)=>
      [Number(p.source_template_id),p]));
    for(const run of result){
      const p:any=byClockSource.get(Number(run.source_template_id));
      if(!p)continue;
      const proof:any=run.published_number_fleet_reference;
      const stops=Array.isArray(run.stops)?run.stops:[];
      if(p.verified_source_match!==true||
         p.actual_vehicle_confirmed!==false||p.authorizes_png!==false||
         String(p.valid_from).slice(0,10)>serviceDate||
         String(p.valid_to).slice(0,10)<serviceDate||
         p.calendar_urn!==selectedCalendar||
         run.canonical_group_evidence!=="source_only"||
         run.network_key!=="odpt.Railway:JR-West.Kosei"||
         run.train_type!=="odpt.TrainType:JR-West.Local"||
         run.rail_direction!==p.direction_urn||
         run.train_number!==p.source_train_number||
         p.published_train_number!==String(p.source_train_number).replace(/H$/,"")||
         !proof||proof.source!=="sql-jrwest-kosei-2611-source-family"||
         proof.sourceTemplateId!==Number(p.source_template_id)||
         !Array.isArray(proof.sourceStopKeys)||
         ![4,5,7,13,18,21,22].includes(stops.length)||
         Number(p.stop_count)!==stops.length||
         proof.sourceStopKeys.length!==stops.length||
         stops.some((st:any,i:number)=>
           String(st.station_urn||"").split(".").pop()!==proof.sourceStopKeys[i])||
         stops.filter((st:any)=>st.arrival_time||st.departure_time).length!==stops.length)
        throw new Error("JRWEST_KOSEI_2611_VERIFIED_CLOCK_SOURCE_CONFLICT");
      // Keep the source identifier (including importer H) for existing
      // verifier and canonical lookups; expose the REAL public number
      // separately, with individually certified original 4/5/7/13/18/21/22-stop clocks.
      run.published_train_number=p.published_train_number;
      run.train_number_verification="official-2611-kosei-source-stop-clock";
      run.train_number_source_url=p.official_source_url;
      run.timetable_validity="date_verified";
      run.timetable_date_verified=true;
      run.plan_source="official-2611-kosei-source-clock-verified";
      run.published_number_fleet_reference.publishedNumber=p.published_train_number;
      run.published_number_fleet_reference.officialStopClockSourceUrl=p.official_source_url;
      run.published_number_fleet_reference.stopClocksVerified=true;
      // Preserve vehiclePlan UNCONFIRMED_FLEET, never authorize a PNG.
    }
  }

  // JR-West Kyoto/Kobe through corridor: JR京都線 is Kyoto–Osaka,
  // JR神戸線 is Osaka–Himeji. Imported JR-West TokaidoKansai has 46
  // undated compound-ID trips; SanyoMain carries 20 additional relevant
  // locals/rapids from Hyougo or Akashi (the rest is NOT this corridor).
  // Number suffixes C/T/M do NOT certify real 2026 vehicles or clocks.
  // JR-West 221 rapid stock was transferred off by March 2024. Keep
  // 207/321 for C locals and 223/225 for T/M rapids as FLEET CANDIDATES.
  if((lineId==="TokaidoKansai"||lineId==="SanyoMain")&&
     /^2026-11-/.test(serviceDate)){
    const {data:roster,error:rosterError}=await db
      .from("published_jrwest_kyoto_kobe_2611_source_fleet")
      .select("source_template_id,source_line_key,candidate_segment,source_train_id,source_public_number_suffix,calendar_urn,direction_urn,train_type_urn,service_family,source_stop_keys,candidate_models,candidate_gallery_models,candidate_png_paths,fleet_source_url,timetable_source_path,timetable_validity,number_date_verified,reference_only,actual_vehicle_confirmed,authorizes_png,official_calendar_conflict,official_calendar_urn,official_calendar_source_url")
      .eq("edition","2611").eq("source_line_key",lineId)
      .eq("calendar_urn",selectedCalendar);
    if(rosterError)throw rosterError;
    const expected=lineId==="TokaidoKansai"?19:
      (selectedCalendar==="odpt.Calendar:Weekday"?11:9);
    if((roster||[]).length!==expected)
      throw new Error("JRWEST_KYOTO_KOBE_2611_SOURCE_FLEET_UNAVAILABLE");
    const bySource=new Map((roster||[]).map((r:any)=>
      [Number(r.source_template_id),r]));
    if(bySource.size!==expected)
      throw new Error("JRWEST_KYOTO_KOBE_DUPLICATE_SOURCE_ID");
    // A legacy source whose calendar contradicts the official 2611
    // train listing must not produce a phantom weekday/holiday position.
    const expectedCalendarConflict=lineId==="TokaidoKansai"
      ?(selectedCalendar==="odpt.Calendar:Weekday"
        ?["500310-1866500-3506M","odpt.Calendar:SaturdayHoliday",
          "https://timetable.jr-odekake.net/train-timetable/173162?date=20261024"]
        :["500310-3536200-3450M","odpt.Calendar:Weekday",
          "https://timetable.jr-odekake.net/train-timetable/321991?date=20261029"])
      :null;
    const calendarConflicts=(roster||[]).filter((p:any)=>
      p.official_calendar_conflict===true);
    if(calendarConflicts.length!==(expectedCalendarConflict?1:0)||
       calendarConflicts.some((p:any)=>
         p.source_train_id!==expectedCalendarConflict?.[0]||
         p.official_calendar_urn!==expectedCalendarConflict?.[1]||
         p.official_calendar_source_url!==expectedCalendarConflict?.[2]||
         p.calendar_urn!==selectedCalendar||
         p.source_public_number_suffix!==
           String(p.source_train_id||"").split("-").pop()||
         p.authorizes_png!==false))
      throw new Error("JRWEST_KYOTO_KOBE_2611_CALENDAR_SOURCE_CONFLICT");
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const pub:any=bySource.get(Number(run.source_template_id));
      if(!pub)continue; // OTHER SanyoMain districts / express / A-seat
      if(pub.official_calendar_conflict===true){
        // The authoritative source day differs from the historical
        // calendar; do not move this old trip into the other calendar.
        if(!expectedCalendarConflict||
           run.train_number!==expectedCalendarConflict[0])
          throw new Error("JRWEST_KYOTO_KOBE_2611_CALENDAR_SOURCE_CONFLICT");
        result.splice(i,1);
        continue;
      }
      const n=String(run.train_number||"");
      const match=/^([0-9]{6})-([0-9]{4,7})-([0-9]{1,4}[CMT])$/.exec(n);
      const dir=run.rail_direction;
      const isLocal=run.train_type==="odpt.TrainType:JR-West.Local";
      const isRapid=run.train_type==="odpt.TrainType:JR-West.Rapid";
      const family=isLocal?"local_c":"regional_rapid_t_m";
      const suffix=match?match[3]:"",lastLetter=suffix.slice(-1);
      const expectedModels=isLocal?"207系|321系":"223系|225系";
      const expectedSource=lineId==="TokaidoKansai"
        ?"data/timetables/TokaidoKansai-manual.js"
        :"data/timetables/SanyoMain-manual.js";
      const keys=Array.isArray(run.stops)?run.stops.map((x:any)=>
        String(x.station_urn||"").split(".").pop()):[];
      const galleryExpected=isLocal&&lineId==="TokaidoKansai"
        ?["JR西日本207系（NK）","JR西日本207系（Y2）","JR西日本321系"]
        :[];
      const pathsExpected=isLocal&&lineId==="TokaidoKansai"
        ?["../images/列车/JR西日本/JR西日本_207系_NK.png",
          "../images/列车/JR西日本/JR西日本_207系_Y2.png",
          "../images/列车/JR西日本/JR西日本_321系.png"]
        :[];
      const fleetSourceExpected=isLocal
        ?"https://www.westjr.co.jp/fan/paper/local/"
        :"https://www.westjr.co.jp/press/article/2020/02/page_15645.html";
      if(!match||!["500310","500300"].includes(match[1])&&
           lineId==="TokaidoKansai"||
         !match||lineId==="SanyoMain"&&match[1]!=="710100"||
         (dir!=="odpt.RailDirection:Inbound"&&
          dir!=="odpt.RailDirection:Outbound")||
         Number(suffix.slice(0,-1))%2!==
           (dir==="odpt.RailDirection:Inbound"?0:1)||
         run.network_key!==
           (lineId==="TokaidoKansai"
            ?"odpt.Railway:JR-West.TokaidoKansai"
            :"odpt.Railway:JR-West.SanyoMain")||
         (!isLocal&&!isRapid)||
         (isLocal&&lastLetter!=="C")||
         (isRapid&&!["T","M"].includes(lastLetter))||
         pub.source_line_key!==lineId||
         pub.candidate_segment!==
          (lineId==="TokaidoKansai"?"kyoto_osaka_kobe":"kobe_himeji")||
         pub.source_train_id!==n||
         pub.source_public_number_suffix!==suffix||
         pub.calendar_urn!==selectedCalendar||
         pub.direction_urn!==dir||pub.train_type_urn!==run.train_type||
         pub.service_family!==family||pub.timetable_source_path!==expectedSource||
         pub.timetable_validity!=="undated_not_current_verified"||
         pub.fleet_source_url!==fleetSourceExpected||
         pub.number_date_verified!==false||
         pub.reference_only!==true||pub.actual_vehicle_confirmed!==false||
         pub.authorizes_png!==false||
         !Array.isArray(pub.source_stop_keys)||keys.length<2||
         keys.length!==pub.source_stop_keys.length||
         keys.some((k:string,j:number)=>k!==pub.source_stop_keys[j])||
         lineId==="SanyoMain"&&
          (!["Hyougo","Akashi"].includes(keys[0])||
           !["Suma","Nishi-Akashi","Himeji","Amiboshi"].includes(keys[keys.length-1]))||
         !Array.isArray(pub.candidate_models)||
         pub.candidate_models.join("|")!==expectedModels||
         !Array.isArray(pub.candidate_gallery_models)||
         pub.candidate_gallery_models.join("|")!==galleryExpected.join("|")||
         !Array.isArray(pub.candidate_png_paths)||
         pub.candidate_png_paths.join("|")!==pathsExpected.join("|")){
        // Historical clock remains historical; never add a guessed fleet.
        continue;
      }
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=pub.candidate_models.join(" / ");
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      // Distinguish legacy composite source IDs from public train numbers.
      // NO promotion to `official_number_verified`.
      run.published_number_fleet_reference={
        source:"sql-jrwest-kyoto-kobe-2611-source-family",
        lineId,sourceTrainId:n,sourcePublicNumberSuffix:suffix,
        serviceDate,calendar:selectedCalendar,direction:dir,
        sourceTemplateId:Number(pub.source_template_id),
        trainType:pub.train_type_urn,serviceFamily:family,
        sourceSegment:pub.candidate_segment,
        sourceStopKeys:pub.source_stop_keys,
        candidateModels:pub.candidate_models,
        candidateGalleryModels:pub.candidate_gallery_models,
        candidateAssets:pub.candidate_png_paths,
        fleetSourceUrl:pub.fleet_source_url,
        timetableSourcePath:pub.timetable_source_path,
        timetableValidity:pub.timetable_validity,
        numberDateVerified:false,referenceOnly:true,
        actualVehicleConfirmed:false,authorizesPNG:false
      };
    }
  }

  // Forty-five JR-West Kyoto/Kobe/Sanyo 2026-11 source-only rows match the
  // official local/new-rapid timetable, not just a historical suffix.
  // Keep canonical source IDs and legacy fleet-candidate proofs intact:
  // these are published service timetables, never actual dispatch cars.
  if((lineId==="TokaidoKansai"||lineId==="SanyoMain")&&/^2026-11-\d{2}$/.test(serviceDate)){
    const {data:verified,error:verifiedError}=await db
      .from("published_jrwest_kyoto_kobe_2611_clock_evidence")
      .select("source_template_id,source_line_key,source_train_id,source_public_number_suffix,calendar_urn,direction_urn,train_type_urn,official_train_number,official_source_url,official_public_train_type,official_stop_count,number_date_verified,actual_vehicle_confirmed,authorizes_png,verified_source_match")
      .eq("source_line_key",lineId)
      .eq("calendar_urn",selectedCalendar);
    if(verifiedError)throw verifiedError;
    const expected=lineId==="SanyoMain"
      ?(selectedCalendar==="odpt.Calendar:Weekday"?8:6)
      :(selectedCalendar==="odpt.Calendar:Weekday"?15:16);
    if((verified||[]).length!==expected||
       new Set((verified||[]).map((r:any)=>Number(r.source_template_id))).size!==expected)
      throw new Error("JRWEST_KYOTO_KOBE_2611_CLOCK_PROOF_COVERAGE_CHANGED");
    const byOriginalSource=new Map((verified||[]).map((r:any)=>
      [Number(r.source_template_id),r]));
    for(const run of result){
      const p:any=byOriginalSource.get(Number(run.source_template_id));
      if(!p)continue;
      const candidate:any=run.published_number_fleet_reference;
      const stops=Array.isArray(run.stops)?run.stops:[];
      const certifiedType=p.train_type_urn==="odpt.TrainType:JR-West.Local"
        ?"Local":p.train_type_urn==="odpt.TrainType:JR-West.Rapid"
        ?(lineId==="SanyoMain"&&p.official_train_number==="717M"
            ?"Rapid":/^[0-9]{3,4}T$/.test(p.official_train_number)
            ?"Rapid":"SpecialRapid"):null;
      const permittedStopCount=certifiedType==="Local"
        ?(lineId==="SanyoMain"?[5,11]:[16,19,25,32,33]).includes(p.official_stop_count)
        :certifiedType==="Rapid"
        ?(lineId==="SanyoMain"
           ?(["717M","815T"].includes(p.official_train_number)&&p.official_stop_count===17)
           :p.official_stop_count===18)
        :certifiedType==="SpecialRapid"&&
          p.official_stop_count===(lineId==="SanyoMain"?4:7);
      if(p.verified_source_match!==true||
         p.source_line_key!==lineId||
         p.calendar_urn!==selectedCalendar||
         !certifiedType||
         p.official_public_train_type!==certifiedType||
         !permittedStopCount||
         p.number_date_verified!==false||
         p.actual_vehicle_confirmed!==false||p.authorizes_png!==false||
         run.network_key!=="odpt.Railway:JR-West."+lineId||
         run.canonical_group_evidence!=="source_only"||
         run.train_type!==p.train_type_urn||
         run.train_number!==p.source_train_id||
         run.rail_direction!==p.direction_urn||
         !/^(?:\d{3,4}M|\d{3,4}[CT])$/.test(p.official_train_number)||
         !p.official_train_number.endsWith(
           certifiedType==="Local"?"C":
           certifiedType==="Rapid"&&lineId==="SanyoMain"&&
             p.official_train_number==="717M"?"M":
           certifiedType==="Rapid"?"T":"M")||
         p.official_train_number!==p.source_public_number_suffix||
         !candidate||candidate.source!=="sql-jrwest-kyoto-kobe-2611-source-family"||
         candidate.sourceTrainId!==p.source_train_id||
         candidate.sourceTemplateId!==Number(p.source_template_id)||
         !Array.isArray(candidate.sourceStopKeys)||
         stops.length!==p.official_stop_count||
         candidate.sourceStopKeys.length!==p.official_stop_count||
         stops.some((st:any,i:number)=>
           String(st.station_urn||"").split(".").pop()!==candidate.sourceStopKeys[i])||
         stops.filter((st:any)=>st.arrival_time||st.departure_time).length!==p.official_stop_count)
        throw new Error("JRWEST_KYOTO_KOBE_2611_CLOCK_PROOF_CONFLICT");
      run.published_train_number=p.official_train_number;
      run.published_train_type="odpt.TrainType:JR-West."+certifiedType;
      run.train_number_verification="official-2611-kyoto-kobe-source-stop-clock";
      run.train_number_source_url=p.official_source_url;
      run.timetable_validity="date_verified";
      run.timetable_date_verified=true;
      run.plan_source="official-2611-kyoto-kobe-source-clock-verified";
      candidate.officialPublicNumber=p.official_train_number;
      candidate.officialStopClockSourceUrl=p.official_source_url;
      candidate.stopClocksVerified=true;
      // Vehicle candidate family remains unresolved, no exact PNG.
    }
  }

  // Sotetsu-JR 2611: source-bound historical stops (Hazawa–Osaki)
  // certify only E233-7000 / Sotetsu-12000 fleet CANDIDATES.
  // Public 1xxM/2xxM are Sotetsu-side train types, NOT ownership codes.
  if(lineId==="SotetsuJRDirect"&&/^2026-11-/.test(serviceDate)){
    const {data:roster,error:rosterError}=await db
      .from("published_sotetsu_jr_2611_fleet_roster")
      .select("source_template_id,train_number,calendar_urn,direction_urn,train_type_urn,source_stop_keys,candidate_models,candidate_png_paths,official_fleet_source_url,timetable_index_url,stop_clock_status,reference_only,actual_vehicle_confirmed,number_date_verified,authorizes_png")
      .eq("edition","2611").eq("line_key","SotetsuJRDirect")
      .eq("calendar_urn",selectedCalendar);
    if(rosterError)throw rosterError;
    if((roster||[]).length!==92)
      throw new Error("SOTETSU_JR_2611_HISTORICAL_FLEET_ROSTER_UNAVAILABLE");
    const bySource=new Map(roster.map((r:any)=>[Number(r.source_template_id),r]));
    if(bySource.size!==92)
      throw new Error("SOTETSU_JR_2611_DUPLICATE_SOURCE_ID");
    const north=["HazawaYokohamaKokudai","MusashiKosugi","NishiOi","Osaki"];
    const south=north.slice().reverse();
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],pub:any=bySource.get(Number(run.source_template_id));
      const number=String(run.train_number||"");
      const n=/^(1[2-5][0-9]|2[2-8][0-9])M$/.exec(number);
      const inbound=run.rail_direction==="odpt.RailDirection:Northbound";
      const outbound=run.rail_direction==="odpt.RailDirection:Southbound";
      const expected=inbound?north:south;
      const stops=Array.isArray(run.stops)?run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()):[];
      if(!pub||!n||(!inbound&&!outbound)||
         Number(n[1])%2!==(inbound?0:1)||
         run.network_key!=="odpt.Railway:JR-East.SotetsuDirect"||
         run.train_type!=="odpt.TrainType:JR-East.Local"||
         pub.train_number!==number||pub.calendar_urn!==selectedCalendar||
         pub.direction_urn!==run.rail_direction||
         pub.train_type_urn!==run.train_type||
         pub.reference_only!==true||pub.actual_vehicle_confirmed!==false||
         pub.number_date_verified!==false||pub.authorizes_png!==false||
         pub.stop_clock_status!=="historical_not_2611_verified"||
         !Array.isArray(pub.source_stop_keys)||stops.length!==4||
         stops.some((st:string,j:number)=>st!==expected[j]||
           pub.source_stop_keys[j]!==expected[j])||
         !Array.isArray(pub.candidate_models)||
         pub.candidate_models.join("|")!=="E233系7000番台|相鉄12000系"||
         !Array.isArray(pub.candidate_png_paths)||
         pub.candidate_png_paths.join("|")!==
          "../images/列车/JR東日本/JR東日本_E233系_7000番台.png|../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png"){
        result.splice(i,1);continue;
      }
      run.vehicle_type_label=null;
      run.vehicle_type_candidates=pub.candidate_models.join(" / ");
      run.vehicle_plan_confirmed=false;
      run.vehicle_artwork_path=null;
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      // Do NOT set official train-number verification: source clocks are
      // historical, and an exact dated 2611 trainset is not established.
      run.published_number_fleet_reference={
        source:"sql-jreast-sotetsu-jr-2611-source-candidate",
        lineId:"SotetsuJRDirect",trainNumber:number,serviceDate,
        sourceTemplateId:Number(pub.source_template_id),
        direction:pub.direction_urn,calendar:pub.calendar_urn,
        trainType:pub.train_type_urn,sourceStopKeys:pub.source_stop_keys,
        candidateModels:pub.candidate_models,
        candidateAssets:pub.candidate_png_paths,
        fleetSourceUrl:pub.official_fleet_source_url,
        timetableIndexUrl:pub.timetable_index_url,
        stopClockStatus:pub.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false,
        numberDateVerified:false,authorizesPNG:false
      };
    }
  }
  // 弥彦線 uses INTERNAL key Miyo, NOT Yahiko. 2611 regular E129
  // trains, nine Kiku-calendar days and three Momiji Kairi D-number
  // segments. The latter have NO historical SQL stop templates: retain
  // roster evidence only, NEVER invent a train's position or stop clock.
  // 9222D/9225D Shu*Kura were OCTOBER 24 ONLY, not November runs.
  if(lineId==="Miyo"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError}]=
      await Promise.all([
        db.from("published_miyo_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,source_template_id,source_occurrence,segment_key,operating_dates,excluded_dates,source_stop_keys,vehicle_model,png_reference,service_name,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Miyo")
          // Printed 9179D belongs to Echigo after the Yoshida changeover.
          // Retain it as through-service audit, never a Miyo run/position.
          .eq("actual_segment_line_key","Miyo")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Miyo")
      ]);
    if(rosterError||rangeError)throw(rosterError||rangeError);
    const expected=selectedCalendar==="odpt.Calendar:Weekday"?42:56;
    if((roster||[]).length!==expected||(ranges||[]).length!==2)
      throw new Error("MIYO_2611_NUMBER_DATE_ROSTER_UNAVAILABLE");
    const bySource=new Map((roster||[]).filter((r:any)=>
      r.source_template_id!=null).map((r:any)=>
      [Number(r.source_template_id),r]));
    const allowedStations=new Set(["Yahiko","Yahagi","Yoshida",
      "Nishi-Tsubame","Tsubame","Tsubame-Sanjo","Kita-Sanjo","Higashi-Sanjo"]);
    const kikuDays=new Set(["2026-11-01","2026-11-03",
      "2026-11-07","2026-11-08","2026-11-14","2026-11-15",
      "2026-11-21","2026-11-22","2026-11-23"]);
    const kiku=kikuDays.has(serviceDate);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],pub:any=bySource.get(Number(run.source_template_id));
      if(!pub||run.network_key!=="odpt.Railway:JR-East.Miyo"||
         pub.train_number!==run.train_number||pub.direction_urn!==run.rail_direction||
         pub.calendar_urn!==selectedCalendar||pub.train_type_urn!==run.train_type||
         pub.segment_key==="october_only"||
         !["regular","kiku","seasonal_holiday"].includes(pub.segment_key)||
         pub.reference_only!==true||pub.actual_vehicle_confirmed!==false||
         !Array.isArray(run.stops)||!Array.isArray(pub.source_stop_keys)){
        result.splice(i,1);continue;
      }
      const dates=(pub.operating_dates||[]).map((d:any)=>String(d).slice(0,10));
      const exclude=(pub.excluded_dates||[]).map((d:any)=>String(d).slice(0,10));
      if((dates.length&&!dates.includes(serviceDate))||exclude.includes(serviceDate)||
         (pub.segment_key==="kiku"&&!kiku)){
        result.splice(i,1);continue;
      }
      const original=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(original.length<2||original.length!==pub.source_stop_keys.length||
         original.some((key:string,j:number)=>
           key!==pub.source_stop_keys[j]||!allowedStations.has(key))){
        result.splice(i,1);continue;
      }
      // 10/31--11/23 holiday Kiku timetable shortens EXISTING
      // 234M (east segment stopped), 235M and 241M (west stopped).
      // Replacement numbered 9234M/9235M/9241M are separate SQL rows.
      // 228M chooses its DATE-SCOPED 3-stop template instead of the
      // historical full route; 9228M covers the other segment.
      let railScope="full";
      if(kiku&&selectedCalendar==="odpt.Calendar:SaturdayHoliday"){
        if(run.train_number==="234M"){
          if(original.length!==8){result.splice(i,1);continue;}
          run.stops=run.stops.slice(-3);
          railScope="yoshida_yahiko_only";
        }else if(run.train_number==="235M"||run.train_number==="241M"){
          if(original.length!==8){result.splice(i,1);continue;}
          run.stops=run.stops.slice(2);
          railScope="yoshida_higashisanjo_only";
        }else if(run.train_number==="228M"){
          if(Number(pub.source_occurrence)!==1||original.length!==3){
            result.splice(i,1);continue;
          }
          railScope="yoshida_yahiko_only";
        }
      }
      if(run.stops.length<2||run.stops.some((st:any)=>
        !allowedStations.has(String(st.station_urn||"").split(".").pop()||""))){
        result.splice(i,1);continue;
      }
      const m=/^([0-9]+)(M)$/.exec(String(run.train_number||""));
      const valid=m&&(ranges||[]).some((r:any)=>
        r.requires_exact_roster===true&&
        r.segment_key==="miyo_e129_regular_seasonal"&&
        Number(m[1])>=r.min_number&&Number(m[1])<=r.max_number&&
        r.suffix==="M"&&r.vehicle_model===pub.vehicle_model&&
        r.png_reference===pub.png_reference);
      if(!valid||pub.vehicle_model!=="E129系"||
         pub.png_reference!=="../images/列车/JR東日本/JR東日本_E129系.png"||
         pub.stop_clock_status!=="historical_not_2611_verified"){
        result.splice(i,1);continue;
      }
      if(railScope!=="full")
        run.destination_station=run.stops[run.stops.length-1].station_urn;
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="E129系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_plan_confirmed=false;
      run.train_number_verification="official-2611-miyo-number-date-rail";
      run.train_number_source_url=pub.official_source_url;
      if(pub.service_name)run.service_name=pub.service_name;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Miyo",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:pub.calendar_urn,
        trainType:pub.train_type_urn,segmentKey:pub.segment_key,
        railScope:railScope,sourceTemplateId:Number(pub.source_template_id),
        sourceStopKeys:pub.source_stop_keys,
        plannedCandidates:["E129系"],model:pub.vehicle_model,
        pngReference:pub.png_reference,
        serviceName:pub.service_name||"",
        officialSourceUrl:pub.official_source_url,
        stopClockStatus:pub.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Mito Line 2611: 62 verified REGULAR M train numbers (32 up/30 down)
  // and ONE dated SQL stop plan per train number. Never interpret the
  // 725M/756M/763M/772M clock variants as extra physical trains.
  // 9074/9075M are Oct 31-only Jōban-Nikkō limited expresses; imported
  // 9785M has no verified Nov 2611 operating date. JR scheduled E531
  // 5-car regular service in 2019, but temporary E501 appearances were
  // reported in 2026; no Nov 2611 E501 number/formation proof exists.
  // E531 is a FLEET illustration, never confirmed 0/3000/Akaden stock.
  if(lineId==="Mito"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError}]=
      await Promise.all([
        db.from("published_mito_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,source_template_id,source_stop_keys,date_variant_template_ids,vehicle_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Mito")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Mito")
          .eq("segment_key","mito_regular_local")
      ]);
    if(rosterError||rangeError)throw(rosterError||rangeError);
    if((roster||[]).length!==62||(ranges||[]).length!==1)
      throw new Error("MITO_2611_EXACT_NUMBER_ROSTER_UNAVAILABLE");
    const byNumber=new Map((roster||[]).map((r:any)=>
      [r.train_number+"|"+r.direction_urn,r]));
    const allowedStations=new Set(["Oyama","Otabayashi","Yuki",
      "Higashi-Yuki","Kawashima","Tamado","Shimodate","Niihari",
      "Yamato-Mito","Iwase","Haguro","Fukuhara","Inada","Kasama",
      "Shishido","Tomobe"]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],
        proof:any=byNumber.get(run.train_number+"|"+run.rail_direction);
      if(!proof||run.network_key!=="odpt.Railway:JR-East.Mito"||
         proof.calendar_urn!==selectedCalendar||
         proof.train_type_urn!=="odpt.TrainType:JR-East.Local"||
         run.train_type!==proof.train_type_urn||
         proof.reference_only!==true||proof.actual_vehicle_confirmed!==false||
         !Array.isArray(run.stops)||run.stops.length<2||
         run.stops.length>16||!Array.isArray(proof.source_stop_keys)||
         proof.source_stop_keys.length<2||
         proof.source_stop_keys.length>16){
        result.splice(i,1);continue;
      }
      const dated=proof.date_variant_template_ids||{};
      const selected=Number(dated[serviceDate]||proof.source_template_id);
      if(!Number.isSafeInteger(selected)||
         Number(run.source_template_id)!==selected){
        result.splice(i,1);continue;
      }
      const stops=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      const referenceStops=proof.source_stop_keys;
      if(stops.some((x:string)=>!allowedStations.has(x))||
         referenceStops.some((x:string)=>!allowedStations.has(x))||
         (selected===Number(proof.source_template_id) &&
           (referenceStops.length!==stops.length||
            referenceStops.some((key:string,j:number)=>key!==stops[j])))){
        result.splice(i,1);continue;
      }
      const numberMatch=/^([0-9]+)(M)$/.exec(String(run.train_number||""));
      const n=numberMatch?Number(numberMatch[1]):0;
      const valid=numberMatch&&
        n%2===(run.rail_direction==="odpt.RailDirection:Inbound"?0:1)&&
        (ranges||[]).some((r:any)=>
          r.requires_exact_roster===true&&r.segment_key==="mito_regular_local"&&
          n>=r.min_number&&n<=r.max_number&&r.suffix==="M"&&
          r.vehicle_model===proof.vehicle_model&&
          r.png_reference===proof.png_reference);
      if(!valid||proof.vehicle_model!=="E531系"||
         proof.png_reference!=="../images/列车/JR東日本/JR東日本_E531系_水戸線.png"||
         proof.stop_clock_status!=="historical_not_2611_verified"){
        result.splice(i,1);continue;
      }
      run.vehicle_type_label=null;
      run.vehicle_type_candidates="E531系";
      run.vehicle_candidate_artwork_path=null;
      run.vehicle_candidate_artwork_status=null;
      run.vehicle_plan_confirmed=false;
      run.train_number_verification="official-2611-mito-dated-number";
      run.train_number_source_url=proof.official_source_url;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Mito",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:proof.calendar_urn,
        trainType:proof.train_type_urn,segmentKey:"mito_regular_local",
        sourceTemplateId:selected,regularLocal:true,
        plannedCandidates:["E531系"],model:proof.vehicle_model,
        pngReference:proof.png_reference,
        officialSourceUrl:proof.official_source_url,
        stopClockStatus:proof.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // Kururi 2611: 40 published train numbers are NOT 40 operating rail
  // journeys. Typhoon 25 closed Kururi–KazusaKameyama for all November:
  // 6 segment-only D numbers are bus/taxi replacement, NEVER rail PNG.
  // 11 historically through D numbers retain their public number but only
  // their original 11-stop Kisarazu–Kururi railway segment is projected.
  if(lineId==="Kururi"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterErr},{data:ranges,error:rangeErr}]=
      await Promise.all([
        db.from("published_kururi_2611_rail_vehicle_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,rail_scope,source_stop_keys,rail_stop_keys,fleet_model,png_reference,official_source_url,stop_clock_status,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Kururi")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Kururi")
          .eq("segment_key","kisarazu_kururi_rail")
      ]);
    if(rosterErr||rangeErr)throw(rosterErr||rangeErr);
    if((roster||[]).length!==40||(ranges||[]).length!==1)
      throw new Error("KURURI_2611_RAIL_SCOPE_UNAVAILABLE");
    const byNumber=new Map((roster||[]).map((r:any)=>
      [r.train_number+"|"+r.direction_urn,r]));
    const down=["Kisarazu","Gion","KazusaKiyokawa","HigashiKiyokawa",
      "Yokota","HigashiYokota","Makuta","Shimogori","Obitsu","Tawarada","Kururi"];
    const upstream=[...down].reverse();
    const closedSet=new Set(["Hirayama","KazusaMatsuoka","KazusaKameyama"]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],rule:any=
        byNumber.get(run.train_number+"|"+run.rail_direction);
      if(!rule||run.network_key!=="odpt.Railway:JR-East.Kururi"||
         rule.calendar_urn!==selectedCalendar||
         rule.train_type_urn!=="odpt.TrainType:JR-East.Local"||
         run.train_type!==rule.train_type_urn||
         rule.reference_only!==true||rule.actual_vehicle_confirmed!==false||
         !Array.isArray(run.stops)||!Array.isArray(rule.source_stop_keys)||
         !Array.isArray(rule.rail_stop_keys)){
        result.splice(i,1);continue;
      }
      const original=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(original.length!==rule.source_stop_keys.length||
         original.some((key:string,j:number)=>key!==rule.source_stop_keys[j])){
        result.splice(i,1);continue;
      }
      if(rule.rail_scope==="closed_segment_only"){
        // Do NOT display a closed railway journey or lend its train number
        // and image to the bus/taxi substitute, which has another timetable.
        result.splice(i,1);continue;
      }
      const inbound=run.rail_direction==="odpt.RailDirection:Inbound";
      const expected=inbound?upstream:down;
      const railKeys=rule.rail_stop_keys;
      if(railKeys.length!==11||railKeys.some((key:string,j:number)=>key!==expected[j])){
        result.splice(i,1);continue;
      }
      if(rule.rail_scope==="trimmed_through_rail"){
        if(original.length!==14||
           !closedSet.has(original[inbound?0:11])||
           !closedSet.has(original[inbound?1:12])||
           !closedSet.has(original[inbound?2:13])){
          result.splice(i,1);continue;
        }
        run.stops=inbound?run.stops.slice(3):run.stops.slice(0,11);
      }else if(rule.rail_scope!=="open_rail_only"||original.length!==11){
        result.splice(i,1);continue;
      }
      const railRun=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      if(railRun.some((key:string,j:number)=>key!==railKeys[j])){
        result.splice(i,1);continue;
      }
      const n=/^([0-9]+)(D)$/.exec(String(run.train_number||""));
      const valid=n&&(ranges||[]).some((r:any)=>
        r.requires_exact_roster===true&&r.segment_key==="kisarazu_kururi_rail"&&
        Number(n[1])>=r.min_number&&Number(n[1])<=r.max_number&&
        n[2]===r.suffix&&r.vehicle_model===rule.fleet_model&&
        r.png_reference===rule.png_reference);
      if(!valid||rule.stop_clock_status!=="historical_not_2611_verified"){
        result.splice(i,1);continue;
      }
      run.destination_station="odpt.Station:JR-East.Kururi."+
        (inbound?"Kisarazu":"Kururi");
      run.train_number_verification="official-2611-rail-only-number-route";
      run.train_number_source_url=rule.official_source_url;
      run.vehicle_candidate_artwork_path=null;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kururi",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:rule.calendar_urn,
        trainType:rule.train_type_urn,segmentKey:"kisarazu_kururi_rail",
        railScope:rule.rail_scope,railwayFrom:inbound?"Kururi":"Kisarazu",
        railwayTo:inbound?"Kisarazu":"Kururi",
        plannedCandidates:["キハE130形100番台"],
        model:rule.fleet_model,pngReference:rule.png_reference,
        officialSourceUrl:rule.official_source_url,
        stopClockStatus:rule.stop_clock_status,
        referenceOnly:true,actualVehicleConfirmed:false,
        closedRailSection:"Kururi–KazusaKameyama"
      };
    }
  }
  // JR-East Hanawa (internal Kounan) 2611: exact public numbers, scoped
  // PNG ranges and date-specific cancellations. Never paint a carset as live.
  if (lineId==="Kounan" && /^2026-11-/.test(serviceDate)) {
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError}]=
      await Promise.all([
        db.from("published_hanawa_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,segment_key,vehicle_model,png_reference,official_source_url,operating_dates,suspended_dates,reference_only,actual_vehicle_confirmed")
          .eq("edition","2611").eq("line_key","Kounan")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Kounan")
      ]);
    if (rosterError||rangeError) throw(rosterError||rangeError);
    const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?24:23;
    if ((roster||[]).length!==expectedCount||(ranges||[]).length!==3)
      throw new Error("HANAWA_2611_OFFICIAL_NUMBER_ROSTER_UNAVAILABLE");
    const numbers=new Map((roster||[]).map((x:any)=>
      [x.train_number+"|"+x.direction_urn,x]));
    const stationKeys=new Set(["Akasakata","Anihata","Appi-Kogen",
      "Araya-Shinmachi","Dobukai","Hachimantai","Higashi-Obuke",
      "Higashi-Odate","Junisho","Kazuno-Hanawa","Kitamori","Koyanohata",
      "Matsuo-Hachimantai","Obuke","Odate","Ogita","Otaki-Onsen",
      "Rikuchu-Osato","Sawajiri","Shibahira","Suehiro","Tairadate",
      "Tayama","Towada-Minami","Yokoma","Yuze-Onsen"]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const pub:any=numbers.get(run.train_number+"|"+run.rail_direction);
      if(!pub||run.network_key!=="odpt.Railway:JR-East.Kounan"||
        pub.calendar_urn!==selectedCalendar||pub.reference_only!==true||
        pub.actual_vehicle_confirmed!==false||
        pub.train_type_urn!==run.train_type){
        result.splice(i,1);continue;
      }
      const operating=(pub.operating_dates||[]).map((d:any)=>String(d).slice(0,10));
      const suspended=(pub.suspended_dates||[]).map((d:any)=>String(d).slice(0,10));
      if ((operating.length&&!operating.includes(serviceDate))||
          suspended.includes(serviceDate)){result.splice(i,1);continue;}
      const stops=run.stops||[];
      if(stops.length<2||stops.some((s:any)=>
        !stationKeys.has(String(s.station_urn||"").split(".").pop()||""))){
        result.splice(i,1);continue;
      }
      const n=/^([0-9]+)(D)$/.exec(String(run.train_number||""));
      const valid=n&&(ranges||[]).some((r:any)=>
        r.requires_exact_roster===true&&r.segment_key===pub.segment_key&&
        Number(n[1])>=r.min_number&&Number(n[1])<=r.max_number&&
        r.suffix===n[2]&&r.vehicle_model===pub.vehicle_model&&
        r.png_reference===pub.png_reference);
      if(!valid){result.splice(i,1);continue;}
      run.train_number_verification="official-2611-number-date-rail";
      run.train_number_source_url=pub.official_source_url;
      if(pub.segment_key==="hinabi")run.service_name="ひなび 八幡平";
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kounan",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:pub.calendar_urn,
        trainType:pub.train_type_urn,segmentKey:pub.segment_key,
        model:pub.vehicle_model,pngReference:pub.png_reference,
        officialSourceUrl:pub.official_source_url,
        stopClockStatus:"historical_source_clocks_not_2611_verified",
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }
  // JR East 2026-11 Kitakami: SQL published number roster + explicit
  // rail-only corridor from the August 2 flood bulletin. The published
  // 9729D/9730D excursion was October 24/25 ONLY, not a November train.
  // No train can be drawn on Hotto-Yuda–Yokote (replacement BUS).
  if(lineId==="Kitakami" && /^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError},
      {data:suspension,error:suspensionError}]=await Promise.all([
      db.from("published_kitakami_2611_number_roster")
        .select("train_number,calendar_urn,direction_urn,train_type_urn,vehicle_model,png_reference,official_source_url,source_evidence_scope,operating_rule,railway_from,railway_to,stop_clock_status")
        .eq("edition","2611").eq("line_key","Kitakami")
        .eq("calendar_urn",selectedCalendar),
      db.from("published_train_png_number_ranges")
        .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
        .eq("edition","2611").eq("line_key","Kitakami")
        .eq("segment_key","rail_to_hotto_yuda"),
      db.from("published_kitakami_2611_rail_suspension")
        .select("suspended_from,suspended_to,status,replacement_mode,effective_since")
        .eq("edition","2611").eq("line_key","Kitakami").maybeSingle()
    ]);
    if(rosterError||rangeError||suspensionError)
      throw (rosterError||rangeError||suspensionError);
    if(!suspension||suspension.suspended_from!=="Hotto-Yuda"||
      suspension.suspended_to!=="Yokote"||
      suspension.status!=="suspended_until_further_notice"||
      suspension.replacement_mode!=="replacement_bus_not_rail")
      throw new Error("KITAKAMI_OFFICIAL_RAIL_SUSPENSION_SCOPE_UNAVAILABLE");
    const index=new Map((roster||[]).map((r:any)=>
      [r.train_number+"|"+r.direction_urn,r]));
    const railwayStops=new Set(["Kitakami","Yanagihara","Ezuriko",
      "Fujine","Tatekawame","Yokokawame","Iwasawa","Waka-Sennin",
      "Yuda-Kinshuko","Hotto-Yuda"]);
    const dow=new Date(serviceDate+"T12:00:00Z").getUTCDay();
    const nationalHoliday=serviceDate==="2026-11-03"||
      serviceDate==="2026-11-23";
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i],pub:any=index.get(run.train_number+"|"+run.rail_direction);
      if(!pub||run.network_key!=="odpt.Railway:JR-East.Kitakami"){
        result.splice(i,1);continue;
      }
      if(pub.operating_rule==="except_sunday_national_holiday"&&
         (dow===0||nationalHoliday)){result.splice(i,1);continue;}
      const stops=run.stops||[];
      if(stops.length<2||!Array.isArray(stops)||
         stops.some((x:any)=>!String(x.station_urn||"").startsWith(
            "odpt.Station:JR-East.")||
           !railwayStops.has(String(x.station_urn).split(".").pop()||""))){
        result.splice(i,1);continue;
      }
      const first=String(stops[0].station_urn).split(".").pop();
      const last=String(stops[stops.length-1].station_urn).split(".").pop();
      if(first!==pub.railway_from||last!==pub.railway_to){
        result.splice(i,1);continue;
      }
      const num=/^(\d+)([A-Z])$/.exec(String(run.train_number||""));
      if(!num||!(ranges||[]).some((x:any)=>
         x.requires_exact_roster===true&&
         Number(num[1])>=x.min_number&&Number(num[1])<=x.max_number&&
         num[2]===x.suffix&&x.vehicle_model===pub.vehicle_model&&
         x.png_reference===pub.png_reference)){
        result.splice(i,1);continue;
      }
      run.train_type=pub.train_type_urn;
      run.train_number_verification="official-2611-number-rail-scope";
      run.train_number_source_url=pub.official_source_url;
      // Important: the 2610 clock source does not become a fully verified
      // 2611 schedule, and a vehicle SERIES illustration is not a real carset.
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kitakami",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:pub.calendar_urn,
        model:pub.vehicle_model,pngReference:pub.png_reference,
        trainType:pub.train_type_urn,segmentKey:"rail_to_hotto_yuda",
        officialSourceUrl:pub.official_source_url,
        stopClockStatus:pub.stop_clock_status,sourceScope:pub.source_evidence_scope,
        railwayFrom:pub.railway_from,railwayTo:pub.railway_to,
        actualVehicleConfirmed:false,referenceOnly:true,
        closedRailSection:"Hotto-Yuda–Yokote"
      };
    }
  }
  // JR East 2026-11 Kashima: exact public numbers from SQL, with
  // four same-time November 7 substitutions. A generic 5xxM or 95xxM
  // PNG range is NEVER sufficient: verify route/calendar/day and model.
  // Sawara is the Narita-line interchange; retain one Kashima projection
  // and do NOT invent a Tokyo/Narita through canonical itinerary.
  if(lineId==="Kashima" && /^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError}]=
      await Promise.all([
        db.from("published_kashima_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,vehicle_model,png_reference,official_source_url,vehicle_source_url,date_rule,operated_dates,scope_from,scope_to,stop_clock_status")
          .eq("edition","2611").eq("line_key","Kashima")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Kashima")
      ]);
    if(rosterError||rangeError)throw(rosterError||rangeError);
    const index=new Map((roster||[]).map((row:any)=>
      [row.train_number+"|"+row.direction_urn,row]));
    const forward=["Sawara","Katori","Junikyo","Itako",
      "Nobukata","Kashimajingu"];
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const rule:any=index.get(run.train_number+"|"+run.rail_direction);
      if(!rule||run.network_key!=="odpt.Railway:JR-East.Kashima"){
        result.splice(i,1);continue;
      }
      if(rule.date_rule==="only_2026_11_07"&&
         serviceDate!=="2026-11-07"||
         rule.date_rule==="exclude_2026_11_07"&&
         serviceDate==="2026-11-07"||
         Array.isArray(rule.operated_dates)&&rule.operated_dates.length>0&&
         !rule.operated_dates.map((d:any)=>String(d).slice(0,10)).includes(serviceDate)){
        result.splice(i,1);continue;
      }
      const dir=String(run.rail_direction||"").split(/[.:]/).pop();
      const stationList=(Array.isArray(run.stops)?run.stops:[]).map((st:any)=>
        String(st.station_urn||""));
      const keys=stationList.map((u:string)=>u.split(".").pop());
      const expected=dir==="Outbound"?forward:[...forward].reverse();
      if(stationList.length!==6||
         !stationList.every((u:string)=>u.startsWith("odpt.Station:JR-East.Kashima."))||
         keys.some((k:string,n:number)=>k!==expected[n])||
         keys[0]!==rule.scope_from||keys.at(-1)!==rule.scope_to){
        result.splice(i,1);continue;
      }
      const parts=/^(\d+)(M)$/.exec(String(run.train_number||""));
      if(!parts){result.splice(i,1);continue;}
      let fleetRange:any=null;
      if(rule.vehicle_model&&rule.png_reference){
        fleetRange=(ranges||[]).find((r:any)=>
          r.requires_exact_roster===true&&
          Number(parts[1])>=r.min_number&&Number(parts[1])<=r.max_number&&
          parts[2]===r.suffix&&r.vehicle_model===rule.vehicle_model&&
          r.png_reference===rule.png_reference);
        if(!fleetRange){result.splice(i,1);continue;}
      }else if(rule.vehicle_model||rule.png_reference){
        result.splice(i,1);continue;
      }
      run.train_type=rule.train_type_urn;
      run.train_number_verification="official-2611-six-stop-number-date";
      run.train_number_source_url=rule.official_source_url;
      // A model FAMILY illustration is NOT a carset identity. Mixed
      // 548/549 and 9548/9549 are intentionally PNG-UNRESOLVED.
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kashima",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:rule.calendar_urn,
        model:rule.vehicle_model||"",pngReference:rule.png_reference||"",
        trainType:rule.train_type_urn,
        segmentKey:fleetRange?fleetRange.segment_key:"mixed_unresolved",
        officialSourceUrl:rule.official_source_url,
        vehicleSourceUrl:rule.vehicle_source_url||"",
        stopClockStatus:rule.stop_clock_status,
        routeFrom:rule.scope_from,routeTo:rule.scope_to,
        actualVehicleConfirmed:false,referenceOnly:true
      };
    }
  }

  // JR East 2611 Kesennuma: the same historical SQL line holds both
  // RAIL D-trains Maeyachi–Yanagitsu and BRT K-services through Kesennuma.
  // ONLY the exact SQL-issued 18 rail D numbers may become TRAIN positions.
  // Nov 4–6 maintenance cancels 928D/929D throughout and the
  // Kesennuma RAIL SEGMENT of 2927D/2930D; no replacement buses.
  // Never assign the KiHa110 railway PNG to BRT, even on the parallel road.
  if(lineId==="Kesennuma" && /^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError},
      {data:interruptions,error:interruptionsError}]=await Promise.all([
      db.from("published_kesennuma_2611_rail_roster")
        .select("train_number,calendar_urn,direction_urn,train_type_urn,vehicle_model,png_reference,official_source_url,vehicle_family_source_url,from_station,to_station,origin_departure_clock,stop_clock_status")
        .eq("edition","2611").eq("line_key","Kesennuma")
        .eq("calendar_urn",selectedCalendar),
      db.from("published_train_png_number_ranges")
        .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
        .eq("edition","2611").eq("line_key","Kesennuma")
        .eq("segment_key","maeyachi_yanagitsu_rail"),
      db.from("published_kesennuma_2611_rail_interruptions")
        .select("train_number,interruption_scope,affected_from,affected_to")
        .eq("edition","2611").eq("line_key","Kesennuma")
        .eq("service_date",serviceDate)
    ]);
    if(rosterError||rangeError||interruptionsError)
      throw (rosterError||rangeError||interruptionsError);
    if(!(roster||[]).length||!(ranges||[]).length)
      throw new Error("KESENNUMA_2611_OFFICIAL_RAIL_ROSTER_UNAVAILABLE");
    const allowed=new Map((roster||[]).map((row:any)=>
      [row.train_number+"|"+row.direction_urn,row]));
    const denied=new Set((interruptions||[]).filter((row:any)=>
       row.affected_from==="Maeyachi"&&row.affected_to==="Yanagitsu"&&
       (row.interruption_scope==="entire_train"||
        row.interruption_scope==="rail_segment_Maeyachi_Yanagitsu"))
       .map((row:any)=>row.train_number));
    const railStations=["Maeyachi","Wabuchi","Nonodake",
      "Rikuzen-Toyosato","Mitakedo","Yanagitsu"];
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const rule:any=allowed.get(run.train_number+"|"+run.rail_direction);
      // Fail closed: BRT K suffix belongs to a different mode, despite
      // sharing the historic Kesennuma line source and some station names.
      if(!rule||denied.has(run.train_number)||
         run.network_key!=="odpt.Railway:JR-East.Kesennuma"){
        result.splice(i,1);continue;
      }
      const expected=String(run.rail_direction||"").endsWith("Outbound")
        ?railStations:[...railStations].reverse();
      if(!Array.isArray(run.stops)||run.stops.length!==6||
         run.stops.some((stop:any,n:number)=>
           String(stop.station_urn||"")!==
           "odpt.Station:JR-East."+expected[n])||
         rule.from_station!==expected[0]||
         rule.to_station!==expected[expected.length-1]||
         String(run.stops[0].departure_time||"")!==rule.origin_departure_clock){
        result.splice(i,1);continue;
      }
      const parts=/^(\d+)(D)$/.exec(String(run.train_number||""));
      const permitted=parts&&(ranges||[]).some((r:any)=>
        r.requires_exact_roster===true&&r.segment_key==="maeyachi_yanagitsu_rail"&&
        Number(parts[1])>=r.min_number&&Number(parts[1])<=r.max_number&&
        r.suffix===parts[2]&&r.vehicle_model===rule.vehicle_model&&
        r.png_reference===rule.png_reference);
      if(!permitted){result.splice(i,1);continue;}
      run.train_type=rule.train_type_urn;
      run.train_number_verification="official-2611-rail-origin-number-day";
      run.train_number_source_url=rule.official_source_url;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kesennuma",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:rule.calendar_urn,
        model:rule.vehicle_model,pngReference:rule.png_reference,
        trainType:rule.train_type_urn,
        segmentKey:"maeyachi_yanagitsu_rail",
        officialSourceUrl:rule.official_source_url,
        vehicleSourceUrl:rule.vehicle_family_source_url,
        stopClockStatus:rule.stop_clock_status,
        routeFrom:rule.from_station,routeTo:rule.to_station,
        transportMode:"rail",excludedTransportMode:"BRT",
        actualVehicleConfirmed:false,referenceOnly:true
      };
    }
  }

  // JR East 2611 KOMII (Koumi), not an inferred 100-240D PNG range.
  // 51 official service numbers have two-calendar SQL proof. The source
  // contains 6 old holiday-only numbers excluded from the 2611 roster.
  // Local KiHa110 / KiHaE200 are ambiguous -> NO vehicle PNG.
  // HIGH RAIL 8221/8222/8223 have dated service-family PNG, not carset.
  // Oct 27 rockfall Koumi-Nobeyama: NEVER forecast a train crossing
  // suspended track until SQL explicitly records official restoration.
  // Nov 17-19 repairs truncate 225/226/229/230, cancel 227/228.
  if(lineId==="Komii"&&/^2026-11-/.test(serviceDate)){
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError},
      {data:closures,error:closureError},
      {data:maintenance,error:maintenanceError}]=await Promise.all([
      db.from("published_komii_2611_number_roster")
        .select("train_number,calendar_urn,direction_urn,train_type_urn,is_high_rail,planned_vehicle_candidates,fleet_model,png_reference,source_url,service_source_url,scheduled_dates,stop_clock_status")
        .eq("edition","2611").eq("line_key","Komii")
        .eq("calendar_urn",selectedCalendar),
      db.from("published_train_png_number_ranges")
        .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
        .eq("edition","2611").eq("line_key","Komii"),
      db.from("published_komii_2611_rail_disruptions")
        .select("disruption_id,segment_from,segment_to,started_on,ended_on,service_status,reported_on")
        .eq("edition","2611").eq("line_key","Komii")
        .eq("disruption_id","2026_10_27_rockfall").maybeSingle(),
      db.from("published_komii_2611_maintenance")
        .select("train_number,operation,segment_from,segment_to")
        .eq("service_date",serviceDate)
    ]);
    if(rosterError||rangeError||closureError||maintenanceError)
      throw (rosterError||rangeError||closureError||maintenanceError);
    if((roster||[]).length!==51||!closures||
       closures.segment_from!=="Koumi"||closures.segment_to!=="Nobeyama"||
       !(ranges||[]).some((r:any)=>
          r.segment_key==="highrail1375_official"&&
          r.requires_exact_roster===true))
      throw new Error("KOMII_2611_PUBLISHED_ROSTER_OR_ROCKFALL_SCOPE_UNAVAILABLE");
    const published=new Map((roster||[]).map((r:any)=>
      [String(r.train_number)+"|"+String(r.direction_urn),r]));
    const construction=new Map((maintenance||[]).map((r:any)=>
      [String(r.train_number),r]));
    const order=["Kobuchizawa","Kai-Koizumi","Kai-Oizumi",
      "Kiyosato","Nobeyama","Shinano-Kawakami","Saku-Hirose",
      "Saku-Uminokuchi","Umijiri","Matsubarako","Koumi",
      "Managashi","Takaiwa","Yachiho","Kaise","Haguroshita",
      "Aonuma","Usuda","Tatsuokajo","Otabe","Nakagomi",
      "Namezu","Kita-Nakagomi","Iwamurada","Sakudaira",
      "Nakasato","Misato","Mitsuoka","Otome","Higashi-Komoro",
      "Komoro"];
    const rockfallStatus=String(closures.service_status||"");
    if(!["suspended_until_verified_restoration","verified_restored"].includes(
       rockfallStatus)||
       (rockfallStatus==="verified_restored"&&!closures.ended_on))
      throw new Error("KOMII_2611_ROCKFALL_STATUS_UNRECOGNIZED");
    // A future verified restoration must NOT erase the closure from its
    // historical dates: the interval is inclusive through ended_on.
    const closed=serviceDate>=String(closures.started_on).slice(0,10)&&
      (!closures.ended_on||
       serviceDate<=String(closures.ended_on).slice(0,10));
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const proof:any=published.get(run.train_number+"|"+run.rail_direction);
      if(!proof||run.network_key!=="odpt.Railway:JR-East.Komii"||
         run.canonical_group_evidence!=="source_only"||
         !Array.isArray(run.stops)||run.stops.length<2||
         !Array.isArray(proof.planned_vehicle_candidates)){
        result.splice(i,1);continue;
      }
      const direction=String(run.rail_direction||"").split(/[.:]/).pop();
      const oldStops=run.stops;
      const oldCodes=oldStops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      const routeIndices=oldCodes.map((code:string)=>order.indexOf(code));
      const monotonic=routeIndices.every((index:number,j:number)=>
         index>=0&&(j===0||
           (direction==="Outbound"?index>routeIndices[j-1]:
             index<routeIndices[j-1])));
      if(!monotonic||
         oldStops.some((st:any,j:number)=>
            st.station_urn!=="odpt.Station:JR-East."+oldCodes[j])){
        result.splice(i,1);continue;
      }
      const isHigh=proof.is_high_rail===true;
      if(isHigh){
        const dates=Array.isArray(proof.scheduled_dates)
          ?proof.scheduled_dates.map((d:any)=>String(d).slice(0,10)):[];
        if(!["8221D","8222D","8223D"].includes(run.train_number)||
           !dates.includes(serviceDate)||
           // Explicit official cancellation through Nov 9 after 10/27 rockfall
           serviceDate<="2026-11-09"){
          result.splice(i,1);continue;
        }
      }else if(proof.is_high_rail!==false){
        result.splice(i,1);continue;
      }
      const work:any=construction.get(run.train_number);
      if(work){
        if(work.segment_from!=="Kobuchizawa"||
           work.segment_to!=="Koumi"){
          result.splice(i,1);continue;
        }
        if(work.operation==="cancel_whole_train"){
          result.splice(i,1);continue;
        }
        if(work.operation!=="suspend_kobuchizawa_koumi_keep_other_section"||
           !["225D","226D","229D","230D"].includes(run.train_number)){
          result.splice(i,1);continue;
        }
        const boundary=oldCodes.indexOf("Koumi");
        if(boundary<1||boundary>=oldCodes.length-1||
           !oldCodes.includes("Kobuchizawa")){
          result.splice(i,1);continue;
        }
        run.stops=direction==="Outbound"
           ?oldStops.slice(boundary):oldStops.slice(0,boundary+1);
        run.destination_station=String(run.stops[run.stops.length-1].station_urn||"");
        run.operating_segment_status="partial_construction_official_2611";
      }
      // Cross-segment service suppression after date-scoped clipping.
      // Nobeyama and Koumi indices need not both be stops on HighRail:
      // the strict ordered station path is compared with the closure.
      const indices=run.stops.map((st:any)=>order.indexOf(
        String(st.station_urn||"").split(".").pop()||""));
      const traversesClosure=
        indices.some((n:number)=>n<=order.indexOf("Nobeyama"))&&
        indices.some((n:number)=>n>=order.indexOf("Koumi"));
      if(closed&&traversesClosure){result.splice(i,1);continue;}
      let pngRange:any=null;
      if(isHigh){
        const m=/^(\d+)D$/.exec(String(run.train_number||""));
        pngRange=m&&(ranges||[]).find((r:any)=>
           r.requires_exact_roster===true&&
           r.segment_key==="highrail1375_official"&&
           Number(m[1])>=r.min_number&&Number(m[1])<=r.max_number&&
           r.suffix==="D"&&
           r.vehicle_model===proof.fleet_model&&
           r.png_reference===proof.png_reference);
        if(!pngRange){result.splice(i,1);continue;}
      }else if(proof.fleet_model||proof.png_reference||
        proof.planned_vehicle_candidates.length!==2||
        !proof.planned_vehicle_candidates.includes("キハ110系（小海線）")||
        !proof.planned_vehicle_candidates.includes("キハE200形")){
        result.splice(i,1);continue;
      }
      run.train_type=proof.train_type_urn;
      if(isHigh)run.service_name=run.train_number==="8221D"
         ?"HIGH RAIL 1号":run.train_number==="8222D"
         ?"HIGH RAIL 2号":"HIGH RAIL 星空";
      run.train_number_verification="official-2611-number-rail-segment";
      run.train_number_source_url=proof.source_url;
      const effective=run.stops.map((st:any)=>
        String(st.station_urn||"").split(".").pop()||"");
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",
        lineId:"Komii",trainNumber:run.train_number,
        serviceDate:serviceDate,direction:run.rail_direction,
        calendar:proof.calendar_urn,trainType:proof.train_type_urn,
        isHighRail:isHigh,model:proof.fleet_model||"",
        pngReference:proof.png_reference||"",
        plannedCandidates:proof.planned_vehicle_candidates,
        segmentKey:isHigh?"highrail1375_official":"regular_mixed_unresolved",
        officialSourceUrl:proof.source_url,
        vehicleSourceUrl:proof.service_source_url,
        stopClockStatus:proof.stop_clock_status,
        routeFrom:effective[0],routeTo:effective[effective.length-1],
        operationalScope:run.operating_segment_status||
           (closed?"disruption_adjacent_unverified":"scheduled_rail_plan"),
        rockfallCleared:!closed,
        referenceOnly:true,actualVehicleConfirmed:false
      };
    }
  }

  // Joetsu 2611: SQL is the source of public train numbers and the
  // vehicle-series reference PNG. The numeric PNG range alone is NEVER
  // enough: calendar, source, explicit roster and verified route must match.
  // This does not assert observed vehicle formation or full stop-time proof.
  if(lineId==="Joetsu" && /^2026-11-/.test(serviceDate)) {
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError}] =
      await Promise.all([
        db.from("published_joetsu_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,service_name,vehicle_model,png_reference,segment_key,official_source_url,operating_dates,stop_clock_status")
          .eq("edition","2611").eq("line_key","Joetsu")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Joetsu")
      ]);
    if(rosterError || rangeError)
      throw (rosterError || rangeError);
    const indexed=new Map((roster || []).map((row:any)=>
      [row.train_number+"|"+row.direction_urn,row]));
    const northStopCodes=new Set([
      "Minakami","Yubiso","Doai","Tsuchitaru","Echigo-Nakazato",
      "Iwahara-Ski-Jo-Mae","Echigo-Yuzawa","Ishiuchi","Osawa",
      "Joetsu-Ski-Jo-Mae","Shiozawa","Muikamachi","Itsukamachi",
      "Urasa","Yairo","Koide","Echigo-Horinouchi","Kita-Horinouchi",
      "Echigo-Kawaguchi","Ojiya","Echigo-Takaya","Miyauchi","Nagaoka"
    ]);
    const southStopCodes=new Set([
      "Takasaki","Takasaki-Tonyamachi","Ino","Shin-Maebashi",
      "Gunma-Soja","Yagihara","Shibukawa","Shikishima","Tsukuda",
      "Iwamoto","Numata","Gokan","Kamimoku","Minakami"
    ]);
    for(const run of result as any[]) {
      const row:any=indexed.get(run.train_number+"|"+run.rail_direction);
      if(!row || !["north","south"].includes(row.segment_key) ||
         !row.official_source_url?.startsWith("https://timetables.jreast.co.jp/2611/"))
        continue;
      if(Array.isArray(row.operating_dates) && row.operating_dates.length &&
         !row.operating_dates.includes(serviceDate))continue;
      if(row.train_type_urn!==run.train_type &&
        !(row.train_type_urn==="odpt.TrainType:JR-East.Rapid" &&
          run.train_type==="odpt.TrainType:JR-East.Local"))continue;
      if(!Array.isArray(run.stops)||run.stops.length<2)continue;
      const sources=run.stops.map((s:any)=>String(s.station_urn||""));
      const northern=row.segment_key==="north" &&
        sources.every((urn:string)=>urn.startsWith("odpt.Station:JR-East.Joetsu.") &&
          northStopCodes.has(urn.split(".").pop()||""));
      // Verified 211 services can continue from Joetsu through Shibukawa
      // into Agatsuma; do not strip their stop rows or invent a new train.
      // Two actual Joetsu stops are mandatory before granting this image.
      const southern=row.segment_key==="south" &&
        sources.every((urn:string)=>
          urn.startsWith("odpt.Station:JR-East.Agatsuma.") ||
          (urn.startsWith("odpt.Station:JR-East.Joetsu.") &&
           southStopCodes.has(urn.split(".").pop()||""))) &&
        sources.filter((urn:string)=>
          urn.startsWith("odpt.Station:JR-East.Joetsu.") &&
          southStopCodes.has(urn.split(".").pop()||"")).length>=2;
      if(!northern&&!southern)continue;
      const numberMatch=/^(\d+)([A-Z])$/.exec(String(run.train_number||""));
      if(!numberMatch)continue;
      const count=Number(numberMatch[1]),suffix=numberMatch[2];
      const range=(ranges||[]).find((p:any)=>
        p.segment_key===row.segment_key && p.requires_exact_roster===true &&
        count>=p.min_number && count<=p.max_number &&
        suffix===p.suffix && p.vehicle_model===row.vehicle_model &&
        p.png_reference===row.png_reference);
      if(!range)continue;
      run.train_type=row.train_type_urn;
      run.service_name=row.service_name||run.service_name;
      run.train_number_verification="official-2611-number-scope";
      run.train_number_source_url=row.official_source_url;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Joetsu",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:row.calendar_urn,
        model:row.vehicle_model,pngReference:row.png_reference,
        serviceName:row.service_name||"",
        trainType:row.train_type_urn,segmentKey:row.segment_key,
        officialSourceUrl:row.official_source_url,
        stopClockStatus:row.stop_clock_status,
        actualVehicleConfirmed:false,referenceOnly:true
      };
    }
  }
  // Kamaishi 2611: SQL official numbered roster is the ONLY authority
  // for November trains and illustrative fleet PNG ranges. Historical source
  // templates include February-only Pokemon and December-only trains; never
  // publish those as November or recycle HB-E220 for Hinabi HB-E300.
  if(lineId==="Kamaishi" && /^2026-11-/.test(serviceDate)) {
    const [{data:roster,error:rosterError},{data:ranges,error:rangeError},
      {data:throughRows,error:throughError}] =
      await Promise.all([
        db.from("published_kamaishi_2611_number_roster")
          .select("train_number,calendar_urn,direction_urn,train_type_urn,service_name,vehicle_model,png_reference,segment_key,official_source_url,vehicle_model_source_url,operating_dates,stop_clock_status")
          .eq("edition","2611").eq("line_key","Kamaishi")
          .eq("calendar_urn",selectedCalendar),
        db.from("published_train_png_number_ranges")
          .select("segment_key,min_number,max_number,suffix,vehicle_model,png_reference,requires_exact_roster")
          .eq("edition","2611").eq("line_key","Kamaishi"),
        db.from("published_kamaishi_2611_regular_through_segments")
          .select("train_number,calendar_urn,canonical_timetable_id,from_line_key,to_line_key,from_template_id,to_template_id,arrival_clock,departure_clock")
          .eq("calendar_urn",selectedCalendar)
      ]);
    if(rosterError||rangeError||throughError)
      throw (rosterError||rangeError||throughError);
    const throughByNumber=new Map((throughRows||[]).map((row:any)=>
      [String(row.train_number),row]));
    const allowed=new Map((roster||[]).map((row:any)=>
      [row.train_number+"|"+row.direction_urn,row]));
    const kamaishiStations=new Set([
      "Hanamaki","Nitanai","Shin-Hanamaki","Oyamada","Tsuchizawa",
      "Haruyama","Iwanebashi","Miyamori","Kashiwagidaira","Masuzawa",
      "Arayamae","Iwate-Futsukamachi","Ayaori","Tono","Aozasa",
      "Iwate-Kamigo","Hirakura","Ashigase","Kami-Arisu",
      "Rikuchu-Ohashi","Dosen","Matsukura","Kosano","Kamaishi"
    ]);
    for(let i=result.length-1;i>=0;i--){
      const run:any=result[i];
      const proof:any=allowed.get(run.train_number+"|"+run.rail_direction);
      // Fail closed on the published month; a source template is not a
      // verified November operating day, even when its clock is plausible.
      if(!proof){result.splice(i,1);continue;}
      const dates=Array.isArray(proof.operating_dates)
        ?proof.operating_dates.map((v:any)=>String(v).slice(0,10)):[];
      if(dates.length&&!dates.includes(serviceDate)){
        result.splice(i,1);continue;
      }
      const numberMatch=/^(\d+)([A-Z])$/.exec(String(run.train_number||""));
      if(!numberMatch||!Array.isArray(run.stops)||run.stops.length<2||
        run.network_key!=="odpt.Railway:JR-East.Kamaishi"){
        result.splice(i,1);continue;
      }
      const unique=new Set(run.stops.map((st:any)=>st.station_key));
      const scopedStops=run.stops.filter((st:any)=>{
        const u=String(st.station_urn||"");
        return u.startsWith("odpt.Station:JR-East.") &&
          kamaishiStations.has(u.split(".").pop()||"");
      });
      // A verified 2611 same-train canonical ID is required to include
      // intermediate Morioka–Hanamaki stops. The 5559D/5562D
      // Tohoku-only source segments are NOT eligible on this line.
      const through:any=throughByNumber.get(String(run.train_number||""));
      const verifiedTohokuThrough=!!(through&&
        through.calendar_urn===selectedCalendar&&
        Number(through.canonical_timetable_id)===Number(run.canonical_timetable_id)&&
        run.canonical_group_evidence==="verified_continuation"&&
        Array.isArray(run.canonical_line_ids)&&
        run.canonical_line_ids.includes("TohokuMain")&&
        run.canonical_line_ids.includes("Kamaishi")&&
        ["Kamaishi","TohokuMain"].includes(through.from_line_key)&&
        ["Kamaishi","TohokuMain"].includes(through.to_line_key)&&
        through.from_line_key!==through.to_line_key);
      const tohokuStops=new Set(["Morioka","Iwate-Iioka","Yahaba",
        "Furudate","Hizume","Ishidorii","Hanamaki-Kuko"]);
      if(unique.size<2||scopedStops.length<2||
         !run.stops.every((st:any)=>{
           const u=String(st.station_urn||"");
           if(!u.startsWith("odpt.Station:JR-East."))return false;
           const code=u.split(".").pop()||"";
           return kamaishiStations.has(code)||
             code==="Morioka"||
             (verifiedTohokuThrough&&tohokuStops.has(code));
         })){result.splice(i,1);continue;}
      const digits=Number(numberMatch[1]),suffix=numberMatch[2];
      const validRange=(ranges||[]).some((r:any)=>
        r.requires_exact_roster===true&&r.segment_key===proof.segment_key&&
        digits>=r.min_number&&digits<=r.max_number&&
        suffix===r.suffix&&r.vehicle_model===proof.vehicle_model&&
        r.png_reference===proof.png_reference);
      if(!validRange){result.splice(i,1);continue;}
      // The model is a source-backed service-family reference, never an
      // observed carset. Train type must come from the published number.
      run.train_type=proof.train_type_urn;
      run.service_name=proof.service_name||run.service_name;
      run.train_number_verification="official-2611-number-scope";
      run.train_number_source_url=proof.official_source_url;
      run.published_number_fleet_reference={
        source:"sql-jreast-2611-number-roster",lineId:"Kamaishi",
        trainNumber:run.train_number,serviceDate:serviceDate,
        direction:run.rail_direction,calendar:proof.calendar_urn,
        model:proof.vehicle_model,pngReference:proof.png_reference,
        serviceName:proof.service_name||"",
        trainType:proof.train_type_urn,segmentKey:proof.segment_key,
        officialSourceUrl:proof.official_source_url,
        stopClockStatus:proof.stop_clock_status,
        verifiedTohokuThrough:verifiedTohokuThrough,
        actualVehicleConfirmed:false,referenceOnly:true
      };
    }
  }
  // The branch map displays only Ayase--KitaAyase, not the whole
  // through-train itinerary. Canonical IDs and stored timetables are unchanged.
  if (lineId === "ChiyodaBranch") {
    // Reject full-line rows that do not operate across this short branch,
    // rather than counting them as missing or incomplete branch trains.
    for (let i = result.length - 1; i >= 0; i--) {
      const run = result[i];
      const segment = run.stops.filter((stop: any) => {
        const station = String(stop.station_urn || "");
        return /\.(?:Ayase|KitaAyase)$/.test(station);
      });
      const distinct = new Set(segment.map((stop: any) => String(stop.station_urn || "")));
      if (segment.length === 2 && distinct.size === 2) run.stops = segment;
      else result.splice(i, 1);
    }
  }
  await linkPlannedOperations(db,result,selectedRevision);
  const bosoDatedNumberOverrides = await applyBosoNovember7DatedNumbers(result);
  // Incomplete source rows are preserved in SQL for auditing, but must not
  // suppress other source-verified trains for the same railway/calendar.
  // Never extrapolate a missing stop or report full coverage for a partial set.
  // At least two observed station clocks are required for estimating a
  // moving train. An untimed boundary stop must never become a made-up ETA.
  const validRuns = result.filter(r => r.stops.length >= 2 &&
    r.stops.every(s => !!s.station_urn) &&
    r.stops.filter(s => s.arrival_time || s.departure_time).length >= 2);
  let omittedIncompleteRuns = suppressedOsakaStationFragments + suppressedClockReversalRuns + result.length - validRuns.length;
  // A source may contain unusable upstream rows intentionally omitted from SQL.
  // Preserve that partial status rather than claiming full line coverage.
  if (selectedCalendar) {
    const { data: ingest, error: ingestError } = await db.from("timetable_ingest_jobs")
      .select("omitted_count").eq("line_id", lineId).eq("calendar_urn", selectedCalendar)
      .in("status", ["partial", "complete"])
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (ingestError) throw ingestError;
    omittedIncompleteRuns += Math.max(0, Number(ingest?.omitted_count) || 0);
  }
  // A published sample proves only those listed journeys, not a complete
  // daily service. Never upgrade a source-labelled sample to HIT coverage.
  const sourceSampleOnly = templates.some((t: any) =>
    String(t.source_path || "").startsWith("official-sampled:"));
  // A full set of nonempty stops is NOT proof that the published line
  // timetable is complete. The all-operator coverage audit explicitly
  // distinguishes sampled / sparse / calendar-review / unverified sources.
  // Keep every sourced train visible, but never label unreviewed coverage HIT.
  const { data: planAudit, error: planAuditError } = await db
    .from("published_timetable_coverage_audit")
    .select("coverage_status,issues")
    .eq("line_key", lineId)
    .maybeSingle();
  if (planAuditError) throw planAuditError;
  const auditStatus = String(planAudit?.coverage_status || "unverified");
  const auditIssues = Array.isArray(planAudit?.issues) ? planAudit.issues : [];
  const independentlyVerifiedCoverage =
    auditStatus === "verified" || auditStatus === "complete";
  const complete = validRuns.length > 0 && omittedIncompleteRuns === 0 &&
    !sourceSampleOnly && independentlyVerifiedCoverage;
  const partial = validRuns.length > 0 && !complete;
  const dateVerifiedRuns = validRuns.filter(r => r.timetable_date_verified).length;
  // Independently published through-service NUMBER evidence only.
  // It is not a source for adding runs or joining historical composite
  // train IDs; source-clock / vehicle permissions remain false.
  let jrwestOfficialNumberReferences:any[]=[];
  if(["Kosei","TokaidoKansai","SanyoMain"].includes(lineId)&&
     /^2026-11-\d{2}$/.test(serviceDate)){
    const {data:refs,error:refError}=await db
      .from("published_jrwest_2611_crossline_number_reference")
      .select("line_key,published_train_number,calendar_scope,train_type,segment_from,segment_to,continuous_service_key,official_source_url,observed_date,number_date_verified,stop_clocks_verified,actual_vehicle_confirmed,authorizes_png,authorizes_position")
      .eq("line_key",lineId);
    if(refError)throw refError;
    const dayScope=selectedCalendar==="odpt.Calendar:Weekday"
      ?"weekday":"saturday_holiday";
    jrwestOfficialNumberReferences=(refs||[]).filter((p:any)=>{
      if(p.line_key!==lineId||!["daily",dayScope].includes(p.calendar_scope))
        return false;
      if(p.number_date_verified!==true||p.stop_clocks_verified!==false||
         p.actual_vehicle_confirmed!==false||p.authorizes_png!==false||
         p.authorizes_position!==false)
        throw new Error("JRWEST_2611_THROUGH_NUMBER_REFERENCE_CONFLICT");
      return true;
    }).map((p:any)=>({
      train_number:p.published_train_number,
      service_type:p.train_type,
      segment_from:p.segment_from,segment_to:p.segment_to,
      continuation_key:p.continuous_service_key,
      source_url:p.official_source_url,
      observed_date:p.observed_date,
      number_verified:true,stop_clocks_verified:false,
      authorizes_position:false,authorizes_png:false
    }));
  }
  return json({ ok: true, complete, partial,
    // These counts do not change the existing structural coverage behavior.
    cancelled_runs: validRuns.filter(r => r.operation_status === "cancelled").length,
    official_dated_number_overrides: bosoDatedNumberOverrides,
    jrwest_official_number_references: jrwestOfficialNumberReferences,
    date_verified_runs: dateVerifiedRuns,
    date_unverified_runs: validRuns.length - dateVerifiedRuns,
    cache: complete ? "HIT" : partial ? "PARTIAL" : "MISS",
    source: "DATABASE_MANUAL_TEMPLATES", line_id: lineId, service_date: serviceDate,
    source_coverage: sourceSampleOnly ? "verified-partial-sample"
      : independentlyVerifiedCoverage ? "verified-published-calendar"
      : "calendar-source-coverage-unverified",
    audit_coverage_status: auditStatus, audit_issues: auditIssues,
    revision:selectedRevision,plan_status:selectedRevision ? 'published_revision' : 'unverified',
    calendar_status: "selected", selected_calendar: selectedCalendar,
    omitted_incomplete_runs: omittedIncompleteRuns,
    suppressed_station_only_source_fragments: suppressedOsakaStationFragments,
    suppressed_non_midnight_clock_reversal_runs: suppressedClockReversalRuns,
    runs: validRuns });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const url = new URL(req.url);
  const lineId = (url.searchParams.get("line_id") || "").trim();
  const serviceDate = (url.searchParams.get("service_date") || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(lineId)) return json({ ok: false, error: "INVALID_LINE_ID" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return json({ ok: false, error: "INVALID_SERVICE_DATE" }, 400);
  const [year, month, day] = serviceDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day) {
    return json({ ok: false, error: "INVALID_SERVICE_DATE" }, 400);
  }

  let secretKeys: Record<string, string>;
  try {
    secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  } catch {
    return json({ ok: false, error: "SERVER_CONFIG" }, 500);
  }
  if (!secretKeys || typeof secretKeys !== "object" || Array.isArray(secretKeys)) {
    return json({ ok: false, error: "SERVER_CONFIG" }, 500);
  }
  const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !secretKey) return json({ ok: false, error: "SERVER_CONFIG" }, 500);

  const db = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: source, error: sourceError } = await db.from("railway_lines")
    .select("timetable_operator").eq("id", lineId).maybeSingle();
  if (sourceError) return json({ ok: false, error: "DB_SOURCE_LOOKUP_FAILED" }, 500);
  if (!source) return json({ ok: false, error: "LINE_NOT_REGISTERED" }, 404);
  // Position capability flags cannot prevent reading published service plans.

  // Recurring publication plan only. service_date is an internal calendar
  // selector, not a persisted run date. No day-specific rows are queried.
  try {
    return await readManualTemplateRuns(
      db, lineId, serviceDate, source?.timetable_operator || null
    );
  } catch (err) {
    console.error("[train-runs] SQL read failed", lineId, String(err));
    return json({ ok: false, error: "DB_QUERY_FAILED" }, 500);
  }

});
