-- JR West 2026-11 individual official timetables, source-scoped.
-- Kodama 944A, 954A: 500-series 8-car, native JR-West generic PNG.
-- Kodama 958A, 966A: 700-series 8-car, NO JR-West native 700 PNG.
-- Proof includes Hakata first-departure and Okayama/Shin-Osaka last arrival.
-- The original source timetable is Weekday; "毎日運転" alone does NOT
-- authorize creating missing SaturdayHoliday manual templates.
-- Official scheduled vehicle type is NOT an actual-day physical formation.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
DO $sanyo2611$
DECLARE
  o record;
  resolved_source_id bigint;
  template_id bigint;
  resolved_timetable_id bigint;
  png_path text;
BEGIN
  FOR o IN SELECT * FROM (VALUES
    ('こだま944','944A','500系','07:49','Okayama','10:55',
     'https://timetable.jr-odekake.net/train-timetable/315471?date=20261128',
     'jrwest-2611-kodama-944a-500'),
    ('こだま954','954A','500系','12:51','Shin-Osaka','17:25',
     'https://timetable.jr-odekake.net/train-timetable/315521?date=20261101',
     'jrwest-2611-kodama-954a-500'),
    ('こだま958','958A','700系','14:54','Shin-Osaka','19:25',
     'https://timetable.jr-odekake.net/train-timetable/315541?date=20261110',
     'jrwest-2611-kodama-958a-700'),
    ('こだま966','966A','700系','17:55','Shin-Osaka','22:20',
     'https://timetable.jr-odekake.net/train-timetable/315591?date=20261101',
     'jrwest-2611-kodama-966a-700')
  ) AS v(service_name,number_full,model,first_dep,last_station,last_arr,source_url,source_key)
  LOOP
    -- Refuse source-name-only matching. Match operator, calendar, direction,
    -- route, first departure and last arrival AND the primary member.
    SELECT m.id, mem.timetable_id INTO STRICT template_id, resolved_timetable_id
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members mem
      ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN public.train_timetables tt
      ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
    WHERE m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND m.direction_urn='odpt.RailDirection:Inbound'
      AND m.train_number=o.service_name
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.Hakata'
          AND s.departure_clock=o.first_dep)
      AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||o.last_station
          AND s.arrival_clock=o.last_arr);

    INSERT INTO public.published_train_number_evidence
      (edition,line_key,calendar_urn,direction_urn,train_number,
       source_template_id,official_source_url,verification_scope)
    VALUES ('2611','SanyoShinkansen','odpt.Calendar:Weekday',
      'odpt.RailDirection:Inbound',o.number_full,template_id,
      o.source_url,'train_number_only')
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
          AND e.source_template_id=template_id
          AND e.train_number=o.number_full
          AND e.official_source_url=o.source_url) THEN
      RAISE EXCEPTION 'Conflicting number evidence for %',o.service_name;
    END IF;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT COALESCE(MAX(id),0)+1 FROM public.evidence_sources),
      o.source_key,o.source_url,'official','A',
      'JR West Nov 2026 individual Kodama train detail, published model '||
      o.model||', actual physical formation not proved'
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources es
      WHERE es.source_key=o.source_key)
    ON CONFLICT DO NOTHING;

    SELECT id INTO STRICT resolved_source_id FROM public.evidence_sources es
    WHERE es.source_key=o.source_key AND es.source_url=o.source_url
      AND es.source_type='official' AND es.evidence_grade='A';

    INSERT INTO public.train_timetable_vehicle_mappings
      (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
       source_path,actual_vehicle_confirmed)
    VALUES (resolved_timetable_id,template_id,o.model,'official_service_vehicle_plan',
       resolved_source_id,'official-2611:'||o.source_url,false)
    ON CONFLICT (timetable_id) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
      WHERE v.timetable_id=resolved_timetable_id AND v.source_template_id=template_id
        AND v.vehicle_type=o.model AND v.source_id=resolved_source_id
        AND v.mapping_level='official_service_vehicle_plan'
        AND v.actual_vehicle_confirmed=false) THEN
      RAISE EXCEPTION 'Conflicting model proof for %',o.service_name;
    END IF;

    IF o.model='500系' THEN
      SELECT '../'||a.image_path INTO STRICT png_path
      FROM public.vehicle_image_assets a
      WHERE a.operator='JR-West' AND a.vehicle_type='500系'
        AND a.image_path='images/列车/JR西日本/JR西日本_500系.png'
        AND a.asset_status='available' AND a.file_format_status='native_png'
        AND a.is_generic=true;
      INSERT INTO public.published_train_png_number_ranges
        (edition,line_key,segment_key,min_number,max_number,suffix,
        vehicle_model,png_reference,source_url,requires_exact_roster,
        actual_vehicle_confirmed)
      VALUES ('2611','SanyoShinkansen','weekday_verified_single_number',
        substring(o.number_full from '^[0-9]+')::int,
        substring(o.number_full from '^[0-9]+')::int,
        'A','500系',png_path,o.source_url,true,false)
      ON CONFLICT DO NOTHING;
      IF NOT EXISTS(SELECT 1 FROM public.published_train_png_number_ranges p
        WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
          AND p.min_number=substring(o.number_full from '^[0-9]+')::int
          AND p.max_number=p.min_number AND p.suffix='A'
          AND p.png_reference=png_path AND p.vehicle_model='500系'
          AND p.source_url=o.source_url AND p.requires_exact_roster
          AND NOT p.actual_vehicle_confirmed) THEN
        RAISE EXCEPTION 'Failed to preserve exact verified 500 PNG for %',o.service_name;
      END IF;
    END IF;
  END LOOP;
END
$sanyo2611$;
COMMIT;
