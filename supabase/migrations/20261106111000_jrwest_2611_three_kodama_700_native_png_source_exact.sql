-- JR West official 2611 individual train sheets, November 2026.
-- 875A Hiroshima 06:05 Hakata 07:33: daily 700-series 8-car
--   (existing Weekday + missing SaturdayHoliday source-template proof).
-- 956A Hakata 13:51 Shin-Osaka 18:25: 700-series 8-car.
-- 880A Hakata 22:20 Shin-Shimonoseki 22:46: 700-series 8-car.
-- Each source matched on operator, train name, calendar, direction,
-- first/last station clocks, and primary timetable identity.
-- Reuse user-supplied native 82x98 JR-West 700-series PNG. No guessed
-- ranges; no 970A (has dated 500/700 substitution); no actual carset.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.published_train_png_number_ranges IN SHARE ROW EXCLUSIVE MODE;
DO $body$
DECLARE
  rec record;
  linked record;
  verified_count integer;
  existing_count integer;
  source_id_value bigint;
  code_num integer;
  art_path text := 'images/列车/JR西日本/JR西日本_700系.png';
BEGIN
  IF (SELECT count(*) FROM public.vehicle_image_assets a
    WHERE a.operator='JR-West' AND a.vehicle_type='700系'
      AND a.image_path=art_path AND a.asset_status='available'
      AND a.file_format_status='native_png' AND a.is_generic
      AND a.asset_scope='generic')<>1 THEN
    RAISE EXCEPTION 'JR-West native 700-series PNG missing or invalid';
  END IF;

  FOR rec IN SELECT * FROM (VALUES
('こだま875','875A','Hiroshima','06:05','Hakata','07:33','Outbound','2','https://timetable.jr-odekake.net/train-timetable/315371?date=20261108'),
('こだま956','956A','Hakata','13:51','Shin-Osaka','18:25','Inbound','1','https://timetable.jr-odekake.net/train-timetable/315531?date=20261110'),
('こだま880','880A','Hakata','22:20','Shin-Shimonoseki','22:46','Inbound','1','https://timetable.jr-odekake.net/train-timetable/315641?date=20261119')
  ) AS t(service_name,full_number,first_station,first_clock,last_station,last_clock,rail_direction,expected_count,official_url)
  LOOP
    SELECT count(*) INTO verified_count
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members mem
      ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN public.train_timetables tt
      ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
    WHERE m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.train_number=rec.service_name
      AND m.direction_urn='odpt.RailDirection:'||rec.rail_direction
      AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
      AND (rec.service_name='こだま875'
           OR m.calendar_urn='odpt.Calendar:Weekday')
      AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id AND s.departure_clock=rec.first_clock
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||rec.first_station)
      AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
        WHERE s.template_id=m.id AND s.arrival_clock=rec.last_clock
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||rec.last_station);
    IF verified_count<>rec.expected_count::integer THEN
      RAISE EXCEPTION 'Expected % 2611 source templates for %, found %',
        rec.expected_count,rec.full_number,verified_count;
    END IF;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT COALESCE(MAX(id),0)+1 FROM public.evidence_sources),
      'jrwest-2611-kodama-'||lower(rec.full_number)||'-700',
      rec.official_url,'official','A',
      'JR West 2026-11 official individual Kodama '||rec.full_number||
       ': 700-series 8-car planned train, published first/last clocks. This does not confirm actual physical stock.'
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources es
      WHERE es.source_key='jrwest-2611-kodama-'||lower(rec.full_number)||'-700')
    ON CONFLICT DO NOTHING;

    SELECT es.id INTO STRICT source_id_value
    FROM public.evidence_sources es
    WHERE es.source_key='jrwest-2611-kodama-'||lower(rec.full_number)||'-700'
      AND es.source_url=rec.official_url
      AND es.source_type='official' AND es.evidence_grade='A';

    FOR linked IN
      SELECT m.id, m.calendar_urn, m.direction_urn, mem.timetable_id
      FROM public.manual_timetable_templates m
      JOIN public.train_timetable_members mem
        ON mem.source_template_id=m.id AND mem.member_role='primary'
      JOIN public.train_timetables tt
        ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
      WHERE m.line_key='SanyoShinkansen'
        AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
        AND m.train_number=rec.service_name
        AND m.direction_urn='odpt.RailDirection:'||rec.rail_direction
        AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
        AND (rec.service_name='こだま875' OR m.calendar_urn='odpt.Calendar:Weekday')
        AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
          WHERE s.template_id=m.id AND s.departure_clock=rec.first_clock
            AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||rec.first_station)
        AND EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
          WHERE s.template_id=m.id AND s.arrival_clock=rec.last_clock
            AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||rec.last_station)
    LOOP
      IF EXISTS(SELECT 1 FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.source_template_id=linked.id
          AND e.train_number<>rec.full_number) THEN
        RAISE EXCEPTION 'Conflicting official number for %',linked.id;
      END IF;
      INSERT INTO public.published_train_number_evidence
        (edition,line_key,calendar_urn,direction_urn,train_number,
          source_template_id,official_source_url,verification_scope)
      SELECT '2611','SanyoShinkansen',linked.calendar_urn,linked.direction_urn,
        rec.full_number,linked.id,rec.official_url,'train_number_only'
      WHERE NOT EXISTS (SELECT 1 FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.source_template_id=linked.id);
      IF (SELECT count(*) FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
          AND e.source_template_id=linked.id AND e.calendar_urn=linked.calendar_urn
          AND e.direction_urn=linked.direction_urn AND e.train_number=rec.full_number
          AND e.verification_scope='train_number_only')<>1 THEN
        RAISE EXCEPTION 'Missing canonical 2611 number proof %',linked.id;
      END IF;

      INSERT INTO public.train_timetable_vehicle_mappings
        (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
          source_path,actual_vehicle_confirmed)
      VALUES (linked.timetable_id,linked.id,'700系','official_service_vehicle_plan',
        source_id_value,'official-2611:'||rec.official_url,false)
      ON CONFLICT (timetable_id) DO NOTHING;

      IF NOT EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings mv
        WHERE mv.timetable_id=linked.timetable_id
          AND mv.source_template_id=linked.id AND mv.vehicle_type='700系'
          AND mv.mapping_level='official_service_vehicle_plan'
          AND mv.source_id=source_id_value AND mv.actual_vehicle_confirmed=false) THEN
        RAISE EXCEPTION 'Missing or conflicting 700 plan for %',linked.id;
      END IF;
    END LOOP;

    code_num:=substring(rec.full_number from '^[0-9]+')::integer;
    IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
      WHERE p.edition='2611' AND p.line_key='SanyoShinkansen' AND p.suffix='A'
        AND code_num BETWEEN p.min_number AND p.max_number
        AND (p.min_number<>code_num OR p.max_number<>code_num
          OR p.png_reference<>'../'||art_path OR p.vehicle_model<>'700系'
          OR p.source_url<>rec.official_url OR NOT p.requires_exact_roster
          OR p.actual_vehicle_confirmed)) THEN
      RAISE EXCEPTION 'Conflicting 700 PNG for %',rec.full_number;
    END IF;
    INSERT INTO public.published_train_png_number_ranges
      (edition,line_key,segment_key,min_number,max_number,suffix,
        vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
    VALUES ('2611','SanyoShinkansen','source_verified_single_number',
      code_num,code_num,'A','700系','../'||art_path,rec.official_url,true,false)
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
      WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
        AND p.min_number=code_num AND p.max_number=code_num AND p.suffix='A'
        AND p.vehicle_model='700系' AND p.png_reference='../'||art_path
        AND p.requires_exact_roster AND NOT p.actual_vehicle_confirmed) THEN
      RAISE EXCEPTION 'Missing 700 singleton PNG for %',rec.full_number;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
    WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
      AND p.suffix='A' AND p.min_number<=970 AND p.max_number>=970) THEN
    RAISE EXCEPTION '970A has November-specific 500/700 service exceptions; no static PNG';
  END IF;
END $body$;
COMMIT;
