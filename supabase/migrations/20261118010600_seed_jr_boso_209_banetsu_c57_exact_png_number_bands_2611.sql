-- 2026-11-18 JR PNG reference-only numbered services.
-- ONLY the 26 explicitly listed original 2026-11 JS publishedNumbers:
-- C57 SL Banetsu 8226 / 8233 (specific operating dates, Rapid/SLRapid,
-- source railway / direction guard), and Boso 209 Uchibo 12 / Sotobo 12
-- (Local, line, source, allowed-model and ambiguous-plan guards).
-- No inferred intermediate numbers. Not a locomotive/physical stock proof.
-- A preexisting E257 JS interval on Uchibo/Sotobo is LimitedExpress,
-- whereas Boso 209 JS evidence requires Local; the migration also rejects
-- any collision against the original formal SQL ranges by same line/suffix.
-- This records missing PNG-number references, not runtime permissions.
DO $jr_c57_209_source_png_preflight$
DECLARE x record;
BEGIN
  FOR x IN SELECT * FROM (VALUES
    ('images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png','car','C57形'),
    ('images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png','subseries','209系')
  ) AS v(path,scope,vehicle_type)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_image_assets a
       WHERE a.image_path=x.path AND a.operator='JR-East'
         AND a.vehicle_type=x.vehicle_type AND a.asset_status='available'
         AND a.asset_scope=x.scope AND a.file_format_status='native_png'
         AND a.appearance_class IS DISTINCT FROM 'requires_review'
    ) THEN RAISE EXCEPTION 'Unapproved JR PNG asset: %', x.path; END IF;
  END LOOP;
  IF EXISTS (
    WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
      ('BanetsuWest',8226,8226,'','../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png'),
      ('BanetsuWest',8233,8233,'','../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png'),
      ('Sotobo',221,221,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',223,223,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',240,240,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',244,244,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',261,261,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',269,269,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',275,275,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',278,278,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',286,286,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',289,289,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',297,297,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Sotobo',1226,1226,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',123,123,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',129,129,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',137,137,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',141,141,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',169,169,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',175,175,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',181,181,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',187,187,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',193,193,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',197,197,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',1133,1133,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'),
      ('Uchibo',1135,1135,'M','../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png')
    )
    SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key=p.line_key AND r.suffix=p.suffix
     AND r.min_number<=p.max_number AND r.max_number>=p.min_number
     AND r.png_reference<>p.png_reference
  ) THEN RAISE EXCEPTION 'JR Boso/SL numbered PNG would overlap different SQL PNG'; END IF;
END
$jr_c57_209_source_png_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','BanetsuWest','png_band/BanetsuWest/8226-8226',8226,8226,'',NULL,'../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png',NULL,FALSE,FALSE),
  ('2611','BanetsuWest','png_band/BanetsuWest/8233-8233',8233,8233,'',NULL,'../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0221-0221M',221,221,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0223-0223M',223,223,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0240-0240M',240,240,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0244-0244M',244,244,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0261-0261M',261,261,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0269-0269M',269,269,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0275-0275M',275,275,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0278-0278M',278,278,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0286-0286M',286,286,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0289-0289M',289,289,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/0297-0297M',297,297,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/1226-1226M',1226,1226,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0123-0123M',123,123,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0129-0129M',129,129,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0137-0137M',137,137,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0141-0141M',141,141,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0169-0169M',169,169,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0175-0175M',175,175,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0181-0181M',181,181,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0187-0187M',187,187,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0193-0193M',193,193,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/0197-0197M',197,197,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/1133-1133M',1133,1133,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/1135-1135M',1135,1135,'M',NULL,'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr_c57_209_source_png_verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n
 FROM public.published_train_png_number_ranges
 WHERE edition='2611'
   AND ((line_key='BanetsuWest' AND png_reference='../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png')
     OR (line_key IN ('Uchibo','Sotobo') AND png_reference='../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'))
   AND segment_key LIKE 'png_band/%'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n<>26 THEN RAISE EXCEPTION 'JR 209/C57 numeric PNG records inconsistent: %/26',n; END IF;
END
$jr_c57_209_source_png_verify$;
