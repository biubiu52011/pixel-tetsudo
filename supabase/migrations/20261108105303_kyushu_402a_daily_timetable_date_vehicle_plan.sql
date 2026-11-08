-- JR Kyushu official November 2026 Sakura 402 / 402A.
-- The published page gives one daily timetable and a date-variable planned
-- model: N700 series normally, 800 series on November 21 and 23.
-- These are planned timetable models, never actual dispatched formations.
-- Keep all vehicle facts date-scoped; do not create a static mapping or PNG
-- range that would incorrectly paint every November service as one model.
BEGIN;
SELECT pg_advisory_xact_lock(2611,402);
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.train_vehicle_date_rules IN SHARE ROW EXCLUSIVE MODE;

DO $kyushu_402a_daily_plan$
DECLARE
  template_ bigint;
  timetable_ bigint;
  source_ bigint;
  changed_ integer;
  prior_route_ text;
  derived_route_ text;
  expected_route_ text;
  station_names_ text[] := ARRAY[
    'Kagoshima-Chuo','Sendai','Sendai','Izumi','Izumi',
    'Shin-Minamata','Shin-Minamata','Shin-Yatsushiro','Shin-Yatsushiro',
    'Kumamoto','Kumamoto','Kurume','Kurume','Shin-Tosu','Shin-Tosu','Hakata'
  ]::text[];
  event_kinds_ text[] := ARRAY[
    'D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A'
  ]::text[];
  clocks_ text[] := ARRAY[
    '11:14','11:25','11:26','11:37','11:38','11:44','11:45','12:02',
    '12:03','12:16','12:17','12:39','12:40','12:44','12:45','12:57'
  ]::text[];
  i integer;
