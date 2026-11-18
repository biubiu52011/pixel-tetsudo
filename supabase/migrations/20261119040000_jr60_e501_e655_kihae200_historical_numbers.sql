-- JR60 three dated observations as DATE-FREE pure-number references.
-- The same number may use another vehicle on another date; not a live stock assignment.
-- JobanMain 562M https://raillab.jp/photo/587656
-- UtsunomiyaJR 9022M https://raillab.jp/photo/584160
-- Komii 136D https://raillab.jp/record/963048
-- E501 562M is on JobanMain, not JobanRapid/Joban.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E501系.png' AND operator='JR-East'
  AND vehicle_type='E501系' AND asset_status='available'
  AND asset_scope='generic' AND file_format_status='native_png'
  AND is_generic=TRUE AND appearance_class='standard_or_fixed_livery'
  AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR60 asset 1 changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='JobanMain' AND suffix='M'
  AND 562 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR60 conflicting 562M'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E655系_なごみ_和.png' AND operator='JR-East'
  AND vehicle_type='E655系' AND asset_status='available'
  AND asset_scope='theme' AND file_format_status='native_png'
  AND is_generic=FALSE AND appearance_class='dedicated_vehicle_identity'
  AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR60 asset 2 changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='UtsunomiyaJR' AND suffix='M'
  AND 9022 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR60 conflicting 9022M'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_キハE200系（小海線）.png' AND operator='JR-East'
  AND vehicle_type='キハE200系（小海線）' AND asset_status='available'
  AND asset_scope='generic' AND file_format_status='native_png'
  AND is_generic=TRUE AND appearance_class IS NULL
  AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR60 asset 3 changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Komii' AND suffix='D'
  AND 136 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR60 conflicting 136D'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','JobanMain','png_band/JobanMain/0562-0562M',562,562,'M',NULL,'../images/列车/JR東日本/JR東日本_E501系.png',NULL,FALSE,FALSE),
 ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/9022-9022M',9022,9022,'M',NULL,'../images/列车/JR東日本/JR東日本_E655系_なごみ_和.png',NULL,FALSE,FALSE),
 ('2611','Komii','png_band/Komii/0136-0136D',136,136,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE200系（小海線）.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='JobanMain' AND segment_key='png_band/JobanMain/0562-0562M'
  AND min_number=562 AND max_number=562 AND suffix='M'
  AND png_reference='../images/列车/JR東日本/JR東日本_E501系.png' AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR60 persistence JobanMain error'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='UtsunomiyaJR' AND segment_key='png_band/UtsunomiyaJR/9022-9022M'
  AND min_number=9022 AND max_number=9022 AND suffix='M'
  AND png_reference='../images/列车/JR東日本/JR東日本_E655系_なごみ_和.png' AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR60 persistence UtsunomiyaJR error'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Komii' AND segment_key='png_band/Komii/0136-0136D'
  AND min_number=136 AND max_number=136 AND suffix='D'
  AND png_reference='../images/列车/JR東日本/JR東日本_キハE200系（小海線）.png' AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR60 persistence Komii error'; END IF;
END;
$verify$;
COMMIT;
