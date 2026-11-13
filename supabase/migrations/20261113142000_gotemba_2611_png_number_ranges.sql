-- Gotemba 2611 ordinary train numbers -> representative JR-Central PNG.
-- The imported TokyoGTFS plan supplies the exact numbered roster; the range
-- rows below authorize only those ordinary M/G numbers through the client
-- number pool. 315系 is a line-level illustration, not the actual day's
-- formation or physical vehicle number. The 1M-6M limited expresses remain
-- unresolved because they are not ordinary Gotemba local trains.
BEGIN;

DO $precheck$
DECLARE
  v_local_numbers integer;
  v_express_numbers integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicle_image_assets
    WHERE operator='JR-Central'
      AND vehicle_type='315系'
      AND image_path='images/列车/JR東海/JR東海_315系.png'
      AND asset_status='available'
      AND file_format_status='native_png'
      AND is_generic=true
  ) THEN
    RAISE EXCEPTION 'GOTEMBA_315_GENERIC_PNG_NOT_AVAILABLE';
  END IF;

  SELECT count(DISTINCT train_number)
    INTO v_local_numbers
  FROM public.manual_timetable_templates
  WHERE line_key='Gotemba'
    AND train_type_urn='odpt.TrainType:JR-Central.Local'
    AND source_path LIKE 'gtfs:tokyogtfs:rail.zip:%:JR-Central.Gotemba';

  SELECT count(DISTINCT train_number)
    INTO v_express_numbers
  FROM public.manual_timetable_templates
  WHERE line_key='Gotemba'
    AND train_type_urn='odpt.TrainType:JR-Central.LimitedExpress'
    AND source_path LIKE 'gtfs:tokyogtfs:rail.zip:%:JR-Central.Gotemba';

  IF v_local_numbers<>88 OR v_express_numbers<>6 THEN
    RAISE EXCEPTION 'GOTEMBA_NUMBER_ROSTER_CHANGED: local %, express %',
      v_local_numbers,v_express_numbers;
  END IF;
END
$precheck$;

INSERT INTO public.published_train_png_number_ranges(
  edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed
)
VALUES
  ('2611','Gotemba','gotemba_local_315_reference',2226,5550,'M',
   '315系（御殿場線参考）',
   '../images/列车/JR東海/JR東海_315系.png',
   'https://tokaido-unyo-shizuoka.com/unyo/202603/gotemba-202603.html',
   true,false),
  ('2611','Gotemba','gotemba_local_315_reference',2533,2637,'G',
   '315系（御殿場線参考）',
   '../images/列车/JR東海/JR東海_315系.png',
   'https://tokaido-unyo-shizuoka.com/unyo/202603/gotemba-202603.html',
   true,false)
ON CONFLICT DO NOTHING;

DO $$
DECLARE v_rows integer;
BEGIN
  SELECT count(*) INTO v_rows
  FROM public.published_train_png_number_ranges
  WHERE edition='2611'
    AND line_key='Gotemba'
    AND segment_key='gotemba_local_315_reference';
  IF v_rows<>2 THEN
    RAISE EXCEPTION 'GOTEMBA_PNG_RANGE_INSERT_MISMATCH: %',v_rows;
  END IF;
END $$;

COMMIT;
