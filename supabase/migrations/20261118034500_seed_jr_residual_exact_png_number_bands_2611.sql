-- JR 28: source-backed remainder only. Existing JS train number rosters stay authoritative.
-- Kururi six unindexed high 29xx D numbers -> 5 gaps-preserving bands.
-- BanetsuWest GV-E400 Rapid 2225D,2229D -> 2 bands; Senseki HB-E210 28 -> 6 bands.
-- ChuoMain 211 Nagano 439M,1461M -> 2 bands. 38 numbered services -> 15 intervals.
-- All assets already exist and are available. Does not prove actual operating trainset.
-- Keep original date, train type, conditional-model and candidate overlap guards in JS.
DO $jr28_preflight$
BEGIN
 IF (SELECT count(*) FROM public.vehicle_image_assets
 WHERE image_path IN (
  'images/列车/JR東日本/JR東日本_キハE130系100番台.png',
  'images/列车/JR東日本/JR東日本_GV-E400系.png',
  'images/列车/JR東日本/JR東日本_HB-E210系.png',
  'images/列车/JR東日本/JR東日本_211系_長野色.png'
 ) AND operator='JR-East' AND asset_status='available' AND file_format_status='native_png')<>4
 THEN RAISE EXCEPTION 'JR 28 original PNG asset registry changed'; END IF;
 IF EXISTS (
  WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
     ('Kururi',2941,2941,'D','../images/列车/JR東日本/JR東日本_キハE130系100番台.png'),
     ('Kururi',2943,2944,'D','../images/列车/JR東日本/JR東日本_キハE130系100番台.png'),
     ('Kururi',2946,2946,'D','../images/列车/JR東日本/JR東日本_キハE130系100番台.png'),
     ('Kururi',2949,2949,'D','../images/列车/JR東日本/JR東日本_キハE130系100番台.png'),
     ('Kururi',2952,2952,'D','../images/列车/JR東日本/JR東日本_キハE130系100番台.png'),
     ('BanetsuWest',2229,2229,'D','../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest',2225,2225,'D','../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('Senseki',5520,5521,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('Senseki',5530,5539,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('Senseki',5541,5541,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('Senseki',5543,5543,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('Senseki',5560,5572,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('Senseki',5574,5574,'D','../images/列车/JR東日本/JR東日本_HB-E210系.png'),
     ('ChuoMain',439,439,'M','../images/列车/JR東日本/JR東日本_211系_長野色.png'),
     ('ChuoMain',1461,1461,'M','../images/列车/JR東日本/JR東日本_211系_長野色.png')
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
  ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
  AND r.line_key=p.line_key AND r.suffix=p.suffix
  AND p.min_number<=r.max_number AND p.max_number>=r.min_number
  AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'JR 28 interval conflicts with different PNG'; END IF;
END
$jr28_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Kururi','png_band/Kururi/2941-2941D',2941,2941,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','Kururi','png_band/Kururi/2943-2944D',2943,2944,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','Kururi','png_band/Kururi/2946-2946D',2946,2946,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','Kururi','png_band/Kururi/2949-2949D',2949,2949,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','Kururi','png_band/Kururi/2952-2952D',2952,2952,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2229-2229D',2229,2229,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2225-2225D',2225,2225,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5520-5521D',5520,5521,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5530-5539D',5530,5539,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5541-5541D',5541,5541,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5543-5543D',5543,5543,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5560-5572D',5560,5572,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/5574-5574D',5574,5574,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0439-0439M',439,439,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1461-1461M',1461,1461,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr28_postflight$
DECLARE actual integer;
BEGIN
 SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN (
  'png_band/Kururi/2941-2941D',
  'png_band/Kururi/2943-2944D',
  'png_band/Kururi/2946-2946D',
  'png_band/Kururi/2949-2949D',
  'png_band/Kururi/2952-2952D',
  'png_band/BanetsuWest/2229-2229D',
  'png_band/BanetsuWest/2225-2225D',
  'png_band/Senseki/5520-5521D',
  'png_band/Senseki/5530-5539D',
  'png_band/Senseki/5541-5541D',
  'png_band/Senseki/5543-5543D',
  'png_band/Senseki/5560-5572D',
  'png_band/Senseki/5574-5574D',
  'png_band/ChuoMain/0439-0439M',
  'png_band/ChuoMain/1461-1461M'
 ) AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>15 THEN RAISE EXCEPTION 'JR 28 expected 15 indexed islands, got %',actual; END IF;
END
$jr28_postflight$;
