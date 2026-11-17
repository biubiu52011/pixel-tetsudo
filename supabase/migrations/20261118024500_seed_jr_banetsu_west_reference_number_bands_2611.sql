-- JR batch 26: BanetsuWest E721 (Sendai), GV-E400 and Kiha110 from original exact JS numbers.
-- js-0025 22 local M services -> 2 islands; js-0026 14 rapid M -> 1 island.
-- js-0027 39 local D -> 16 islands; js-0030 18 local D -> 11 islands;
-- js-0031 2 LimitedExpress D -> 1 island. 95 documented numbers -> 31 gap-free bands.
-- Image appearance metadata for E721 Sendai and Kiha110 is not independently proven.
-- These are reference-only PNG bands, not vehicle identity or service-day guarantees.
-- Original November 2026 date, train type and explicit candidate vehicle-label guards remain in JS.

DO $banetsu_west_preflight$
BEGIN
 IF (SELECT count(*) FROM public.vehicle_image_assets
 WHERE image_path IN (
   'images/列车/JR東日本/JR東日本_E721系_仙台地区.png',
   'images/列车/JR東日本/JR東日本_GV-E400系.png',
   'images/列车/JR東日本/JR東日本_キハ110系.png')
 AND operator='JR-East' AND asset_status='available'
 AND file_format_status='native_png') <> 3 THEN
  RAISE EXCEPTION 'BanetsuWest source PNG asset registry drift';
 END IF;
 IF EXISTS (
   WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
     ('BanetsuWest', 1221, 1240, 'M', '../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'),
     ('BanetsuWest', 2225, 2226, 'M', '../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'),
     ('BanetsuWest', 3231, 3244, 'M', '../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'),
     ('BanetsuWest', 220, 221, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 224, 224, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 227, 227, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 230, 231, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 233, 234, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 236, 238, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 240, 241, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2221, 2221, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2223, 2224, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2226, 2228, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2230, 2230, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2232, 2233, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2235, 2247, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2249, 2249, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 2252, 2252, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 4252, 4253, 'D', '../images/列车/JR東日本/JR東日本_GV-E400系.png'),
     ('BanetsuWest', 222, 223, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 225, 226, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 228, 229, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 232, 232, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 235, 235, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 239, 239, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 2248, 2248, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 2250, 2251, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 4250, 4250, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 4254, 4257, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 4259, 4259, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png'),
     ('BanetsuWest', 9211, 9212, 'D', '../images/列车/JR東日本/JR東日本_キハ110系.png')
   )
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
     ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
    AND p.line_key=r.line_key AND p.suffix=r.suffix
    AND p.min_number<=r.max_number AND p.max_number>=r.min_number
    AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'BanetsuWest pure reference overlaps different PNG'; END IF;
END
$banetsu_west_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','BanetsuWest','png_band/BanetsuWest/1221-1240M',1221,1240,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2225-2226M',2225,2226,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/3231-3244M',3231,3244,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0220-0221D',220,221,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0224-0224D',224,224,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0227-0227D',227,227,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0230-0231D',230,231,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0233-0234D',233,234,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0236-0238D',236,238,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0240-0241D',240,241,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2221-2221D',2221,2221,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2223-2224D',2223,2224,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2226-2228D',2226,2228,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2230-2230D',2230,2230,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2232-2233D',2232,2233,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2235-2247D',2235,2247,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2249-2249D',2249,2249,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2252-2252D',2252,2252,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/4252-4253D',4252,4253,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0222-0223D',222,223,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0225-0226D',225,226,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0228-0229D',228,229,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0232-0232D',232,232,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0235-0235D',235,235,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/0239-0239D',239,239,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2248-2248D',2248,2248,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/2250-2251D',2250,2251,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/4250-4250D',4250,4250,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/4254-4257D',4254,4257,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/4259-4259D',4259,4259,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/9211-9212D',9211,9212,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $banetsu_west_verify$
DECLARE actual integer;
BEGIN
 SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key LIKE 'png_band/%'
 AND line_key='BanetsuWest' AND suffix IN ('M','D')
 AND png_reference IN (
  '../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',
  '../images/列车/JR東日本/JR東日本_GV-E400系.png',
  '../images/列车/JR東日本/JR東日本_キハ110系.png')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>31 THEN RAISE EXCEPTION 'BanetsuWest expected 31 reference islands, got %',actual; END IF;
END
$banetsu_west_verify$;
