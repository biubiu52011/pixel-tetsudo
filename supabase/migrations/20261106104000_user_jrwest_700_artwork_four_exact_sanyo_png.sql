-- 2026-11-06: user-supplied JR-West 700-series pixel art, 82x98.
-- The indexed PNG is visually lossless / retains original RGBA pixels.
-- Upload itself is NOT a train-operation or actual-formation proof.
-- Reuse existing source-evidence / canonical vehicle / PNG tables.
-- JR-West 2611 individual official train pages prove exactly four
-- published Weekday Sanyo Kodama 700-series plans, no continuous range.
-- 970A (dated 500/700 substitutions) is deliberately EXCLUDED.
BEGIN;
LOCK TABLE public.vehicle_image_assets IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.published_train_png_number_ranges IN SHARE ROW EXCLUSIVE MODE;
DO $register_jrwest700$
DECLARE
  r record;
  matched_count integer;
  asset_path text := 'images/列车/JR西日本/JR西日本_700系.png';
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets a WHERE a.image_path=asset_path) THEN
    INSERT INTO public.vehicle_image_assets
      (id,operator,vehicle_type,image_path,is_generic,asset_scope,
       asset_status,file_format_status,review_note)
    SELECT COALESCE(MAX(id),0)+1,'JR-West','700系',asset_path,
      true,'generic','available','native_png',
      'User-provided transparent 82x98 pixel illustration; generic planned-model art for SanyoShinkansen only; no dated real train/formation verification.'
    FROM public.vehicle_image_assets;
  END IF;
  IF (SELECT COUNT(*) FROM public.vehicle_image_assets a WHERE
       a.operator='JR-West' AND a.vehicle_type='700系'
       AND a.image_path=asset_path AND a.is_generic
       AND a.asset_scope='generic' AND a.asset_status='available'
       AND a.file_format_status='native_png') <> 1 THEN
    RAISE EXCEPTION 'JR-West 700 native asset inconsistent';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('こだま876','876A','https://timetable.jr-odekake.net/train-timetable/315601?date=20261119'),
    ('こだま958','958A','https://timetable.jr-odekake.net/train-timetable/315541?date=20261110'),
    ('こだま966','966A','https://timetable.jr-odekake.net/train-timetable/315591?date=20261101'),
    ('こだま976','976A','https://timetable.jr-odekake.net/train-timetable/315631?date=20261101')
  ) AS verified(service_name,train_number,source_url)
  LOOP
    SELECT COUNT(*) INTO matched_count
    FROM public.manual_timetable_templates m
    JOIN public.published_train_number_evidence e ON
      e.source_template_id=m.id AND e.edition='2611'
      AND e.line_key='SanyoShinkansen' AND e.train_number=r.train_number
      AND e.official_source_url=r.source_url
      AND e.verification_scope='train_number_only'
    JOIN public.train_timetable_vehicle_mappings v ON v.source_template_id=m.id
      AND v.vehicle_type='700系' AND v.mapping_level='official_service_vehicle_plan'
      AND v.actual_vehicle_confirmed=false
    JOIN public.evidence_sources es ON es.id=v.source_id AND
      es.source_type='official' AND es.evidence_grade='A'
    WHERE m.train_number=r.service_name
      AND m.line_key='SanyoShinkansen'
      AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
      AND m.calendar_urn='odpt.Calendar:Weekday'
      AND m.direction_urn='odpt.RailDirection:Inbound';
    IF matched_count<>1 THEN
      RAISE EXCEPTION 'Cannot identify one existing 2611 JR-West 700 model source for %',r.train_number;
    END IF;
    IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges p
      WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
       AND p.suffix='A'
       AND substring(r.train_number from '^[0-9]+')::integer
           BETWEEN p.min_number AND p.max_number
       AND (p.png_reference<>'../'||asset_path OR p.vehicle_model<>'700系'
            OR p.min_number<>p.max_number OR NOT p.requires_exact_roster
            OR p.actual_vehicle_confirmed)) THEN
      RAISE EXCEPTION 'Conflicting JR-West 700 PNG for %',r.train_number;
    END IF;

    INSERT INTO public.published_train_png_number_ranges
      (edition,line_key,segment_key,min_number,max_number,suffix,
       vehicle_model,png_reference,source_url,requires_exact_roster,
       actual_vehicle_confirmed)
    VALUES ('2611','SanyoShinkansen','weekday_verified_single_number',
      substring(r.train_number from '^[0-9]+')::integer,
      substring(r.train_number from '^[0-9]+')::integer,
      'A','700系','../'||asset_path,r.source_url,true,false)
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.published_train_png_number_ranges p
       WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
       AND p.min_number=substring(r.train_number from '^[0-9]+')::integer
       AND p.max_number=p.min_number AND p.suffix='A'
       AND p.vehicle_model='700系' AND p.png_reference='../'||asset_path
       AND p.source_url=r.source_url AND p.requires_exact_roster
       AND p.actual_vehicle_confirmed=false) THEN
      RAISE EXCEPTION 'Missing exact JR-West 700 PNG %',r.train_number;
    END IF;
  END LOOP;

  IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges p
   WHERE p.edition='2611' AND p.line_key='SanyoShinkansen'
   AND p.suffix='A' AND p.min_number<=970 AND p.max_number>=970) THEN
    RAISE EXCEPTION '970A changes vehicle model on dates and must remain without a static PNG';
  END IF;
END
$register_jrwest700$;
COMMIT;
