import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
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

function stationUrn(stop: Record<string, unknown>) {
  return String(stop["odpt:arrivalStation"] || stop["odpt:departureStation"] || "");
}

function stationKey(urn: string) {
  const p = urn.split(".");
  return p[p.length - 1] || urn;
}

function isCancelled(run: any, lineId: string, exceptions: any[]) {
  return exceptions.some((e: any) => {
    if (e.train_run_id != null) return e.train_run_id === run.id;
    // Run-scoped changes never widen into a line/operator closure.
    if (e.line_id) return e.line_id === lineId;
    return !!e.operator && e.operator === run.operator;
  });
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

async function activeRevision(db: any, lineId: string, serviceDate: string, calendar: string | null) {
  const {data,error} = await db.from('timetable_revisions')
    .select('id,version_key,effective_from,effective_to,calendar_urn,source_id,evidence_sources(source_url,source_type)')
    .eq('line_id',lineId).order('effective_from',{ascending:false});
  if (error) throw error;
  return selectRevision(data || [],serviceDate,calendar);
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
async function readManualTemplateRuns(db: any, lineId: string, serviceDate: string, timetableOperator: string | null, exceptions: any[]): Promise<Response> {
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
  let templates: any[] = [];
  let selectedCalendar: string | null = null;
  let selectedRevision: any = null;
  for (const calendar of serviceCalendars(serviceDate)) {
    const revision = await activeRevision(db,lineId,serviceDate,calendar);
    // A future dedicated Holiday diagram cannot hide a currently valid
    // SaturdayHoliday alternative before that dedicated diagram takes effect.
    if (revision?.unavailable && revision.reason === 'not_yet_effective') {
      selectedRevision = revision;
      continue;
    }
    const selected = revision?.unavailable ? [] : await pages((first, last) => {
      let query = db.from("manual_timetable_templates")
      .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date")
      .eq("line_key", lineId).eq("calendar_urn", calendar);
      query = revision ? query.eq('revision_id',revision.id) : query.is('revision_id',null);
      return query.order("id").range(first,last);
    });
    // ChiyodaBranch has only KitaAyase-bound alias rows. The 2026
    // opposite-direction train plans already exist under Chiyoda. Reuse
    // those canonical sources for branch display without importing duplicates.
    if (lineId === "ChiyodaBranch" && !revision) {
      const opposite = await pages((first, last) => db.from("manual_timetable_templates")
        .select("id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,physical_service_key,source_trip_id,previous_timetable_ids,next_timetable_ids,source_path,source_revision_date")
        .eq("line_key", "Chiyoda")
        .eq("calendar_urn", calendar)
        .eq("direction_urn", "odpt.RailDirection:TokyoMetro.YoyogiUehara")
        .is("revision_id", null)
        .order("id").range(first, last));
      selected.push(...opposite);
    }
    if (selected.length || revision) { templates = selected; selectedCalendar = calendar; selectedRevision = revision; break; }
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
  for (let i = 0; i < templates.length; i += 100) {
    const ids = templates.slice(i, i + 100).map((t: any) => t.id);
    const { data, error } = await db.from("train_timetable_source_resolution")
      .select("source_template_id,timetable_id,member_role,group_evidence,timetable_validity,mapping_level,vehicle_type,vehicle_source_id,vehicle_source_url,vehicle_revision_date,vehicle_artwork_path,operation_code,operation_source_id,operation_revision_date,operation_owner,operation_owner_source_url")
      .in("source_template_id", ids);
    if (error) throw error;
    for (const row of data || []) sourceResolution.set(row.source_template_id, row);
  }
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
  for (let i = 0; i < evidenceIds.length; i += 100) {
    const { data, error } = await db.from("evidence_sources")
      .select("id,source_type,evidence_grade")
      .in("id", evidenceIds.slice(i, i + 100));
    if (error) throw error;
    for (const row of data || []) vehicleEvidenceById.set(Number(row.id), row);
  }
  const seenCanonical = new Set<number>();
  templates = templates.filter((t: any) => {
    const key = Number(sourceResolution.get(t.id).timetable_id);
    if (seenCanonical.has(key)) return false;
    seenCanonical.add(key);
    return true;
  });

  const byTemplate = new Map<number, any[]>();
  // Keep URL/IN-list bounded; individual batches still page if stops exceed 700.
  for (let pos = 0; pos < templates.length; pos += 100) {
    const ids = templates.slice(pos, pos + 100).map(t => t.id);
    const stops = await pages((first, last) => db.from("manual_timetable_template_stops")
      .select("template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock")
      .in("template_id", ids).order("template_id").order("stop_sequence").range(first, last));
    for (const stop of stops) {
      const list = byTemplate.get(stop.template_id) || [];
      list.push(stop);
      byTemplate.set(stop.template_id, list);
    }
  }

  // Only preverified continuation chains receive a merged end-to-end station
  // sequence. Never join trains here by time, number, or neighboring station.
  const canonicalStopsById = new Map<number, any[]>();
  const connectedIds = [...new Set(templates
    .map((t: any) => sourceResolution.get(t.id))
    .filter((m: any) => m?.group_evidence === "verified_continuation")
    .map((m: any) => Number(m.timetable_id)))];
  for (let i = 0; i < connectedIds.length; i += 30) {
    const ids = connectedIds.slice(i, i + 30);
    const rows = await pages((first, last) => db.from("train_timetable_stops")
      .select("timetable_id,stop_sequence,station_urn,arrival_clock,departure_clock,source_template_id,line_key,train_number")
      .in("timetable_id", ids)
      .order("timetable_id").order("stop_sequence").range(first, last));
    for (const row of rows) {
      const stops = canonicalStopsById.get(row.timetable_id) || [];
      stops.push(row);
      canonicalStopsById.set(row.timetable_id, stops);
    }
  }
  if (connectedIds.some(id => !(canonicalStopsById.get(id) || []).length)) {
    throw new Error("CANONICAL_CONTINUATION_STOPS_UNAVAILABLE");
  }
  // A verified SQL train can traverse two physical source lines. Return the
  // actual member lines with its canonical ID, so a live bridge cannot treat a
  // ChuoRapid/ChuoMain trip as a ChuoRapid/Ome trip just because numbers match.
  const canonicalLinesById = new Map<number, string[]>();
  for (let i = 0; i < connectedIds.length; i += 40) {
    const ids = connectedIds.slice(i, i + 40);
    const rows = await pages((first, last) => db.from("train_timetable_lines")
      .select("timetable_id,line_key").in("timetable_id", ids)
      .order("timetable_id").order("line_key").range(first,last));
    for (const row of rows) {
      const list = canonicalLinesById.get(Number(row.timetable_id)) || [];
      if (row.line_key && !list.includes(row.line_key)) list.push(row.line_key);
      canonicalLinesById.set(Number(row.timetable_id),list);
    }
  }
  if (connectedIds.some(id => !(canonicalLinesById.get(id) || []).length)) {
    throw new Error("CANONICAL_CONTINUATION_LINES_UNAVAILABLE");
  }
  // Actual source-specific train numbers may change at Tachikawa/Takao.
  // These are aliases of an already VERIFIED canonical train, NOT additional
  // trains. Never derive aliases by stripping T/H/M from a number.
  const canonicalAliasesById = new Map<number, any[]>();
  if (["ChuoRapid","ChuoMain","ShonanShinjuku","Tokaido","Takasaki","UtsunomiyaJR"].includes(lineId)) {
    const aliasIds = connectedIds.filter(id => {
      const lines = canonicalLinesById.get(id) || [];
      return (lines.includes("ChuoRapid") && lines.includes("ChuoMain")) ||
        (lines.includes("ShonanShinjuku") &&
          ["Tokaido","Takasaki","UtsunomiyaJR"].some(other=>lines.includes(other)));
    });
    for (let i = 0; i < aliasIds.length; i += 40) {
      const ids = aliasIds.slice(i, i + 40);
      const members = await pages((first, last) => db.from("train_timetable_members")
        .select("timetable_id,source_template_id").in("timetable_id",ids)
        .order("timetable_id").order("source_template_id").range(first,last));
      const templateIds = [...new Set(members.map((m:any)=>Number(m.source_template_id)))];
      const sourceTemplates:any[] = [];
      for (let j = 0; j < templateIds.length; j += 100) {
        const batch = templateIds.slice(j, j + 100);
        sourceTemplates.push(...await pages((first,last) => db.from("manual_timetable_templates")
          .select("id,line_key,train_number,railway_urn,direction_urn")
          .in("id",batch).order("id").range(first,last)));
      }
      const templateById = new Map(sourceTemplates.map((m:any)=>[Number(m.id),m]));
      for (const member of members) {
        const source:any = templateById.get(Number(member.source_template_id));
        if (!source || !source.train_number || !source.railway_urn) {
          throw new Error("CANONICAL_TRAIN_NUMBER_ALIAS_SOURCE_UNAVAILABLE");
        }
        const id = Number(member.timetable_id);
        const aliases = canonicalAliasesById.get(id) || [];
        const alias = {line_key:source.line_key,train_number:source.train_number,
          railway_urn:source.railway_urn,direction_urn:source.direction_urn};
        if (!aliases.some((x:any)=>x.line_key===alias.line_key &&
          x.train_number===alias.train_number &&
          x.railway_urn===alias.railway_urn &&
          x.direction_urn===alias.direction_urn)) aliases.push(alias);
        canonicalAliasesById.set(id,aliases);
      }
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
    const officialNumber = resolveJrEastShinkansenNumber(
      t, serviceDate, (byTemplate.get(t.id) || [])[0]);
    return {
      // Only SQL-certified identical itineraries share identity across line sources.
      // Keep separate line records/stops; never dedupe by departure time alone.
      id: "canonical-train-timetable:" + mapped.timetable_id,
      operation_status: isCancelled({ id: "canonical-train-timetable:" + mapped.timetable_id, operator }, lineId, exceptions) ? "cancelled" : "scheduled",
      canonical_timetable_id: mapped.timetable_id,
      canonical_group_evidence: mapped.group_evidence,
      canonical_line_ids: mapped.group_evidence === "verified_continuation"
        ? (canonicalLinesById.get(Number(mapped.timetable_id)) || []) : [],
      canonical_number_aliases: mapped.group_evidence === "verified_continuation"
        ? (canonicalAliasesById.get(Number(mapped.timetable_id)) || []) : [],
      line_id: lineId,
      service_date: serviceDate,
      calendar_type: calendarType(t.calendar_urn),
      service_id: t.calendar_urn,
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
      vehicle_artwork_path: ruleType && !conflict && !publishedPlan
        ? (mapped.vehicle_artwork_path || null) : null,
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
  return json({ ok: true, complete, partial,
    // These counts do not change the existing structural coverage behavior.
    cancelled_runs: validRuns.filter(r => r.operation_status === "cancelled").length,
    official_dated_number_overrides: bosoDatedNumberOverrides,
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

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
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
      db, lineId, serviceDate, source?.timetable_operator || null, []
    );
  } catch (err) {
    console.error("[train-runs] SQL read failed", lineId, String(err));
    return json({ ok: false, error: "DB_QUERY_FAILED" }, 500);
  }

});
