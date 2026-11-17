-- JR44: Hakushin E129; 91 exact JS train numbers -> 42 contiguous PNG reference bands.
-- Keep existing already-exact pure rows, migrate only incomplete/wide pure rows.
-- Preserve all runtime source/operator/model/calendar/service-type guards; not a verified physical trainset.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E129系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR44: PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Hakushin' AND segment_key='png_band/Hakushin/0623-0681M' AND min_number=623 AND max_number=681) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/0920-0950M' AND min_number=920 AND max_number=950) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/1620-1682M' AND min_number=1620 AND max_number=1682) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/1924-1951M' AND min_number=1924 AND max_number=1951) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/3921-3921M' AND min_number=3921 AND max_number=3921)))<>5 THEN RAISE EXCEPTION 'JR44: original pure rows changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (623,623),
     (628,628),
     (631,631),
     (633,635),
     (638,642),
     (644,645),
     (650,659),
     (662,662),
     (665,665),
     (667,670),
     (672,674),
     (677,678),
     (681,681),
     (920,920),
     (922,923),
     (927,927),
     (929,931),
     (933,936),
     (938,940),
     (942,945),
     (947,950),
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
     (1951,1951)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key='Hakushin' AND q.suffix='M' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_E129系.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR44: other PNG number intersection'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Hakushin' AND segment_key='png_band/Hakushin/0623-0681M' AND min_number=623 AND max_number=681) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/0920-0950M' AND min_number=920 AND max_number=950) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/1620-1682M' AND min_number=1620 AND max_number=1682) OR (line_key='Hakushin' AND segment_key='png_band/Hakushin/1924-1951M' AND min_number=1924 AND max_number=1951));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Hakushin','png_band/Hakushin/0623-0623M',623,623,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0628-0628M',628,628,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0631-0631M',631,631,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0633-0635M',633,635,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0638-0642M',638,642,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0644-0645M',644,645,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0650-0659M',650,659,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0662-0662M',662,662,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0665-0665M',665,665,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0667-0670M',667,670,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0672-0674M',672,674,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0677-0678M',677,678,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0681-0681M',681,681,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0920-0920M',920,920,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0922-0923M',922,923,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0927-0927M',927,927,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0929-0931M',929,931,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0933-0936M',933,936,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0938-0940M',938,940,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0942-0945M',942,945,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0947-0950M',947,950,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1620-1622M',1620,1622,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1629-1630M',1629,1630,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1632-1632M',1632,1632,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1636-1637M',1636,1637,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1643-1643M',1643,1643,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1646-1649M',1646,1649,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1660-1661M',1660,1661,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1663-1664M',1663,1664,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1666-1666M',1666,1666,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1671-1671M',1671,1671,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1675-1676M',1675,1676,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1679-1680M',1679,1680,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1682-1682M',1682,1682,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1924-1926M',1924,1926,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1928-1928M',1928,1928,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1932-1932M',1932,1932,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1937-1937M',1937,1937,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1941-1941M',1941,1941,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1946-1946M',1946,1946,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1951-1951M',1951,1951,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hakushin' AND segment_key LIKE 'png_band/Hakushin/%' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>42 THEN RAISE EXCEPTION 'JR44: band count differs'; END IF;
 IF (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hakushin' AND segment_key LIKE 'png_band/Hakushin/%' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png')<>91 THEN RAISE EXCEPTION 'JR44: unexpected original-number coverage'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND (segment_key='png_band/Hakushin/0623-0681M' OR segment_key='png_band/Hakushin/0920-0950M' OR segment_key='png_band/Hakushin/1620-1682M' OR segment_key='png_band/Hakushin/1924-1951M')) THEN RAISE EXCEPTION 'JR44: retired wide row remains'; END IF;
END;
$verify$;
COMMIT;
