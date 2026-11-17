-- JR batch 25: Existing documented train number bands only, no manufactured gap-fill.
-- Original JS js-0043 Takasaki 211 Shonan: 163 train numbers -> 13 islands.
-- js-0044 Agatsuma 211 Shonan: 28 train numbers -> 1 island.
-- js-0065 ChuoMain 211 Nagano: 47 train numbers -> 2 islands (366M absent).
-- No trainset evidence asserted; illustration does not prove actual vehicle.
-- Original 2026-11 date, Local class, model and candidate-overlap guards stay in JS.

DO $jr211_preflight$
BEGIN
 IF (SELECT count(*) FROM public.vehicle_image_assets
     WHERE image_path IN (
       'images/列车/JR東日本/JR東日本_211系_湘南色.png',
       'images/列车/JR東日本/JR東日本_211系_長野色.png')
       AND operator='JR-East' AND vehicle_type='211系'
       AND asset_status='available' AND file_format_status='native_png'
       AND asset_scope='theme' AND appearance_class='standard_or_fixed_livery') <> 2 THEN
  RAISE EXCEPTION 'JR 211 original gallery PNG assets changed';
 END IF;
 IF EXISTS (
   WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
     ('Takasaki', 420, 481, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 483, 483, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 520, 547, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 620, 622, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 624, 630, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 632, 643, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 645, 645, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 647, 647, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 649, 649, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 651, 661, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 720, 721, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 723, 750, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Takasaki', 753, 758, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('Agatsuma', 520, 547, 'M', '../images/列车/JR東日本/JR東日本_211系_湘南色.png'),
     ('ChuoMain', 320, 365, 'M', '../images/列车/JR東日本/JR東日本_211系_長野色.png'),
     ('ChuoMain', 367, 367, 'M', '../images/列车/JR東日本/JR東日本_211系_長野色.png')
   )
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
    ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
   AND r.line_key=p.line_key AND r.suffix=p.suffix
   AND r.min_number<=p.max_number AND r.max_number>=p.min_number
   AND r.png_reference<>p.png_reference
 ) THEN RAISE EXCEPTION 'JR 211 proposed band conflicts with different PNG'; END IF;
END
$jr211_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Takasaki','png_band/Takasaki/0420-0481M',420,481,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0483-0483M',483,483,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0520-0547M',520,547,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0620-0622M',620,622,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0624-0630M',624,630,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0632-0643M',632,643,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0645-0645M',645,645,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0647-0647M',647,647,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0649-0649M',649,649,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0651-0661M',651,661,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0720-0721M',720,721,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0723-0750M',723,750,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/0753-0758M',753,758,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Agatsuma','png_band/Agatsuma/0520-0547M',520,547,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0320-0365M',320,365,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','ChuoMain','png_band/ChuoMain/0367-0367M',367,367,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr211_postflight$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key LIKE 'png_band/%'
 AND ((line_key IN ('Takasaki','Agatsuma') AND suffix='M'
    AND png_reference='../images/列车/JR東日本/JR東日本_211系_湘南色.png')
 OR (line_key='ChuoMain' AND suffix='M'
    AND png_reference='../images/列车/JR東日本/JR東日本_211系_長野色.png'))
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n<>16 THEN RAISE EXCEPTION 'JR 211 expected 16 reference islands, found %',n; END IF;
END
$jr211_postflight$;
