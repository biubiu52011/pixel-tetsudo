-- JR64: replicate existing 2611 source envelope bounds as reference-only PNG bands.
-- A source envelope does NOT assert every integer within it is a real scheduled train.
-- Retain independent source roster/date/segment/vehicle guards at runtime.
BEGIN;
DO $preflight$
DECLARE hit_count integer;
BEGIN
  SELECT count(*) INTO hit_count
  FROM public.published_train_png_number_ranges a
  JOIN (VALUES
    (650,672,'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html'),
    (1652,1669,'https://timetables.jreast.co.jp/2611/timetable-v/979u1.html'),
    (3657,3666,'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html')
  ) t(lo,hi,source_url)
    ON a.min_number=t.lo AND a.max_number=t.hi AND a.source_url=t.source_url
  WHERE a.edition='2611' AND a.line_key='Kamaishi' AND a.segment_key='full'
    AND a.suffix='D' AND a.vehicle_model='HB-E220系'
    AND a.png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png'
    AND a.requires_exact_roster=TRUE AND a.actual_vehicle_confirmed=FALSE;
  IF hit_count<>3 THEN RAISE EXCEPTION 'JR64: Kamaishi original three source ranges changed'; END IF;
  SELECT count(*) INTO hit_count FROM public.published_train_png_number_ranges a
  WHERE a.edition='2611' AND a.line_key='Kamaishi' AND a.segment_key='full'
    AND a.suffix='D' AND a.vehicle_model='HB-E220系'
    AND a.png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png';
  IF hit_count<>3 THEN RAISE EXCEPTION 'JR64: unexpected Kamaishi source envelope'; END IF;
  SELECT count(*) INTO hit_count FROM public.published_train_png_number_ranges a
  WHERE a.edition='2611' AND a.line_key='Joetsu' AND a.segment_key='north'
    AND a.min_number=1720 AND a.max_number=1752 AND a.suffix='M'
    AND a.vehicle_model='E129系'
    AND a.source_url='https://timetables.jreast.co.jp/2611/timetable-v/296d1.html'
    AND a.png_reference='../images/列车/JR東日本/JR東日本_E129系.png'
    AND a.requires_exact_roster=TRUE AND a.actual_vehicle_confirmed=FALSE;
  IF hit_count<>1 THEN RAISE EXCEPTION 'JR64: Joetsu E129 source envelope changed'; END IF;
  SELECT count(*) INTO hit_count FROM public.vehicle_image_assets
  WHERE image_path IN
  ('images/列车/JR東日本/JR東日本_HB-E220系.png',
   'images/列车/JR東日本/JR東日本_E129系.png')
  AND operator='JR-East' AND asset_status='available'
  AND file_format_status='native_png' AND asset_scope='generic'
  AND ((image_path='images/列车/JR東日本/JR東日本_HB-E220系.png' AND vehicle_type='HB-E220系')
    OR (image_path='images/列车/JR東日本/JR東日本_E129系.png' AND vehicle_type='E129系'));
  IF hit_count<>2 THEN RAISE EXCEPTION 'JR64: two PNG asset registrations not available'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges p
    JOIN (VALUES
      ('Kamaishi',650,672,'D'),
      ('Kamaishi',1652,1669,'D'),
      ('Kamaishi',3657,3666,'D'),
      ('Joetsu',1720,1752,'M')
    ) t(line_key,lo,hi,suffix)
      ON p.line_key=t.line_key AND p.suffix=t.suffix
      AND p.min_number<=t.hi AND p.max_number>=t.lo
    WHERE p.edition='2611' AND p.segment_key LIKE 'png_band/%'
  ) THEN RAISE EXCEPTION 'JR64: new intervals overlap existing pure PNG mapping'; END IF;
END
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Kamaishi','png_band/Kamaishi/650-672D',650,672,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
('2611','Kamaishi','png_band/Kamaishi/1652-1669D',1652,1669,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
('2611','Kamaishi','png_band/Kamaishi/3657-3666D',3657,3666,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
('2611','Joetsu','png_band/Joetsu/1720-1752M',1720,1752,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN
 ('png_band/Kamaishi/650-672D','png_band/Kamaishi/1652-1669D',
 'png_band/Kamaishi/3657-3666D','png_band/Joetsu/1720-1752M')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4
 THEN RAISE EXCEPTION 'JR64: four reference intervals not persisted'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges a
   JOIN public.published_train_png_number_ranges b
     ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
     AND a.min_number<=b.max_number AND b.min_number<=a.max_number
     AND a.png_reference<>b.png_reference
   WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
     AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR64: distinct PNG same-number pure interval conflict'; END IF;
END
$verify$;
COMMIT;
