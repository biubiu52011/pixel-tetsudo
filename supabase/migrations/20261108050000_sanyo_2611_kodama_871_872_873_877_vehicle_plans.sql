-- JR West 2026-11 individual train sheets for four existing Weekday sources.
-- 871A/872A: N700-series 8-car planned stock, no operator-specific PNG.
-- 873A/877A: JR-West 700-series 8-car planned stock and the existing
-- user-supplied generic native PNG. These are published plans, not actual
-- physical formations. Every source is matched by template identity and by
-- its complete ordered arrival/departure event sequence before any write.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.published_train_png_number_ranges IN SHARE ROW EXCLUSIVE MODE;

DO $sanyo2611$
DECLARE
  rec record;
  resolved_template_id bigint;
  resolved_timetable_id bigint;
  resolved_source_id bigint;
  actual_events text[];
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
    (9281::bigint,'こだま871','871A','N700系','Outbound',
      'https://timetable.jr-odekake.net/train-timetable/315411?date=20261104',
      'jrwest-2611-kodama-871a-n700',false,
      ARRAY['D|Kokura|06:34','A|Hakata|06:52']::text[]),
    (9337::bigint,'こだま872','872A','N700系','Inbound',
      'https://timetable.jr-odekake.net/train-timetable/315481?date=20261104',
      'jrwest-2611-kodama-872a-n700',false,
      ARRAY['D|Hakata|09:31','A|Kokura|09:47','D|Kokura|09:48',
        'A|Shin-Shimonoseki|09:56']::text[]),
    (9280::bigint,'こだま873','873A','700系','Outbound',
      'https://timetable.jr-odekake.net/train-timetable/315381?date=20261104',
      'jrwest-2611-kodama-873a-700',true,
      ARRAY['D|Shin-Yamaguchi|06:27','A|Asa|06:37','D|Asa|06:38',
        'A|Shin-Shimonoseki|06:47','D|Shin-Shimonoseki|06:48',
        'A|Kokura|06:56','D|Kokura|06:57','A|Hakata|07:13']::text[]),
    (9282::bigint,'こだま877','877A','700系','Outbound',
      'https://timetable.jr-odekake.net/train-timetable/315401?date=20261104',
      'jrwest-2611-kodama-877a-700',true,
      ARRAY['D|Shin-Yamaguchi|07:05','A|Asa|07:14','D|Asa|07:15',
        'A|Shin-Shimonoseki|07:24','D|Shin-Shimonoseki|07:24',
        'A|Kokura|07:32','D|Kokura|07:33','A|Hakata|07:50']::text[])
  ) AS v(template_id,service_name,full_number,model,rail_direction,
    official_url,source_key,with_png,expected_events)
  LOOP
    SELECT m.id, mem.timetable_id
      INTO STRICT resolved_template_id, resolved_timetable_id
    FROM public.manual_timetable_templates m
    JOIN public.train_timetable_members mem
      ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN public.train_timetables tt
      ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
    WHERE m.id=rec.template_id
      AND m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND m.direction_urn='odpt.RailDirection:'||rec.rail_direction
      AND m.train_number=rec.service_name;

    SELECT array_agg(
      CASE WHEN s.arrival_clock IS NOT NULL
        THEN 'A|'||split_part(s.arrival_station_urn,'.',4)||'|'||s.arrival_clock
        ELSE 'D|'||split_part(s.departure_station_urn,'.',4)||'|'||s.departure_clock
      END ORDER BY s.stop_sequence)
      INTO actual_events
    FROM public.manual_timetable_template_stops s
    WHERE s.template_id=resolved_template_id;

    IF actual_events IS DISTINCT FROM rec.expected_events THEN
      RAISE EXCEPTION '2611 stop-event mismatch for %: expected %, found %',
        rec.full_number,rec.expected_events,actual_events;
    END IF;

    IF (SELECT count(*) FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
          AND e.source_template_id=resolved_template_id
          AND e.calendar_urn='odpt.Calendar:Weekday'
          AND e.direction_urn='odpt.RailDirection:'||rec.rail_direction
          AND e.train_number=rec.full_number)<>1 THEN
      RAISE EXCEPTION 'Missing or conflicting 2611 number proof for %',rec.full_number;
    END IF;

    UPDATE public.published_train_number_evidence e
    SET official_source_url=rec.official_url, verified_at=now()
    WHERE e.edition='2611' AND e.line_key='SanyoShinkansen'
      AND e.source_template_id=resolved_template_id
      AND e.calendar_urn='odpt.Calendar:Weekday'
      AND e.direction_urn='odpt.RailDirection:'||rec.rail_direction
      AND e.train_number=rec.full_number;

    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT (SELECT COALESCE(MAX(id),0)+1 FROM public.evidence_sources),
      rec.source_key,rec.official_url,'official','A',
      'JR West November 2026 individual Kodama '||rec.full_number||
      ': complete published stop sequence and '||rec.model||
      ' planned stock. This does not confirm the actual physical formation.'
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources es
      WHERE es.source_key=rec.source_key)
    ON CONFLICT DO NOTHING;

    SELECT es.id INTO STRICT resolved_source_id
    FROM public.evidence_sources es
    WHERE es.source_key=rec.source_key AND es.source_url=rec.official_url
      AND es.source_type='official' AND es.evidence_grade='A';

    INSERT INTO public.train_timetable_vehicle_mappings
      (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
        source_path,actual_vehicle_confirmed)
    VALUES (resolved_timetable_id,resolved_template_id,rec.model,
      'official_service_vehicle_plan',resolved_source_id,
      'official-2611:'||rec.official_url,false)
    ON CONFLICT (timetable_id) DO NOTHING;

    IF NOT EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings mv
      WHERE mv.timetable_id=resolved_timetable_id
        AND mv.source_template_id=resolved_template_id
        AND mv.vehicle_type=rec.model
        AND mv.mapping_level='official_service_vehicle_plan'
        AND mv.source_id=resolved_source_id
        AND mv.actual_vehicle_confirmed=false) THEN
      RAISE EXCEPTION 'Missing or conflicting vehicle plan for %',rec.full_number;
    END IF;

    code_num:=substring(rec.full_number from '^[0-9]+')::integer;
    IF rec.with_png THEN
      IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
        WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
          AND p.suffix='A' AND code_num BETWEEN p.min_number AND p.max_number
          AND (p.min_number<>code_num OR p.max_number<>code_num
            OR p.png_reference<>'../'||art_path OR p.vehicle_model<>'700系'
            OR p.source_url<>rec.official_url OR NOT p.requires_exact_roster
            OR p.actual_vehicle_confirmed)) THEN
        RAISE EXCEPTION 'Conflicting 700-series PNG proof for %',rec.full_number;
      END IF;

      INSERT INTO public.published_train_png_number_ranges
        (edition,line_key,segment_key,min_number,max_number,suffix,
          vehicle_model,png_reference,source_url,requires_exact_roster,
          actual_vehicle_confirmed)
      VALUES ('2611','SanyoShinkansen','weekday_verified_single_number',
        code_num,code_num,'A','700系','../'||art_path,rec.official_url,true,false)
      ON CONFLICT DO NOTHING;

      IF NOT EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
        WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
          AND p.min_number=code_num AND p.max_number=code_num AND p.suffix='A'
          AND p.vehicle_model='700系' AND p.png_reference='../'||art_path
          AND p.source_url=rec.official_url AND p.requires_exact_roster
          AND NOT p.actual_vehicle_confirmed) THEN
        RAISE EXCEPTION 'Missing exact 700-series PNG proof for %',rec.full_number;
      END IF;
    ELSIF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges p
      WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
        AND p.suffix='A' AND code_num BETWEEN p.min_number AND p.max_number) THEN
      RAISE EXCEPTION 'N700 plan % must remain without an operator-specific PNG',
        rec.full_number;
    END IF;
  END LOOP;
END
$sanyo2611$;

COMMIT;

