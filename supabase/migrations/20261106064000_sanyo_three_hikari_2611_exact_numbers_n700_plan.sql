-- JR East 2611 / JR West Nov 2026 published SHINKANSEN planned Hikari.
-- Source-scoped: official full number + station clocks + timetable owner.
-- N700系 here is official planned model family, NOT a physical carset,
-- subseries, depot owner, formation, or date-confirmed real operation.
-- No new PNG range because N700-family owner/subseries is unresolved.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
DO $shinkansen_plan$
DECLARE
  r record;
  source_template bigint;
  timetable_key bigint;
  source_key_id bigint;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('ひかり682','682A','Hakata','20:52','Shin-Osaka','23:32',
      'https://timetable.jr-odekake.net/train-timetable/314441?date=20261103'),
    ('ひかり704','704A','Okayama','09:36','Shin-Osaka','10:46',
      'https://timetables.jreast.co.jp/2611/train/125/128731.html'),
    ('ひかり720','720A','Okayama','17:36','Shin-Osaka','18:46',
      'https://timetables.jreast.co.jp/2611/train/125/128811.html')
  ) AS x(service_name,full_number,first_station,first_departure,
         last_station,last_arrival,official_url)
  LOOP
    SELECT m.id,tm.timetable_id INTO STRICT source_template,timetable_key
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members tm
      ON tm.source_template_id=m.id AND tm.member_role='primary'
    JOIN public.train_timetables tt
      ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
    WHERE m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.train_number=r.service_name
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND m.direction_urn='odpt.RailDirection:Inbound'
      AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||r.first_station
          AND s.departure_clock=r.first_departure)
      AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||r.last_station
          AND s.arrival_clock=r.last_arrival);

    INSERT INTO public.published_train_number_evidence
      (edition,line_key,calendar_urn,direction_urn,train_number,
       source_template_id,official_source_url,verification_scope)
    SELECT '2611','SanyoShinkansen','odpt.Calendar:Weekday',
      'odpt.RailDirection:Inbound',r.full_number,
      source_template,r.official_url,'train_number_only'
    WHERE NOT EXISTS(SELECT 1 FROM public.published_train_number_evidence e
      WHERE e.edition='2611' AND e.source_template_id=source_template);

    IF (SELECT count(*) FROM public.published_train_number_evidence e
      WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
        AND e.calendar_urn='odpt.Calendar:Weekday'
        AND e.direction_urn='odpt.RailDirection:Inbound'
        AND e.train_number=r.full_number
        AND e.source_template_id=source_template
        AND e.official_source_url=r.official_url
        AND e.verification_scope='train_number_only')<>1
    THEN RAISE EXCEPTION 'Published number conflict %',r.full_number; END IF;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT coalesce(max(id),0)+1 FROM public.evidence_sources),
      'jr-2611-hikari-'||lower(r.full_number)||'-n700-planned',
      r.official_url,'official','A',
      'November 2026 official Hikari full A number and N700-series planned family; precise first/last stations and clocks verified against source_only template. Not actual physical formation; no owner-specific or N700S PNG.'
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources s
      WHERE s.source_key='jr-2611-hikari-'||lower(r.full_number)||'-n700-planned')
    ON CONFLICT DO NOTHING;

    SELECT id INTO STRICT source_key_id FROM public.evidence_sources
    WHERE source_key='jr-2611-hikari-'||lower(r.full_number)||'-n700-planned'
      AND source_url=r.official_url AND source_type='official'
      AND evidence_grade='A';

    INSERT INTO public.train_timetable_vehicle_mappings
      (timetable_id,source_template_id,vehicle_type,mapping_level,
       source_id,source_path,actual_vehicle_confirmed)
    VALUES (timetable_key,source_template,'N700系',
      'official_service_vehicle_plan',source_key_id,
      'official-2611:'||r.official_url,false)
    ON CONFLICT (timetable_id) DO NOTHING;

    IF (SELECT count(*) FROM public.train_timetable_vehicle_mappings v
      WHERE v.timetable_id=timetable_key
        AND v.source_template_id=source_template
        AND v.vehicle_type='N700系'
        AND v.mapping_level='official_service_vehicle_plan'
        AND v.source_id=source_key_id
        AND v.actual_vehicle_confirmed=false)<>1
    THEN RAISE EXCEPTION 'Planned stock mismatch %',r.full_number; END IF;
  END LOOP;
END $shinkansen_plan$;
COMMIT;
