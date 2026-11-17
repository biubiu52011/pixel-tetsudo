-- JR batch 29: ChuoMain E233-0 original js-0060 source-exact M-number intervals.
-- 71 published names; DO NOT seed 2152M or 2166M because E353 LimitedExpress reference already uses them.
-- 69 safe published names -> 65 distinct connected M-number islands. No assigned PNG priority.
-- Original E233 model guard and excludeTrainType LimitedExpress remain authoritative JS conditions.
-- 2026-11 only; image is a source reference, never an actual-vehicle confirmation.
DO $jr29_e233_preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E233系_0番台.png'
 AND operator='JR-East' AND vehicle_type='E233系' AND asset_status='available'
 AND asset_scope='subseries' AND file_format_status='native_png')
 THEN RAISE EXCEPTION 'JR E233-0 original image asset registry changed'; END IF;
 IF EXISTS (
  WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
    ('ChuoMain',640,640,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',648,648,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',661,661,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',722,722,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',724,724,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',726,726,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',744,744,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',760,760,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',818,818,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',865,865,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',919,919,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1025,1025,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1081,1081,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1103,1103,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1115,1115,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1118,1118,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1164,1164,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1173,1173,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1175,1175,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1223,1223,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1249,1249,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1257,1257,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1280,1280,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1302,1302,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1314,1314,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1323,1325,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1349,1349,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1393,1393,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1427,1427,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1429,1429,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1472,1472,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1474,1474,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1519,1519,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1522,1522,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1556,1556,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1569,1569,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1626,1626,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1628,1629,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1633,1633,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1648,1648,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1692,1692,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1709,1709,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1725,1725,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1727,1727,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1753,1753,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1818,1818,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1825,1825,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1853,1853,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1867,1868,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1917,1917,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1919,1919,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1923,1923,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1928,1928,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1932,1932,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1991,1991,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',1993,1993,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2008,2008,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2024,2024,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2026,2026,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2052,2052,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2218,2218,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2222,2222,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2290,2290,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2292,2292,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png'),
    ('ChuoMain',2339,2339,'M','../images/列车/JR東日本/JR東日本_E233系_0番台.png')
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
  ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
  AND r.line_key=p.line_key AND r.suffix=p.suffix
  AND p.min_number<=r.max_number AND p.max_number>=r.min_number
  AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'E233 ChuoMain M overlaps another image'; END IF;
END
$jr29_e233_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','ChuoMain','png_band/ChuoMain/0640-0640M',640,640,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0648-0648M',648,648,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0661-0661M',661,661,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0722-0722M',722,722,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0724-0724M',724,724,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0726-0726M',726,726,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0744-0744M',744,744,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0760-0760M',760,760,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0818-0818M',818,818,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0865-0865M',865,865,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0919-0919M',919,919,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1025-1025M',1025,1025,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1081-1081M',1081,1081,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1103-1103M',1103,1103,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1115-1115M',1115,1115,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1118-1118M',1118,1118,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1164-1164M',1164,1164,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1173-1173M',1173,1173,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1175-1175M',1175,1175,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1223-1223M',1223,1223,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1249-1249M',1249,1249,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1257-1257M',1257,1257,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1280-1280M',1280,1280,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1302-1302M',1302,1302,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1314-1314M',1314,1314,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1323-1325M',1323,1325,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1349-1349M',1349,1349,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1393-1393M',1393,1393,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1427-1427M',1427,1427,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1429-1429M',1429,1429,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1472-1472M',1472,1472,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1474-1474M',1474,1474,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1519-1519M',1519,1519,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1522-1522M',1522,1522,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1556-1556M',1556,1556,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1569-1569M',1569,1569,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1626-1626M',1626,1626,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1628-1629M',1628,1629,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1633-1633M',1633,1633,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1648-1648M',1648,1648,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1692-1692M',1692,1692,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1709-1709M',1709,1709,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1725-1725M',1725,1725,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1727-1727M',1727,1727,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1753-1753M',1753,1753,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1818-1818M',1818,1818,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1825-1825M',1825,1825,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1853-1853M',1853,1853,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1867-1868M',1867,1868,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1917-1917M',1917,1917,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1919-1919M',1919,1919,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1923-1923M',1923,1923,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1928-1928M',1928,1928,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1932-1932M',1932,1932,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1991-1991M',1991,1991,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/1993-1993M',1993,1993,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2008-2008M',2008,2008,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2024-2024M',2024,2024,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2026-2026M',2026,2026,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2052-2052M',2052,2052,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2218-2218M',2218,2218,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2222-2222M',2222,2222,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2290-2290M',2290,2290,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2292-2292M',2292,2292,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/2339-2339M',2339,2339,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_0番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr29_e233_verify$
DECLARE actual integer;
BEGIN
 SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='ChuoMain'
 AND segment_key LIKE 'png_band/ChuoMain/%' AND suffix='M'
 AND png_reference='../images/列车/JR東日本/JR東日本_E233系_0番台.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>65 THEN RAISE EXCEPTION 'Expected 65 E233 ChuoMain M reference bands, got %',actual; END IF;
END
$jr29_e233_verify$;
