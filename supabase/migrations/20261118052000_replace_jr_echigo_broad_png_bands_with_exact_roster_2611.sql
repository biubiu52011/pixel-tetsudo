-- JR33: Echigo M-number gallery references from the existing 2026-11 exact JS lists.
-- 126 source train numbers -> 31 gap-free numeric bands, no fictitious intermediate numbers.
-- Keep existing per-line, operator, date, train-type and model constraints in the original JS.
-- This is only a planned PNG illustration; NOT actual vehicle formation proof.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E129系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'Echigo: PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Echigo' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND suffix='M' AND ( (segment_key='png_band/Echigo/0120-1999M' AND min_number=120 AND max_number=1999) OR (segment_key='png_band/Echigo/8132-8637M' AND min_number=8132 AND max_number=8637) OR (segment_key='png_band/Echigo/9630-9630M' AND min_number=9630 AND max_number=9630) ) AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 3 THEN RAISE EXCEPTION 'Echigo: old seed rows changed'; END IF;
 IF EXISTS (WITH proposed(min_number,max_number) AS (VALUES
    (120,143),
    (145,146),
    (148,170),
    (172,172),
    (174,174),
    (1521,1557),
    (1559,1559),
    (1561,1561),
    (1620,1622),
    (1629,1630),
    (1632,1632),
    (1636,1637),
    (1643,1643),
    (1646,1649),
    (1660,1661),
    (1663,1664),
    (1666,1666),
    (1671,1671),
    (1675,1676),
    (1679,1680),
    (1682,1682),
    (1924,1926),
    (1928,1928),
    (1932,1932),
    (1937,1937),
    (1941,1941),
    (1946,1946),
    (1951,1951),
    (8132,8132),
    (8637,8637),
    (9630,9630)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges existing
    ON existing.edition='2611' AND existing.line_key='Echigo' AND existing.suffix='M' AND existing.segment_key LIKE 'png_band/%' AND existing.png_reference<>'../images/列车/JR東日本/JR東日本_E129系.png'
    AND p.min_number<=existing.max_number AND existing.min_number<=p.max_number)
 THEN RAISE EXCEPTION 'Echigo: cross PNG conflict'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Echigo' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND suffix='M' AND ( (segment_key='png_band/Echigo/0120-1999M' AND min_number=120 AND max_number=1999) OR (segment_key='png_band/Echigo/8132-8637M' AND min_number=8132 AND max_number=8637) OR (segment_key='png_band/Echigo/9630-9630M' AND min_number=9630 AND max_number=9630) ) AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Echigo','png_band/Echigo/0120-0143M',120,143,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/0145-0146M',145,146,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/0148-0170M',148,170,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/0172-0172M',172,172,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/0174-0174M',174,174,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1521-1557M',1521,1557,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1559-1559M',1559,1559,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1561-1561M',1561,1561,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1620-1622M',1620,1622,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1629-1630M',1629,1630,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1632-1632M',1632,1632,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1636-1637M',1636,1637,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1643-1643M',1643,1643,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1646-1649M',1646,1649,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1660-1661M',1660,1661,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1663-1664M',1663,1664,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1666-1666M',1666,1666,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1671-1671M',1671,1671,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1675-1676M',1675,1676,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1679-1680M',1679,1680,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1682-1682M',1682,1682,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1924-1926M',1924,1926,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1928-1928M',1928,1928,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1932-1932M',1932,1932,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1937-1937M',1937,1937,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1941-1941M',1941,1941,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1946-1946M',1946,1946,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/1951-1951M',1951,1951,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/8132-8132M',8132,8132,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/8637-8637M',8637,8637,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/9630-9630M',9630,9630,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE expected_rows integer; total_numbers integer;
BEGIN
 SELECT count(*),COALESCE(sum(max_number-min_number+1),0) INTO expected_rows,total_numbers FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Echigo' AND segment_key LIKE 'png_band/Echigo/%' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND suffix='M' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF expected_rows <> 31 OR total_numbers <> 126 THEN RAISE EXCEPTION 'Echigo: expected 31 bands/126 numbers, got %/%',expected_rows,total_numbers; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Echigo' AND ( segment_key='png_band/Echigo/0120-1999M' OR segment_key='png_band/Echigo/8132-8637M' OR segment_key='png_band/Echigo/9630-9630M' )) THEN RAISE EXCEPTION 'Echigo: retired broad row still present'; END IF;
END;
$verify$;
COMMIT;
