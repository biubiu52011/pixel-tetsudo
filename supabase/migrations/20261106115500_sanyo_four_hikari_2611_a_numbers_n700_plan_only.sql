-- JR West 2611 official detail pages: four Hikari services, Okayama
-- to Shin-Osaka SANYO segments only, exact departure and arrival.
-- 702A / 708A / 714A / 718A: scheduled N700-series FAMILY.
-- Do NOT assign a JR-West or JR-Central native PNG without stock-owner/
-- subseries evidence. Do NOT edit manual timetable clocks.
-- Existing Tokaido Shin-Osaka 'departure' is 2 min earlier than the
-- official departure, and Tokyo arrival 1 min later; these East-of-
-- Shin-Osaka templates require a separate source-clock audit, so are
-- explicitly NOT matched or altered by this migration.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
DO $hikari_sanyo$
DECLARE
  r record;
  canonical_source bigint;
  source_template bigint;
  target_timetable bigint;
BEGIN
  FOR r IN SELECT * FROM (VALUES
('ひかり702','702A','08:42','09:46','https://timetable.jr-odekake.net/train-timetable/314471?date=20261111'),
('ひかり708','708A','11:36','12:46','https://timetable.jr-odekake.net/train-timetable/314501?date=20261121'),
('ひかり714','714A','14:36','15:46','https://timetable.jr-odekake.net/train-timetable/314531?date=20261104'),
('ひかり718','718A','16:36','17:46','https://timetable.jr-odekake.net/train-timetable/314551?date=20261122')
  ) AS o(service_name,train_code,okayama_dep,shin_osaka_arr,official_url)
  LOOP
    SELECT m.id,mem.timetable_id INTO STRICT source_template,target_timetable
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members mem
      ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN public.train_timetables tt ON tt.id=mem.timetable_id
      AND tt.group_evidence='source_only'
    WHERE m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.train_number=r.service_name
      AND m.direction_urn='odpt.RailDirection:Inbound'
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id AND s.departure_clock=r.okayama_dep
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.Okayama')
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id AND s.arrival_clock=r.shin_osaka_arr
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka');

    INSERT INTO public.published_train_number_evidence
      (edition,line_key,calendar_urn,direction_urn,train_number,
        source_template_id,official_source_url,verification_scope)
    SELECT '2611','SanyoShinkansen','odpt.Calendar:Weekday',
      'odpt.RailDirection:Inbound',r.train_code,source_template,
      r.official_url,'train_number_only'
    WHERE NOT EXISTS (SELECT 1 FROM public.published_train_number_evidence e
      WHERE e.edition='2611' AND e.source_template_id=source_template);
    IF (SELECT COUNT(*) FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
          AND e.source_template_id=source_template
          AND e.calendar_urn='odpt.Calendar:Weekday'
          AND e.direction_urn='odpt.RailDirection:Inbound'
          AND e.train_number=r.train_code
          AND e.official_source_url=r.official_url
          AND e.verification_scope='train_number_only')<>1 THEN
      RAISE EXCEPTION 'Missing official N700 Hikari number proof for %',r.train_code;
    END IF;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT COALESCE(MAX(id),0)+1 FROM public.evidence_sources),
      'jrwest-2611-hikari-'||lower(r.train_code)||'-n700-family',
      r.official_url,'official','A',
      'JR West 2611 official Hikari '||r.train_code||
      ' lists N700-series scheduled stock, Okayama→Shin-Osaka published segment. No unique owner/subseries/formation or actual deployment verified; no PNG singleton authorized.'
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources es
      WHERE es.source_key='jrwest-2611-hikari-'||lower(r.train_code)||'-n700-family')
    ON CONFLICT DO NOTHING;
    SELECT id INTO STRICT canonical_source FROM public.evidence_sources es
      WHERE es.source_key='jrwest-2611-hikari-'||lower(r.train_code)||'-n700-family'
        AND es.source_url=r.official_url AND es.source_type='official'
        AND es.evidence_grade='A';

    INSERT INTO public.train_timetable_vehicle_mappings
      (timetable_id,source_template_id,vehicle_type,mapping_level,
       source_id,source_path,actual_vehicle_confirmed)
    VALUES (target_timetable,source_template,'N700系',
      'official_service_vehicle_plan',canonical_source,
      'official-2611:'||r.official_url,false)
    ON CONFLICT (timetable_id) DO NOTHING;
    IF (SELECT COUNT(*) FROM public.train_timetable_vehicle_mappings v
        WHERE v.timetable_id=target_timetable AND v.source_template_id=source_template
          AND v.vehicle_type='N700系'
          AND v.mapping_level='official_service_vehicle_plan'
          AND v.source_id=canonical_source AND v.actual_vehicle_confirmed=false)<>1 THEN
      RAISE EXCEPTION 'Missing exact Hikari N700 timetable plan %',r.train_code;
    END IF;
  END LOOP;
END $hikari_sanyo$;
COMMIT;