BEGIN
  IF array_length(station_names_,1)<>16
     OR array_length(event_kinds_,1)<>16
     OR array_length(clocks_,1)<>16
  THEN RAISE EXCEPTION 'Sakura 402 official event sequence malformed'; END IF;

  SELECT m.id,member.timetable_id INTO STRICT template_,timetable_
  FROM public.manual_timetable_templates m
  JOIN public.train_timetable_members member
    ON member.source_template_id=m.id
   AND member.member_role='primary'
   AND member.first_stop_sequence=0
   AND member.last_stop_sequence=8
   AND member.stop_offset=0
   AND member.merge_first_stop=false
  JOIN public.train_timetables tt
    ON tt.id=member.timetable_id
   AND tt.group_evidence='source_only'
   AND tt.primary_train_number='さくら402'
  WHERE m.id=128984
    AND m.line_key='KyushuShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND m.direction_urn='odpt.RailDirection:Inbound'
    AND m.train_number='さくら402'
    AND m.source_trip_id='jrkyushu:20260314:p2:kyushu:さくら402'
    AND m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'
    AND (SELECT count(*) FROM public.train_timetable_members x
         WHERE x.timetable_id=member.timetable_id)=1;

  IF (SELECT count(*) FROM public.published_train_number_evidence e
      WHERE e.edition='2611' AND e.line_key='KyushuShinkansen'
        AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
        AND e.direction_urn='odpt.RailDirection:Inbound'
        AND e.train_number='402A' AND e.source_template_id=template_
        AND e.official_source_url='https://www.jrkyushu-timetable.jp/sp/2611/0034/00349401.html?d=20261101&t=2900700'
        AND e.verification_scope='train_number_only')<>1
  THEN RAISE EXCEPTION 'Sakura 402 official number evidence missing'; END IF;

  prior_route_:=(SELECT string_agg(
    regexp_replace(coalesce(s.arrival_station_urn,s.departure_station_urn),'^.*[.]','')
      ||'@'||coalesce(s.arrival_clock,s.departure_clock)||'#'||
      CASE WHEN s.departure_station_urn IS NOT NULL THEN 'D' ELSE 'A' END,
    '|' ORDER BY s.stop_sequence)
    FROM public.manual_timetable_template_stops s
    WHERE s.template_id=template_);
  IF prior_route_<>'Kagoshima-Chuo@11:14#D|Sendai@11:26#D|Izumi@11:38#D|Shin-Minamata@11:45#D|Shin-Yatsushiro@12:03#D|Kumamoto@12:17#D|Kurume@12:40#D|Shin-Tosu@12:45#D|Hakata@12:57#A'
     OR (SELECT count(*) FROM public.train_timetable_stops s
         WHERE s.source_template_id=template_ AND s.timetable_id=timetable_)<>9
  THEN RAISE EXCEPTION 'Sakura 402 prior timetable changed'; END IF;

  DELETE FROM public.manual_timetable_template_stops
  WHERE template_id=template_;
  GET DIAGNOSTICS changed_=ROW_COUNT;
  IF changed_<>9 THEN RAISE EXCEPTION 'Sakura 402 old event deletion mismatch'; END IF;

  FOR i IN 1..16 LOOP
    IF NOT EXISTS(SELECT 1 FROM public.stations s WHERE s.id=station_names_[i])
    THEN RAISE EXCEPTION 'Unknown Sakura 402 station %',station_names_[i]; END IF;
    IF event_kinds_[i]='D' THEN
      INSERT INTO public.manual_timetable_template_stops
        (template_id,stop_sequence,departure_station_urn,departure_clock)
      VALUES(template_,i-1,
        'odpt.Station:JR-Kyushu.KyushuShinkansen.'||station_names_[i],clocks_[i]);
    ELSE
      INSERT INTO public.manual_timetable_template_stops
        (template_id,stop_sequence,arrival_station_urn,arrival_clock)
      VALUES(template_,i-1,
        'odpt.Station:JR-Kyushu.KyushuShinkansen.'||station_names_[i],clocks_[i]);
    END IF;
  END LOOP;

  UPDATE public.train_timetable_members member
  SET last_stop_sequence=15
  WHERE member.timetable_id=timetable_ AND member.source_template_id=template_
    AND member.first_stop_sequence=0 AND member.last_stop_sequence=8;
  GET DIAGNOSTICS changed_=ROW_COUNT;
  IF changed_<>1 THEN RAISE EXCEPTION 'Sakura 402 member stop range mismatch'; END IF;

  UPDATE public.manual_timetable_templates m
  SET operating_dates=ARRAY(SELECT generate_series(
    '2026-11-01'::date,'2026-11-30'::date,interval '1 day')::date)
  WHERE m.id=template_
    AND (m.operating_dates IS NULL OR m.operating_dates=ARRAY(SELECT generate_series(
      '2026-11-01'::date,'2026-11-30'::date,interval '1 day')::date));
  GET DIAGNOSTICS changed_=ROW_COUNT;
  IF changed_<>1 THEN RAISE EXCEPTION 'Sakura 402 daily date whitelist conflict'; END IF;

  UPDATE public.train_timetables tt SET timetable_validity='date_verified'
  WHERE tt.id=timetable_ AND tt.group_evidence='source_only'
    AND tt.primary_train_number='さくら402'
    AND tt.timetable_validity IN ('undated_not_current_verified','date_verified');
  GET DIAGNOSTICS changed_=ROW_COUNT;
  IF changed_<>1 THEN RAISE EXCEPTION 'Sakura 402 validity state conflict'; END IF;

  derived_route_:=(SELECT string_agg(
    regexp_replace(s.station_urn,'^.*[.]','')||'@'||
      coalesce(s.arrival_clock,s.departure_clock)||'#'||
      CASE WHEN s.departure_station_urn IS NOT NULL THEN 'D' ELSE 'A' END,
    '|' ORDER BY s.stop_sequence)
    FROM public.train_timetable_stops s
    WHERE s.source_template_id=template_ AND s.timetable_id=timetable_);
  expected_route_:=(SELECT string_agg(station_names_[j]||'@'||clocks_[j]||'#'||event_kinds_[j],
    '|' ORDER BY j) FROM generate_subscripts(station_names_,1) j);
  IF derived_route_<>expected_route_
     OR (SELECT count(*) FROM public.train_timetable_stops s
         WHERE s.source_template_id=template_ AND s.timetable_id=timetable_)<>16
  THEN RAISE EXCEPTION 'Sakura 402 derived timetable mismatch'; END IF;

  INSERT INTO public.evidence_sources
    (id,source_key,source_url,source_type,evidence_grade,notes)
  SELECT (SELECT coalesce(max(id),0)+1 FROM public.evidence_sources),
    'jrkyushu-2611-sakura-402a-date-variable-plan',
    'https://www.jrkyushu-timetable.jp/sp/2611/0034/00349401.html?d=20261101&t=2900700',
    'official','A',
    'Official November 2026 Sakura 402 / 402A timetable: N700 series normally; 800 series on November 21 and 23. Planned model only, never actual formation.'
  WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources e
    WHERE e.source_key='jrkyushu-2611-sakura-402a-date-variable-plan');

  SELECT id INTO STRICT source_ FROM public.evidence_sources
  WHERE source_key='jrkyushu-2611-sakura-402a-date-variable-plan'
    AND source_url='https://www.jrkyushu-timetable.jp/sp/2611/0034/00349401.html?d=20261101&t=2900700'
    AND source_type='official' AND evidence_grade='A';

  IF EXISTS(
    WITH desired AS (
      SELECT d::date AS valid_date,
        CASE WHEN extract(day FROM d) IN (21,23) THEN '800系' ELSE 'N700系' END AS vehicle_type
      FROM generate_series('2026-11-01'::date,'2026-11-30'::date,interval '1 day') d
    )
    SELECT 1 FROM public.train_vehicle_date_rules r
    JOIN desired d ON d.valid_date=r.valid_date
    WHERE r.train_number='402A'
      AND (r.operator IS DISTINCT FROM 'JR-Kyushu'
        OR r.network_key IS DISTINCT FROM 'odpt.Railway:JR-Kyushu.KyushuShinkansen'
        OR r.service_name IS DISTINCT FROM 'さくら402'
        OR r.direction IS DISTINCT FROM 'odpt.RailDirection:Inbound'
        OR r.vehicle_type IS DISTINCT FROM d.vehicle_type
        OR r.source_id IS DISTINCT FROM source_)
  ) THEN RAISE EXCEPTION 'Conflicting preexisting Sakura 402 date vehicle rule'; END IF;

  WITH desired AS (
    SELECT d::date AS valid_date,
      CASE WHEN extract(day FROM d) IN (21,23) THEN '800系' ELSE 'N700系' END AS vehicle_type
    FROM generate_series('2026-11-01'::date,'2026-11-30'::date,interval '1 day') d
  ), missing AS (
    SELECT d.* FROM desired d
    WHERE NOT EXISTS(SELECT 1 FROM public.train_vehicle_date_rules r
      WHERE r.operator='JR-Kyushu'
        AND r.network_key='odpt.Railway:JR-Kyushu.KyushuShinkansen'
        AND r.train_number='402A' AND r.service_name='さくら402'
        AND r.valid_date=d.valid_date)
  ), numbered AS (
    SELECT m.*,row_number() OVER(ORDER BY m.valid_date) AS rn FROM missing m
  ), base AS (
    SELECT coalesce(max(id),0) AS max_id FROM public.train_vehicle_date_rules
  )
  INSERT INTO public.train_vehicle_date_rules
    (id,operator,network_key,train_number,service_name,direction,
     vehicle_type,valid_date,source_id)
  SELECT base.max_id+n.rn,'JR-Kyushu',
    'odpt.Railway:JR-Kyushu.KyushuShinkansen','402A','さくら402',
    'odpt.RailDirection:Inbound',n.vehicle_type,n.valid_date,source_
  FROM numbered n CROSS JOIN base;

  IF (SELECT count(*) FROM public.train_vehicle_date_rules r
      WHERE r.operator='JR-Kyushu'
        AND r.network_key='odpt.Railway:JR-Kyushu.KyushuShinkansen'
        AND r.train_number='402A' AND r.service_name='さくら402'
        AND r.direction='odpt.RailDirection:Inbound'
        AND r.valid_date BETWEEN '2026-11-01' AND '2026-11-30'
        AND r.source_id=source_)<>30
     OR (SELECT count(*) FROM public.train_vehicle_date_rules r
         WHERE r.train_number='402A' AND r.valid_date BETWEEN '2026-11-01' AND '2026-11-30'
           AND r.vehicle_type='800系')<>2
     OR (SELECT count(*) FROM public.train_vehicle_date_rules r
         WHERE r.train_number='402A' AND r.valid_date BETWEEN '2026-11-01' AND '2026-11-30'
           AND r.vehicle_type='N700系')<>28
  THEN RAISE EXCEPTION 'Sakura 402 date vehicle rule coverage mismatch'; END IF;

  IF (SELECT count(DISTINCT a.image_path) FROM public.vehicle_image_assets a
      WHERE a.operator='JR-Kyushu' AND a.vehicle_type='800系'
        AND a.is_generic=true AND a.asset_status='available'
        AND a.file_format_status='native_png')<>1
  THEN RAISE EXCEPTION 'JR Kyushu 800 generic PNG must be uniquely available'; END IF;

  IF EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
            WHERE v.timetable_id=timetable_)
     OR EXISTS(SELECT 1 FROM public.published_train_png_number_ranges p
       WHERE p.edition='2611' AND p.line_key='KyushuShinkansen'
         AND p.min_number=402 AND p.max_number=402 AND p.suffix='A')
  THEN RAISE EXCEPTION 'Sakura 402 must not have an unscoped vehicle or PNG mapping'; END IF;
END $kyushu_402a_daily_plan$;
COMMIT;
