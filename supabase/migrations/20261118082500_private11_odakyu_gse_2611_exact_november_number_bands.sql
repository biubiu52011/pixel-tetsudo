-- Private railway batch 11 / Odakyu GSE official 2026-11 train-number bands.
-- Official Nov 2026 70000 GSE operating schedule (published 2026-09-30):
-- https://www.odakyu.jp/romancecar/news/makhce00000028sx-att/makhce00000028t4.pdf
-- November page (NOT December): 28 distinct four-digit service train numbers,
-- 24 on Odawara and 4 on OdakyuEnoshima, collapsed to 26 NO-GAP intervals.
-- Odawara exact numbers: 0002, 0003, 0006, 0010, 0018, 0022, 0025, 0104, 0120, 0128, 0315, 0318, 0321, 0601, 0611, 0621, 0709, 0727, 0729, 0736, 0790, 0791, 0906, 0992
-- Enoshima exact numbers: 0504, 0683, 0687, 0689
-- Existing gallery asset is asset_scope=review, so this is REFERENCE ONLY.
-- Never authorize a PNG by this band alone or infer real carset/formation.
-- Source PDF lists individual operating DATES. Preserve source calendar,
-- actual date, owner, train type, display line, identity and image-scope guards.
-- The train-number table does NOT store per-date schedule and cannot replace it.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png' AND operator='Odakyu'
    AND vehicle_type='70000形' AND asset_status='available'
    AND file_format_status='native_png' AND asset_scope='review'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private11: GSE source artwork/review status changed'; END IF;
 IF EXISTS (
  WITH proposed(line_key,min_number,max_number) AS (VALUES
    ('Odawara',2,3),
    ('Odawara',6,6),
    ('Odawara',10,10),
    ('Odawara',18,18),
    ('Odawara',22,22),
    ('Odawara',25,25),
    ('Odawara',104,104),
    ('Odawara',120,120),
    ('Odawara',128,128),
    ('Odawara',315,315),
    ('Odawara',318,318),
    ('Odawara',321,321),
    ('Odawara',601,601),
    ('Odawara',611,611),
    ('Odawara',621,621),
    ('Odawara',709,709),
    ('Odawara',727,727),
    ('Odawara',729,729),
    ('Odawara',736,736),
    ('Odawara',790,791),
    ('Odawara',906,906),
    ('Odawara',992,992),
    ('OdakyuEnoshima',504,504),
    ('OdakyuEnoshima',683,683),
    ('OdakyuEnoshima',687,687),
    ('OdakyuEnoshima',689,689)
  ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.line_key=p.line_key AND r.suffix=''
      AND p.min_number<=r.max_number AND r.min_number<=p.max_number
 ) THEN RAISE EXCEPTION 'Private11: GSE proposed bounds intersect existing number references'; END IF;
END; $preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Odawara','png_band/Odawara/0002-0003',2,3,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0006-0006',6,6,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0010-0010',10,10,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0018-0018',18,18,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0022-0022',22,22,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0025-0025',25,25,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0104-0104',104,104,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0120-0120',120,120,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0128-0128',128,128,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0315-0315',315,315,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0318-0318',318,318,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0321-0321',321,321,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0601-0601',601,601,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0611-0611',611,611,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0621-0621',621,621,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0709-0709',709,709,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0727-0727',727,727,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0729-0729',729,729,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0736-0736',736,736,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0790-0791',790,791,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0906-0906',906,906,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','Odawara','png_band/Odawara/0992-0992',992,992,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','OdakyuEnoshima','png_band/OdakyuEnoshima/0504-0504',504,504,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','OdakyuEnoshima','png_band/OdakyuEnoshima/0683-0683',683,683,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','OdakyuEnoshima','png_band/OdakyuEnoshima/0687-0687',687,687,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE),
 ('2611','OdakyuEnoshima','png_band/OdakyuEnoshima/0689-0689',689,689,'',NULL,
  '../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key LIKE 'png_band/%' AND line_key IN ('Odawara','OdakyuEnoshima')
   AND png_reference='../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png' AND suffix='' AND vehicle_model IS NULL
   AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 26
 THEN RAISE EXCEPTION 'Private11: 26 exact gap-free source intervals missing'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key LIKE 'png_band/%'
    AND line_key IN ('Odawara','OdakyuEnoshima') AND suffix=''
    AND png_reference<>'../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png'
    AND EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges own
      WHERE own.edition='2611' AND own.png_reference='../images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png'
        AND own.line_key=public.published_train_png_number_ranges.line_key
        AND own.suffix=public.published_train_png_number_ranges.suffix
        AND own.min_number<=public.published_train_png_number_ranges.max_number
        AND public.published_train_png_number_ranges.min_number<=own.max_number
    )
 ) THEN RAISE EXCEPTION 'Private11: cross-PNG overlap'; END IF;
END; $verify$;
COMMIT;
