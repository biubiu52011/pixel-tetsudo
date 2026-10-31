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
  if (!['dated_schedule_rule','dated_operation_owner'].includes(mapped.mapping_level)) return '';
  // A historical timetable mapping cannot certify a newly published diagram.
  // Keep its source label as a candidate until the matching revision is checked.
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
      .select("timetable_id,stop_sequence,station_urn,arrival_clock,departure_clock")
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

  const result = templates.map((t) => {
    const operator = timetableOperator || /^odpt\.Railway:([^.]+)\./.exec(t.railway_urn || "")?.[1] || "";
    const mapped = sourceResolution.get(t.id);
    const ownerFromUrn = /^odpt\.Railway:([^.]+)\./.exec(String(t.railway_urn || ""))?.[1] || "";
    const candidateKey = ownerFromUrn + "\u0000" + String(t.vehicle_type_label || "").trim();
    const candidateImages = mapped.mapping_level === "source_single_type_candidate"
      ? (candidateArtworkByOwnerModel.get(candidateKey) || []) : [];
    const candidateArtwork = candidateImages.length === 1 ? candidateImages[0] : null;
    const ruleType = scheduleVehicleType(mapped,selectedRevision);
    const verifiedBoundaryType = String(boundaryVehicle.get(t.id) || "");
    const conflict = !!(ruleType && verifiedBoundaryType && ruleType !== verifiedBoundaryType);
    const exactScheduleType = conflict ? "" : (ruleType || verifiedBoundaryType);
    const scheduleLevel = conflict ? "conflicting_scheduled_evidence"
      : ruleType ? mapped.mapping_level
      : verifiedBoundaryType ? "verified_scheduled_boundary"
      : mapped.mapping_level || "unresolved";
    const completeStops = mapped.group_evidence === "verified_continuation"
      ? canonicalStopsById.get(mapped.timetable_id) : null;
    return {
      // Only SQL-certified identical itineraries share identity across line sources.
      // Keep separate line records/stops; never dedupe by departure time alone.
      id: "canonical-train-timetable:" + mapped.timetable_id,
      operation_status: isCancelled({ id: "canonical-train-timetable:" + mapped.timetable_id, operator }, lineId, exceptions) ? "cancelled" : "scheduled",
      canonical_timetable_id: mapped.timetable_id,
      canonical_group_evidence: mapped.group_evidence,
      line_id: lineId,
      service_date: serviceDate,
      calendar_type: calendarType(t.calendar_urn),
      service_id: t.calendar_urn,
      trip_id: "canonical-train-timetable:" + mapped.timetable_id,
      plan_source: "sql-recurring-timetable",
      operator, network_key: t.railway_urn,
      train_number: t.train_number,
      operation_code: mapped.operation_code || "",
      operation_owner: mapped.operation_owner || null,
      operation_owner_source_url: mapped.operation_owner_source_url || null,
      rail_direction: t.direction_urn,
      train_type: t.train_type_urn,
      destination_station: t.destination_urns?.[0] || null,
      // A single source label is a candidate, not observed rolling stock.
      // Only decisive, source-dated timetable rules may identify a planned type.
      vehicle_type_label: exactScheduleType || null,
      vehicle_type_candidates: t.vehicle_type_label || null,
      vehicle_candidate_artwork_path: candidateArtwork,
      vehicle_candidate_artwork_status: candidateArtwork
        ? "historical-single-model-operator-generic-unverified" : null,
      vehicle_mapping_level: scheduleLevel,
      vehicle_evidence_source: ruleType && !conflict ? (mapped.mapping_level === "dated_operation_owner" ? "database-dated-operation-owner" : "database-dated-schedule-rule")
        : verifiedBoundaryType && !conflict ? "verified-scheduled-boundary:Rinkai/Osaki" : null,
      vehicle_evidence_source_id: ruleType && !conflict ? mapped.vehicle_source_id : null,
      vehicle_evidence_url: ruleType && !conflict ? mapped.vehicle_source_url : null,
      // Only source-dated unique model PNG; never a guessed formation/livery.
      vehicle_artwork_path: ruleType && !conflict ? (mapped.vehicle_artwork_path || null) : null,
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
          arrival_time: sqlTime(s.arrival_clock),
          departure_time: sqlTime(s.departure_clock),
          arrival_minute: minuteOf(s.arrival_clock),
          departure_minute: minuteOf(s.departure_clock),
        };
      }),
    };
  });
  await linkPlannedOperations(db,result,selectedRevision);
  // Incomplete source rows are preserved in SQL for auditing, but must not
  // suppress other source-verified trains for the same railway/calendar.
  // Never extrapolate a missing stop or report full coverage for a partial set.
  // At least two observed station clocks are required for estimating a
  // moving train. An untimed boundary stop must never become a made-up ETA.
  const validRuns = result.filter(r => r.stops.length >= 2 &&
    r.stops.every(s => !!s.station_urn) &&
    r.stops.filter(s => s.arrival_time || s.departure_time).length >= 2);
  let omittedIncompleteRuns = result.length - validRuns.length;
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
  const complete = validRuns.length > 0 && omittedIncompleteRuns === 0 && !sourceSampleOnly;
  const partial = validRuns.length > 0 && (omittedIncompleteRuns > 0 || sourceSampleOnly);
  const dateVerifiedRuns = validRuns.filter(r => r.timetable_date_verified).length;
  return json({ ok: true, complete, partial,
    // These counts do not change the existing structural coverage behavior.
    cancelled_runs: validRuns.filter(r => r.operation_status === "cancelled").length,
    date_verified_runs: dateVerifiedRuns,
    date_unverified_runs: validRuns.length - dateVerifiedRuns,
    cache: complete ? "HIT" : partial ? "PARTIAL" : "MISS",
    source: "DATABASE_MANUAL_TEMPLATES", line_id: lineId, service_date: serviceDate,
    source_coverage: sourceSampleOnly ? "verified-partial-sample" : "calendar-template",
    revision:selectedRevision,plan_status:selectedRevision ? 'published_revision' : 'unverified',
    calendar_status: "selected", selected_calendar: selectedCalendar,
    omitted_incomplete_runs: omittedIncompleteRuns, runs: validRuns });
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
