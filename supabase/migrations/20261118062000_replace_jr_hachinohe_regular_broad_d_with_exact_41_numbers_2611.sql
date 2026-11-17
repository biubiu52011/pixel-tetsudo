-- JR39: original JS Hachinohe Nov 2026, 41 published numbers into 21 islands.
-- Retain existing runtime date/model/service guards; do NOT override other train artwork.
-- Retain 2 other previously verified special reference row(s) unchanged.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR39: missing available PNG'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachinohe' AND segment_key='png_band/Hachinohe/0424-1463D' AND min_number=424 AND max_number=1463 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1 THEN RAISE EXCEPTION 'JR39: original wide row changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (424,426),
    (429,429),
    (432,432),
    (435,436),
    (441,442),
    (445,446),
    (449,449),
    (454,454),
    (457,458),
    (461,462),
    (1422,1422),
    (1427,1428),
    (1430,1431),
    (1433,1434),
    (1437,1440),
    (1443,1444),
    (1447,1448),
    (1450,1453),
    (1455,1456),
    (1459,1460),
    (1463,1463)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges x ON x.edition='2611' AND x.line_key='Hachinohe' AND x.suffix='D' AND x.segment_key LIKE 'png_band/%' AND x.png_reference<>'../images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND p.min_number<=x.max_number AND x.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR39: other PNG overlaps'; END IF;
END;
$check$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachinohe' AND segment_key='png_band/Hachinohe/0424-1463D' AND min_number=424 AND max_number=1463 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Hachinohe','png_band/Hachinohe/0424-0426D',424,426,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0429-0429D',429,429,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0432-0432D',432,432,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0435-0436D',435,436,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0441-0442D',441,442,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0445-0446D',445,446,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0449-0449D',449,449,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0454-0454D',454,454,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0457-0458D',457,458,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0461-0462D',461,462,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1422-1422D',1422,1422,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1427-1428D',1427,1428,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1430-1431D',1430,1431,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1433-1434D',1433,1434,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1437-1440D',1437,1440,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1443-1444D',1443,1444,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1447-1448D',1447,1448,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1450-1453D',1450,1453,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1455-1456D',1455,1456,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1459-1460D',1459,1460,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/1463-1463D',1463,1463,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachinohe' AND segment_key LIKE 'png_band/Hachinohe/%' AND png_reference='../images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND suffix='D' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>23 THEN RAISE EXCEPTION 'JR39: expected 23 total pure bands'; END IF;
 IF (SELECT COALESCE(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachinohe' AND segment_key LIKE 'png_band/Hachinohe/%' AND png_reference='../images/列车/JR東日本/JR東日本_キハE130系500番台.png' AND suffix='D')<>44 THEN RAISE EXCEPTION 'JR39: expected 44 total published numbers'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachinohe' AND segment_key='png_band/Hachinohe/0424-1463D') THEN RAISE EXCEPTION 'JR39: old wide segment remains'; END IF;
END;
$verify$;
COMMIT;
