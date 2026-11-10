-- JR-Central TokaidoMain / TokaidoCentral: verified train-first SQL import.
-- Existing canonical schema only: NO second schedule table, frontend fallback or invented data.
-- Source authorization must be independently reviewed BEFORE calling this admin-only function.
-- No timetable is imported by this migration. Sampled imports MUST NOT pass full-day acceptance.
BEGIN;

CREATE OR REPLACE FUNCTION public.import_tokaido_central_authorized_plan(p_document jsonb)
RETURNS TABLE(inserted_trains integer, inserted_stops integer)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_source jsonb;
  v_url text;
  v_license text;
  v_license_url text;
  v_edition date;
  v_evidence_id bigint;
  v_source_key text;
  v_source_path text;
  v_train jsonb;
  v_stop jsonb;
  v_number text;
  v_calendar text;
  v_direction text;
  v_type text;
  v_dates date[];
  v_date text;
  v_station text;
  v_last_station text;
  v_first_station text;
  v_idx integer;
  v_prev_idx integer;
  v_prev_clock integer;
  v_current_clock integer;
  v_arr_clock integer;
  v_dep_clock integer;
  v_arr text;
  v_dep text;
  v_sequence integer;
  v_template_id bigint;
  v_timetable_id bigint;
  v_trip_hash text;
  v_existing_hash text;
  v_imported integer := 0;
  v_stops integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(2026111104);
  IF jsonb_typeof(p_document) <> 'object'
     OR jsonb_typeof(p_document->'source') <> 'object'
     OR jsonb_typeof(p_document->'trains') <> 'array'
     OR jsonb_array_length(p_document->'trains') NOT BETWEEN 1 AND 1000
  THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_DOCUMENT'; END IF;

  -- No "website is public => permission exists" inference.
  v_source := p_document->'source';
  v_url := nullif(btrim(v_source->>'url'),'');
  v_license := v_source->>'authorization';
  v_license_url := nullif(btrim(v_source->>'authorization_evidence_url'),'');
  IF v_url IS NULL OR v_url !~ '^https://[^ ]+'
     OR v_license_url IS NULL OR v_license_url !~ '^https://[^ ]+'
     OR v_license NOT IN ('original_compilation','licensed_for_republication')
  THEN RAISE EXCEPTION 'JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED'; END IF;
  IF (v_source->>'edition_date') IS NULL
     OR (v_source->>'edition_date') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
  THEN RAISE EXCEPTION 'JRC_PLAN_EDITION_NOT_DATED'; END IF;
  v_edition := (v_source->>'edition_date')::date;
  IF v_edition > current_date THEN RAISE EXCEPTION 'JRC_PLAN_FUTURE_EDITION'; END IF;
  IF (SELECT count(*) FROM public.line_stations WHERE line_id='TokaidoCentral') <> 84
     OR (SELECT min(station_index) FROM public.line_stations WHERE line_id='TokaidoCentral') <> 0
     OR (SELECT max(station_index) FROM public.line_stations WHERE line_id='TokaidoCentral') <> 83
     OR (SELECT count(DISTINCT station_name) FROM public.line_stations WHERE line_id='TokaidoCentral') <> 84
     OR NOT EXISTS (SELECT 1 FROM public.railway_lines
           WHERE id='TokaidoCentral' AND timetable_operator='JR-Central'
             AND sql_planned_fallback_enabled AND NOT timetable_api_enabled)
  THEN RAISE EXCEPTION 'JRC_PLAN_STATION_REGISTRY_OR_CAPABILITY_CHANGED'; END IF;

  v_source_key := 'jrc-tokaido-central-authorized:'||md5(v_url||'|'||v_license_url||'|'||v_edition::text);
  v_source_path := 'authorized-sql:jrcentral:TokaidoCentral:'||md5(v_source_key);
  INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
  VALUES(v_source_key,v_url,'timetable','B',
         'User-reviewed '||v_license||' source; authorization evidence: '||v_license_url||
         '; edition '||v_edition::text||'; individual-train stop evidence only, not full-day acceptance')
  ON CONFLICT(source_key) DO NOTHING;
  SELECT id INTO v_evidence_id FROM public.evidence_sources WHERE source_key=v_source_key;
  IF v_evidence_id IS NULL OR NOT EXISTS
     (SELECT 1 FROM public.evidence_sources WHERE id=v_evidence_id AND source_url=v_url)
  THEN RAISE EXCEPTION 'JRC_PLAN_EVIDENCE_CONFLICT'; END IF;

  FOR v_train IN SELECT value FROM jsonb_array_elements(p_document->'trains')
  LOOP
    IF jsonb_typeof(v_train)<>'object' THEN
      RAISE EXCEPTION 'JRC_PLAN_BAD_TRAIN'; END IF;
    v_number := v_train->>'train_number';
    v_calendar := v_train->>'calendar_urn';
    v_direction := v_train->>'direction_urn';
    v_type := v_train->>'train_type';
    IF v_number IS NULL OR v_number !~ '^[0-9]{1,5}[A-Z]{0,2}$'
       OR v_calendar NOT IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
       OR v_direction NOT IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
       OR v_type NOT IN ('Local','Rapid','SpecialRapid','LimitedExpress')
       OR jsonb_typeof(v_train->'stops') <> 'array'
       OR jsonb_array_length(v_train->'stops') NOT BETWEEN 2 AND 84
       OR jsonb_typeof(v_train->'operating_dates') <> 'array'
       OR jsonb_array_length(v_train->'operating_dates') NOT BETWEEN 1 AND 62
    THEN RAISE EXCEPTION 'JRC_PLAN_INCOMPLETE_TRAIN:%',coalesce(v_number,'?'); END IF;
    v_dates := ARRAY[]::date[];
    FOR v_date IN SELECT value FROM jsonb_array_elements_text(v_train->'operating_dates')
    LOOP
      IF v_date !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
      THEN RAISE EXCEPTION 'JRC_PLAN_BAD_SERVICE_DATE'; END IF;
      IF v_date::date < v_edition OR v_date::date > current_date + interval '62 days'
      THEN RAISE EXCEPTION 'JRC_PLAN_DATE_OUTSIDE_AUTHORIZED_EDITION'; END IF;
      -- Standard 2026 November calendar, including Culture Day and Labor Thanksgiving Day.
      IF v_date BETWEEN '2026-11-01' AND '2026-11-30' AND
        ((v_calendar='odpt.Calendar:Weekday' AND
           (extract(isodow FROM v_date::date) IN (6,7) OR v_date IN ('2026-11-03','2026-11-23')))
          OR
         (v_calendar='odpt.Calendar:SaturdayHoliday' AND
           extract(isodow FROM v_date::date) BETWEEN 1 AND 5
           AND v_date NOT IN ('2026-11-03','2026-11-23')))
      THEN RAISE EXCEPTION 'JRC_PLAN_SERVICE_CALENDAR_CONFLICT:%',v_date; END IF;
      IF v_date::date = ANY(v_dates) THEN RAISE EXCEPTION 'JRC_PLAN_DUPLICATE_DATE'; END IF;
      v_dates:=array_append(v_dates,v_date::date);
    END LOOP;
    IF cardinality(v_dates)=0 THEN RAISE EXCEPTION 'JRC_PLAN_EMPTY_DATE_SCOPE'; END IF;

    v_prev_idx := NULL;
    v_prev_clock := NULL;
    v_first_station := NULL;
    v_last_station := NULL;
    v_sequence := 0;
    -- Validate the ENTIRE train before inserting any source template.
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station := v_stop->>'station_id';
      SELECT station_index INTO v_idx FROM public.line_stations
       WHERE line_id='TokaidoCentral' AND station_name=v_station;
      IF NOT FOUND THEN RAISE EXCEPTION 'JRC_PLAN_UNKNOWN_STATION:%',coalesce(v_station,'?'); END IF;
      IF v_prev_idx IS NOT NULL AND
         ((v_direction='odpt.RailDirection:Outbound' AND v_idx<=v_prev_idx)
           OR (v_direction='odpt.RailDirection:Inbound' AND v_idx>=v_prev_idx))
      THEN RAISE EXCEPTION 'JRC_PLAN_WRONG_STATION_ORDER:%',v_station; END IF;
      v_arr := NULLIF(v_stop->>'arrival', '');
      v_dep := NULLIF(v_stop->>'departure', '');
      IF (v_arr IS NULL AND v_dep IS NULL)
         OR (v_arr IS NOT NULL AND v_arr !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
         OR (v_dep IS NOT NULL AND v_dep !~ '^([01][0-9]|2[0-9]):[0-5][0-9]$')
      THEN RAISE EXCEPTION 'JRC_PLAN_INVALID_CLOCK:%',v_station; END IF;
      v_arr_clock:=CASE WHEN v_arr IS NULL THEN NULL ELSE substring(v_arr,1,2)::int*60+substring(v_arr,4,2)::int END;
      v_dep_clock:=CASE WHEN v_dep IS NULL THEN NULL ELSE substring(v_dep,1,2)::int*60+substring(v_dep,4,2)::int END;
      v_current_clock:=coalesce(v_arr_clock,v_dep_clock);
      IF (v_prev_clock IS NOT NULL AND v_current_clock<v_prev_clock)
          OR (v_arr_clock IS NOT NULL AND v_dep_clock IS NOT NULL AND v_dep_clock<v_arr_clock)
      THEN RAISE EXCEPTION 'JRC_PLAN_CLOCK_REVERSAL:%',v_station; END IF;
      v_prev_clock:=coalesce(v_dep_clock,v_arr_clock);
      IF v_sequence=0 THEN
        IF v_dep IS NULL THEN RAISE EXCEPTION 'JRC_PLAN_FIRST_STOP_MUST_DEPART'; END IF;
        v_first_station:=v_station;
      END IF;
      v_last_station:=v_station;
      v_prev_idx:=v_idx;
      v_sequence:=v_sequence+1;
    END LOOP;
    IF nullif((v_train->'stops'->(v_sequence-1))->>'arrival','') IS NULL
    THEN RAISE EXCEPTION 'JRC_PLAN_LAST_STOP_MUST_ARRIVE'; END IF;
    v_trip_hash := md5(v_train::text||'|'||v_source_key);
    SELECT source_trip_id INTO v_existing_hash FROM public.manual_timetable_templates
    WHERE line_key='TokaidoCentral' AND source_path=v_source_path
      AND train_number=v_number AND calendar_urn=v_calendar
      AND direction_urn=v_direction
      AND operating_dates && v_dates
    LIMIT 1;
    IF FOUND THEN
      IF v_existing_hash='sha256-equivalent-md5:'||v_trip_hash THEN
        CONTINUE; -- idempotent re-run of the exact evidence row.
      END IF;
      RAISE EXCEPTION 'JRC_PLAN_CONFLICTING_TRAIN_DATES:%',v_number;
    END IF;

    INSERT INTO public.manual_timetable_templates
      (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
       destination_urns,source_path,source_trip_id,source_revision_date,operating_dates)
    VALUES('TokaidoCentral',v_calendar,v_number,'odpt.Railway:JR-Central.TokaidoCentral',
       v_direction,'odpt.TrainType:JR-Central.'||v_type,
       ARRAY['odpt.Station:JR-Central.TokaidoCentral.'||v_last_station]::text[],
       v_source_path,'sha256-equivalent-md5:'||v_trip_hash,v_edition,v_dates)
    RETURNING id INTO v_template_id;
    v_sequence := 0;
    FOR v_stop IN SELECT value FROM jsonb_array_elements(v_train->'stops')
    LOOP
      v_station:=v_stop->>'station_id';
      v_arr:=nullif(v_stop->>'arrival','');
      v_dep:=nullif(v_stop->>'departure','');
      INSERT INTO public.manual_timetable_template_stops
        (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      VALUES(v_template_id,v_sequence,
        CASE WHEN v_arr IS NOT NULL THEN 'odpt.Station:JR-Central.TokaidoCentral.'||v_station END,
        CASE WHEN v_dep IS NOT NULL THEN 'odpt.Station:JR-Central.TokaidoCentral.'||v_station END,
        v_arr,v_dep);
      v_sequence := v_sequence + 1;
      v_stops := v_stops+1;
    END LOOP;
    INSERT INTO public.train_timetables
      (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
       group_evidence,timetable_validity,source_revision_date)
    VALUES('source:'||v_template_id,v_calendar,v_number,v_template_id,
       'source_only','date_verified',v_edition)
    RETURNING id INTO v_timetable_id;
    INSERT INTO public.train_timetable_members
      (source_template_id,timetable_id,segment_order,member_role,
       first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
    VALUES(v_template_id,v_timetable_id,0,'primary',0,v_sequence-1,0,false);
    v_imported := v_imported+1;
  END LOOP;

  -- Importing individual services is never evidence of a full-day roster.
  IF v_imported>0 THEN
    UPDATE public.published_timetable_coverage_audit
    SET template_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='TokaidoCentral'),
        calendar_count=(SELECT count(DISTINCT calendar_urn) FROM public.manual_timetable_templates WHERE line_key='TokaidoCentral'),
        direction_count=(SELECT count(DISTINCT direction_urn) FROM public.manual_timetable_templates WHERE line_key='TokaidoCentral'),
        sampled_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='TokaidoCentral'),
        coverage_status='sampled',checked_at=now(),
        issues=ARRAY['AUTHORIZED_INDIVIDUAL_TRAIN_ROWS_ONLY',
                     'FULL_DAY_WEEKDAY_AND_HOLIDAY_NOT_RECONCILED',
                     'DO_NOT_EXTRAPOLATE_UNVERIFIED_SERVICE_DATES',
                     'NO_ACTUAL_TRAINSET_IDENTITY']::text[]
    WHERE line_key='TokaidoCentral';
  END IF;
  RETURN QUERY SELECT v_imported,v_stops;
END;
$fn$;

-- Admin SQL only. No browser, anon, authenticated or service-role import endpoint.
REVOKE ALL ON FUNCTION public.import_tokaido_central_authorized_plan(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
