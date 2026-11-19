-- JR65: reference-only image bands from four existing 2611 exact-roster source envelopes.
-- The underlying roster, route, calendar, vehicle and source/date checks remain authoritative.
-- IMPORTANT: Kesennuma source_url is a general KiHa110 model page, not an individual train-number timetable.
-- Bounds therefore do not prove every intervening integer is a scheduled train; never use as real-stock proof.
BEGIN;
DO $preflight$
DECLARE source_hits integer; asset_hits integer;
BEGIN
 SELECT count(*) INTO source_hits
 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
  ('Joetsu','south',520,758,'M','211系（高崎地区）','../images/列车/JR東日本/JR東日本_211系_湘南色.png','https://timetables.jreast.co.jp/2611/timetable-v/238d1.html'),
  ('Kitakami','rail_to_hotto_yuda',3729,3739,'D','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png','https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html'),
  ('Kesennuma','maeyachi_yanagitsu_rail',921,935,'D','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png','https://www.jreast.co.jp/train/local/kiha110.html'),
  ('Kesennuma','maeyachi_yanagitsu_rail',2926,2938,'D','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png','https://www.jreast.co.jp/train/local/kiha110.html')
 ) t(line_key,segment_key,lo,hi,suffix,vehicle_model,png_reference,source_url)
   ON p.line_key=t.line_key AND p.segment_key=t.segment_key
   AND p.min_number=t.lo AND p.max_number=t.hi AND p.suffix=t.suffix
   AND p.vehicle_model=t.vehicle_model AND p.png_reference=t.png_reference
   AND p.source_url=t.source_url
 WHERE p.edition='2611' AND p.requires_exact_roster=TRUE
 AND p.actual_vehicle_confirmed=FALSE;
 IF source_hits<>4 THEN
  RAISE EXCEPTION 'JR65: the four historical source-bound entries are changed or missing';
 END IF;

 SELECT count(*) INTO asset_hits FROM public.vehicle_image_assets
 WHERE operator='JR-East' AND asset_status='available'
 AND file_format_status='native_png' AND (
 (image_path='images/列车/JR東日本/JR東日本_211系_湘南色.png'
   AND vehicle_type='211系' AND asset_scope='theme') OR
 (image_path='images/列车/JR東日本/JR東日本_キハ110系.png'
   AND vehicle_type='キハ110系' AND asset_scope='generic')
 );
 IF asset_hits<>2 THEN
  RAISE EXCEPTION 'JR65: JR East 211 themed / KiHa110 generic PNG registrations changed';
 END IF;

 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges b
  JOIN (VALUES
  ('Joetsu',520,758,'M'),
  ('Kitakami',3729,3739,'D'),
  ('Kesennuma',921,935,'D'),
  ('Kesennuma',2926,2938,'D')
  ) t(line_key,lo,hi,suffix)
   ON b.line_key=t.line_key AND b.suffix=t.suffix
   AND b.min_number<=t.hi AND b.max_number>=t.lo
  WHERE b.edition='2611' AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR65: an existing pure number band intersects targets'; END IF;
END;
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Joetsu','png_band/Joetsu/520-758M',520,758,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
('2611','Kitakami','png_band/Kitakami/3729-3739D',3729,3739,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
('2611','Kesennuma','png_band/Kesennuma/921-935D',921,935,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
('2611','Kesennuma','png_band/Kesennuma/2926-2938D',2926,2938,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key IN (
  'png_band/Joetsu/520-758M',
  'png_band/Kitakami/3729-3739D',
  'png_band/Kesennuma/921-935D',
  'png_band/Kesennuma/2926-2938D'
  )
  AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4
 THEN RAISE EXCEPTION 'JR65: exactly four reference bands were not persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR65: distinct PNG conflict for same line and number'; END IF;
END;
$verify$;
COMMIT;
