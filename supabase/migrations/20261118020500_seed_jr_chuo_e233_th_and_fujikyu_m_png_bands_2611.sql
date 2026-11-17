-- JR 2026-11: E233-0 PNG NUMBER bands, read only from existing JS source guards.
-- js-0062: ChuoMain 71 unique T/H source train numbers -> 70 gap-free intervals.
-- js-0004: Fujikyu published 1455M,1456M -> one gap-free interval.
-- Only existing full-number rules; the original line/date/type/model conditions remain authoritative.
-- IMPORTANT: Excludes separate ChuoMain M published roster because 2152M/2166M
-- overlap different E353 pure reference bands; do not assign image priority or erase gap.
-- This migration does not prove actual physical trainset or license runtime PNG selection.
DO $e233_chuo_th_preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E233系_0番台.png' AND operator='JR-East' AND vehicle_type='E233系' AND asset_status='available' AND file_format_status='native_png') THEN
   RAISE EXCEPTION 'E233-0 original image asset changed';
 END IF;
 IF EXISTS (
   WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
      ('ChuoMain',449,449,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',523,523,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',525,525,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',640,640,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',648,648,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',661,661,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',722,722,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',724,724,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',744,744,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',760,760,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',865,865,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1025,1025,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1081,1081,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1164,1164,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1173,1173,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1175,1175,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1257,1257,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1280,1280,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1324,1324,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1349,1349,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1393,1393,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1472,1472,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1474,1474,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1556,1556,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1569,1569,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1629,1629,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1633,1633,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1648,1648,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1692,1692,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1725,1725,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1753,1753,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1853,1853,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1867,1868,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1928,1928,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1932,1932,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1991,1991,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1993,1993,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2024,2024,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2052,2052,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2152,2152,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2166,2166,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2290,2290,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2292,2292,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2339,2339,'T','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',726,726,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',818,818,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',919,919,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1103,1103,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1115,1115,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1118,1118,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1223,1223,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1302,1302,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1314,1314,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1427,1427,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1429,1429,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1519,1519,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1522,1522,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1626,1626,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1628,1628,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1709,1709,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1727,1727,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1818,1818,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1825,1825,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1917,1917,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1919,1919,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',1923,1923,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2008,2008,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2026,2026,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2218,2218,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('ChuoMain',2222,2222,'H','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
      ('Fujikyu',1455,1456,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png')
   )
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
    ON r.edition='2611' AND r.segment_key LIKE 'png_band/%' AND p.line_key=r.line_key
   AND p.suffix=r.suffix AND p.min_number<=r.max_number AND p.max_number>=r.min_number
   AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'E233 proposed pure band conflicts with a different PNG'; END IF;
END
$e233_chuo_th_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','ChuoMain','png_band/ChuoMain/0449-0449T',449,449,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0523-0523T',523,523,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0525-0525T',525,525,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0640-0640T',640,640,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0648-0648T',648,648,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0661-0661T',661,661,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0722-0722T',722,722,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0724-0724T',724,724,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0744-0744T',744,744,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0760-0760T',760,760,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0865-0865T',865,865,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1025-1025T',1025,1025,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1081-1081T',1081,1081,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1164-1164T',1164,1164,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1173-1173T',1173,1173,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1175-1175T',1175,1175,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1257-1257T',1257,1257,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1280-1280T',1280,1280,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1324-1324T',1324,1324,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1349-1349T',1349,1349,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1393-1393T',1393,1393,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1472-1472T',1472,1472,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1474-1474T',1474,1474,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1556-1556T',1556,1556,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1569-1569T',1569,1569,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1629-1629T',1629,1629,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1633-1633T',1633,1633,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1648-1648T',1648,1648,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1692-1692T',1692,1692,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1725-1725T',1725,1725,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1753-1753T',1753,1753,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1853-1853T',1853,1853,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1867-1868T',1867,1868,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1928-1928T',1928,1928,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1932-1932T',1932,1932,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1991-1991T',1991,1991,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1993-1993T',1993,1993,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2024-2024T',2024,2024,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2052-2052T',2052,2052,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2152-2152T',2152,2152,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2166-2166T',2166,2166,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2290-2290T',2290,2290,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2292-2292T',2292,2292,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2339-2339T',2339,2339,'T',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0726-0726H',726,726,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0818-0818H',818,818,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0919-0919H',919,919,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1103-1103H',1103,1103,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1115-1115H',1115,1115,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1118-1118H',1118,1118,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1223-1223H',1223,1223,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1302-1302H',1302,1302,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1314-1314H',1314,1314,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1427-1427H',1427,1427,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1429-1429H',1429,1429,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1519-1519H',1519,1519,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1522-1522H',1522,1522,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1626-1626H',1626,1626,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1628-1628H',1628,1628,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1709-1709H',1709,1709,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1727-1727H',1727,1727,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1818-1818H',1818,1818,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1825-1825H',1825,1825,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1917-1917H',1917,1917,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1919-1919H',1919,1919,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1923-1923H',1923,1923,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2008-2008H',2008,2008,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2026-2026H',2026,2026,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2218-2218H',2218,2218,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2222-2222H',2222,2222,'H',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','Fujikyu','png_band/Fujikyu/1455-1456M',1455,1456,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $e233_chuo_th_verify$
DECLARE actual integer;
BEGIN
 SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key LIKE 'png_band/%'
 AND png_reference='../images/列车/JR東日本/JR東日本_E233系_0番台.png'
 AND ((line_key='ChuoMain' AND suffix IN ('T','H'))
 OR (line_key='Fujikyu' AND suffix='M'))
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>71 THEN RAISE EXCEPTION 'E233 expected 71 reference intervals, found %',actual; END IF;
END
$e233_chuo_th_verify$;
