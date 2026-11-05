-- JR West 2026-11 Kodama train-detail pages: four exact A train numbers.
-- 876A and 976A: published 700 series (no suitable JR West 700 PNG).
-- 974A: published 500 series and its verified JR West native generic PNG.
-- 970A: 700 in summary BUT 500 on many explicit November dates.
--        This train is NOT assigned a calendar-wide vehicle plan/PNG.
-- Keep source template clocks, service names, and actual carset unchanged.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
DO $official2611$
DECLARE
  o record;
  v_template_id bigint;
  v_timetable_id bigint;
  v_evidence_id bigint;
  v_png_path text;
BEGIN
  FOR o IN SELECT * FROM (VALUES
    ('こだま876','876A','700系','18:53','Hiroshima','20:33',
     'https://timetable.jr-odekake.net/train-timetable/315601?date=20261119',
     'jrwest-2611-kodama-876a-700'),
    ('こだま970','970A',NULL::text,'19:25','Shin-Osaka','23:18',
     'https://timetable.jr-odekake.net/train-timetable/315611?date=20261104',
     'jrwest-2611-kodama-970a-dated-700-500'),
    ('こだま974','974A','500系','20:32','Okayama','23:21',
     'https://timetable.jr-odekake.net/train-timetable/315621?date=20261120',
     'jrwest-2611-kodama-974a-500'),
    ('こだま976','976A','700系','21:30','Fukuyama','23:36',
     'https://timetable.jr-odekake.net/train-timetable/315631?date=20261101',
     'jrwest-2611-kodama-976a-700')
  ) AS row_(service_name,number_full,planned_model,first_dep,last_station,last_arr,official_url,source_key)
  LOOP
    SELECT m.id,mem.timetable_id INTO STRICT v_template_id,v_timetable_id
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
      AND mem.member_role='primary'
    JOIN public.train_timetables tt ON tt.id=mem.timetable_id
      AND tt.group_evidence='source_only'
    WHERE m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.train_number=o.service_name
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND m.direction_urn='odpt.RailDirection:Inbound'
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.Hakata'
          AND s.departure_clock=o.first_dep)
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||o.last_station
          AND s.arrival_clock=o.last_arr);

    INSERT INTO public.published_train_number_evidence
      (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
       official_source_url,verification_scope)
    VALUES ('2611','SanyoShinkansen','odpt.Calendar:Weekday',
      'odpt.RailDirection:Inbound',o.number_full,v_template_id,
      o.official_url,'train_number_only')
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.published_train_number_evidence e
      WHERE e.edition='2611' AND e.source_template_id=v_template_id
        AND e.train_number=o.number_full AND e.official_source_url=o.official_url) THEN
      RAISE EXCEPTION 'Official train number mismatch: %',o.service_name;
    END IF;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT COALESCE(MAX(id),0)+1 FROM public.evidence_sources),
      o.source_key,o.official_url,'official','A',
      CASE WHEN o.planned_model IS NULL THEN
        'JR West 2611 Kodama 970A: schedule header 700 series but November date exceptions explicitly substitute 500 series; NO unique calendar-wide planned model or PNG'
      ELSE
        'JR West 2611 Kodama '||o.number_full||': published '||o.planned_model||
        ' planned vehicle; no actual-day formation identity'
      END
    WHERE NOT EXISTS (SELECT 1 FROM public.evidence_sources es
      WHERE es.source_key=o.source_key)
    ON CONFLICT DO NOTHING;
    SELECT es.id INTO STRICT v_evidence_id FROM public.evidence_sources es
      WHERE es.source_key=o.source_key AND es.source_url=o.official_url
        AND es.source_type='official' AND es.evidence_grade='A';

    IF o.planned_model IS NOT NULL THEN
      INSERT INTO public.train_timetable_vehicle_mappings
        (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
         source_path,actual_vehicle_confirmed)
      VALUES (v_timetable_id,v_template_id,o.planned_model,
        'official_service_vehicle_plan',v_evidence_id,
        'official-2611:'||o.official_url,false)
      ON CONFLICT (timetable_id) DO NOTHING;
      IF NOT EXISTS (SELECT 1 FROM public.train_timetable_vehicle_mappings v
        WHERE v.timetable_id=v_timetable_id AND v.source_template_id=v_template_id
          AND v.vehicle_type=o.planned_model AND v.source_id=v_evidence_id
          AND v.mapping_level='official_service_vehicle_plan'
          AND v.actual_vehicle_confirmed=false) THEN
        RAISE EXCEPTION 'Official model mismatch for %',o.service_name;
      END IF;
    ELSE
      -- Do not leave a possibly stale fixed-car plan on mixed 970A.
      IF EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
        WHERE v.source_template_id=v_template_id) THEN
        RAISE EXCEPTION 'Mixed-date % unexpectedly has a fixed model plan',o.service_name;
      END IF;
    END IF;

    IF o.planned_model='500系' THEN
      SELECT '../'||a.image_path INTO STRICT v_png_path
      FROM public.vehicle_image_assets a
      WHERE a.operator='JR-West' AND a.vehicle_type='500系'
        AND a.image_path='images/列车/JR西日本/JR西日本_500系.png'
        AND a.asset_status='available' AND a.file_format_status='native_png'
        AND a.is_generic=true;
      INSERT INTO public.published_train_png_number_ranges
        (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
         png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
      VALUES ('2611','SanyoShinkansen','weekday_verified_single_number',
        substring(o.number_full from '^[0-9]+')::int,
        substring(o.number_full from '^[0-9]+')::int,'A','500系',
        v_png_path,o.official_url,true,false)
      ON CONFLICT DO NOTHING;
      IF NOT EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
        WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
          AND p.min_number=substring(o.number_full from '^[0-9]+')::int
          AND p.max_number=p.min_number AND p.suffix='A'
          AND p.vehicle_model='500系' AND p.png_reference=v_png_path
          AND p.requires_exact_roster AND p.actual_vehicle_confirmed=false) THEN
        RAISE EXCEPTION 'Missing scoped 500-series PNG for %',o.service_name;
      END IF;
    END IF;
  END LOOP;
END
$official2611$;
COMMIT;
