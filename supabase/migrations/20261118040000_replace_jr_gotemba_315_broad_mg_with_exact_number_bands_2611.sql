-- JR 29 audit correction: previous Gotemba 2226-5550MG was NOT a validated
-- train-number interval; MG grouped two possible suffixes and filled gaps.
-- Replace only the exact old broad PNG row, retain the original JS Local/date
-- illustration/referenceOnly guard, and seed 88 source names as 35 M/G islands.
DO $gotemba315_preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東海/JR東海_315系.png'
 AND operator='JR-Central' AND vehicle_type='315系'
 AND asset_status='available' AND file_format_status='native_png')
 THEN RAISE EXCEPTION 'JR Gotemba 315 original gallery PNG changed'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Gotemba'
 AND segment_key='png_band/Gotemba/2226-5550MG'
 AND min_number=2226 AND max_number=5550 AND suffix='MG'
 AND png_reference='../images/列车/JR東海/JR東海_315系.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 1
 THEN RAISE EXCEPTION 'JR Gotemba old broad row changed; abort replacement'; END IF;
 IF EXISTS (
  WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
    ('Gotemba',2226,2226,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2521,2522,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2524,2532,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2534,2536,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2539,2539,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2544,2544,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2546,2547,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2549,2551,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2554,2555,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2557,2562,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2564,2567,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2570,2577,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2610,2613,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2615,2624,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2626,2633,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2639,2639,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2641,2641,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2643,2643,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2645,2645,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2751,2751,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',5535,5535,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',5539,5539,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',5550,5550,'M','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2533,2533,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2538,2538,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2540,2543,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2545,2545,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2552,2553,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2556,2556,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2563,2563,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2569,2569,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2614,2614,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2625,2625,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2635,2635,'G','../images/列车/JR東海/JR東海_315系.png'),
    ('Gotemba',2637,2637,'G','../images/列车/JR東海/JR東海_315系.png')
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
  AND r.line_key=p.line_key AND r.suffix=p.suffix
  AND p.min_number<=r.max_number AND p.max_number>=r.min_number
  AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'JR Gotemba exact-number row overlaps another PNG'; END IF;
END
$gotemba315_preflight$;

DELETE FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Gotemba'
 AND segment_key='png_band/Gotemba/2226-5550MG'
 AND min_number=2226 AND max_number=5550 AND suffix='MG'
 AND png_reference='../images/列车/JR東海/JR東海_315系.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Gotemba','png_band/Gotemba/2226-2226M',2226,2226,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2521-2522M',2521,2522,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2524-2532M',2524,2532,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2534-2536M',2534,2536,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2539-2539M',2539,2539,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2544-2544M',2544,2544,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2546-2547M',2546,2547,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2549-2551M',2549,2551,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2554-2555M',2554,2555,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2557-2562M',2557,2562,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2564-2567M',2564,2567,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2570-2577M',2570,2577,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2610-2613M',2610,2613,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2615-2624M',2615,2624,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2626-2633M',2626,2633,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2639-2639M',2639,2639,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2641-2641M',2641,2641,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2643-2643M',2643,2643,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2645-2645M',2645,2645,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2751-2751M',2751,2751,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/5535-5535M',5535,5535,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/5539-5539M',5539,5539,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/5550-5550M',5550,5550,'M',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2533-2533G',2533,2533,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2538-2538G',2538,2538,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2540-2543G',2540,2543,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2545-2545G',2545,2545,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2552-2553G',2552,2553,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2556-2556G',2556,2556,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2563-2563G',2563,2563,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2569-2569G',2569,2569,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2614-2614G',2614,2614,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2625-2625G',2625,2625,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2635-2635G',2635,2635,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2637-2637G',2637,2637,'G',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $gotemba315_verify$
DECLARE actual integer; n integer;
BEGIN
 SELECT count(*),sum(max_number-min_number+1) INTO actual,n
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Gotemba' AND segment_key LIKE 'png_band/Gotemba/%'
 AND png_reference='../images/列车/JR東海/JR東海_315系.png'
 AND suffix IN ('M','G')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>35 OR n<>88 THEN RAISE EXCEPTION 'JR Gotemba expected 35 intervals covering 88 numbers, actual %/%',actual,n; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Gotemba'
 AND segment_key='png_band/Gotemba/2226-5550MG')
 THEN RAISE EXCEPTION 'JR Gotemba invalid broad MG band not deleted'; END IF;
END
$gotemba315_verify$;
