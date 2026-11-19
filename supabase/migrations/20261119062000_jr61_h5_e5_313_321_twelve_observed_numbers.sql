-- JR61: 12 exact publicly observed train-number references across four JR image families.
-- Photographs/ride records are historical; they do not guarantee this model on another day.
-- Do not partition the composite PNG number pool by observation date.
-- H5系 TohokuShinkansen 3023B: 2026-09-03 https://raillab.jp/record/963856
-- E5系 TohokuShinkansen 17B: 2026-07-23 https://raillab.jp/photo/557203
-- E5系 TohokuShinkansen 154B: 2026-08-11 https://raillab.jp/record/948388
-- E5系 TohokuShinkansen 203B: 2026-02-13 https://raillab.jp/record/865222
-- E5系 TohokuShinkansen 6129B: 2026-04-18 https://raillab.jp/record/894548
-- 313系 TokaidoCentral 437M: 2026-10-31 https://raillab.jp/record/991500
-- 313系 TokaidoCentral 490M: 2026-09-21 https://raillab.jp/photo/576119
-- 313系 TokaidoCentral 1424M: 2026-07-09 https://raillab.jp/record/930431
-- 313系 TokaidoCentral 2311F: 2026-07-31 https://raillab.jp/record/940538
-- 313系 TokaidoCentral 5512F: 2026-09-20 https://raillab.jp/photo/573765
-- 313系 TokaidoCentral 5517F: 2026-10-24 https://raillab.jp/photo/585864
-- 321系 SanyoMain 531C: 2026-10-16 https://raillab.jp/record/984796
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR北海道/JR北海道_H5系.png' AND operator='JR-Hokkaido'
 AND vehicle_type='H5系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND is_generic=TRUE AND appearance_class='standard_or_fixed_livery'
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR61: gallery asset 1 changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E5系.png' AND operator='JR-East'
 AND vehicle_type='E5系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND is_generic=TRUE AND appearance_class='standard_or_fixed_livery'
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR61: gallery asset 2 changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東海/JR東海_313系.png' AND operator='JR-Central'
 AND vehicle_type='313系' AND asset_status='available'
 AND asset_scope='formation' AND file_format_status='native_png'
 AND is_generic=TRUE AND appearance_class IS NULL
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR61: gallery asset 3 changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR西日本/JR西日本_321系.png' AND operator='JR-West'
 AND vehicle_type='321系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND is_generic=TRUE AND appearance_class='standard_or_fixed_livery'
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'JR61: gallery asset 4 changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND COALESCE(suffix,'')='B'
 AND 3023 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TohokuShinkansen/3023B occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND COALESCE(suffix,'')='B'
 AND 17 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TohokuShinkansen/17B occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND COALESCE(suffix,'')='B'
 AND 154 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TohokuShinkansen/154B occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND COALESCE(suffix,'')='B'
 AND 203 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TohokuShinkansen/203B occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND COALESCE(suffix,'')='B'
 AND 6129 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TohokuShinkansen/6129B occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='M'
 AND 437 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/437M occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='M'
 AND 490 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/490M occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='M'
 AND 1424 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/1424M occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='F'
 AND 2311 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/2311F occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='F'
 AND 5512 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/5512F occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND COALESCE(suffix,'')='F'
 AND 5517 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: TokaidoCentral/5517F occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='SanyoMain' AND COALESCE(suffix,'')='C'
 AND 531 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'JR61: SanyoMain/531C occupied'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','TohokuShinkansen','png_band/TohokuShinkansen/3023-3023B',3023,3023,'B',NULL,'../images/列车/JR北海道/JR北海道_H5系.png',NULL,FALSE,FALSE),
 ('2611','TohokuShinkansen','png_band/TohokuShinkansen/0017-0017B',17,17,'B',NULL,'../images/列车/JR東日本/JR東日本_E5系.png',NULL,FALSE,FALSE),
 ('2611','TohokuShinkansen','png_band/TohokuShinkansen/0154-0154B',154,154,'B',NULL,'../images/列车/JR東日本/JR東日本_E5系.png',NULL,FALSE,FALSE),
 ('2611','TohokuShinkansen','png_band/TohokuShinkansen/0203-0203B',203,203,'B',NULL,'../images/列车/JR東日本/JR東日本_E5系.png',NULL,FALSE,FALSE),
 ('2611','TohokuShinkansen','png_band/TohokuShinkansen/6129-6129B',6129,6129,'B',NULL,'../images/列车/JR東日本/JR東日本_E5系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/0437-0437M',437,437,'M',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/0490-0490M',490,490,'M',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/1424-1424M',1424,1424,'M',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/2311-2311F',2311,2311,'F',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/5512-5512F',5512,5512,'F',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','TokaidoCentral','png_band/TokaidoCentral/5517-5517F',5517,5517,'F',NULL,'../images/列车/JR東海/JR東海_313系.png',NULL,FALSE,FALSE),
 ('2611','SanyoMain','png_band/SanyoMain/0531-0531C',531,531,'C',NULL,'../images/列车/JR西日本/JR西日本_321系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND segment_key='png_band/TohokuShinkansen/3023-3023B'
 AND min_number=3023 AND max_number=3023 AND suffix='B'
 AND png_reference='../images/列车/JR北海道/JR北海道_H5系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TohokuShinkansen/3023B mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND segment_key='png_band/TohokuShinkansen/0017-0017B'
 AND min_number=17 AND max_number=17 AND suffix='B'
 AND png_reference='../images/列车/JR東日本/JR東日本_E5系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TohokuShinkansen/17B mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND segment_key='png_band/TohokuShinkansen/0154-0154B'
 AND min_number=154 AND max_number=154 AND suffix='B'
 AND png_reference='../images/列车/JR東日本/JR東日本_E5系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TohokuShinkansen/154B mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND segment_key='png_band/TohokuShinkansen/0203-0203B'
 AND min_number=203 AND max_number=203 AND suffix='B'
 AND png_reference='../images/列车/JR東日本/JR東日本_E5系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TohokuShinkansen/203B mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TohokuShinkansen' AND segment_key='png_band/TohokuShinkansen/6129-6129B'
 AND min_number=6129 AND max_number=6129 AND suffix='B'
 AND png_reference='../images/列车/JR東日本/JR東日本_E5系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TohokuShinkansen/6129B mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/0437-0437M'
 AND min_number=437 AND max_number=437 AND suffix='M'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/437M mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/0490-0490M'
 AND min_number=490 AND max_number=490 AND suffix='M'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/490M mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/1424-1424M'
 AND min_number=1424 AND max_number=1424 AND suffix='M'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/1424M mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/2311-2311F'
 AND min_number=2311 AND max_number=2311 AND suffix='F'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/2311F mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/5512-5512F'
 AND min_number=5512 AND max_number=5512 AND suffix='F'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/5512F mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TokaidoCentral' AND segment_key='png_band/TokaidoCentral/5517-5517F'
 AND min_number=5517 AND max_number=5517 AND suffix='F'
 AND png_reference='../images/列车/JR東海/JR東海_313系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted TokaidoCentral/5517F mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='SanyoMain' AND segment_key='png_band/SanyoMain/0531-0531C'
 AND min_number=531 AND max_number=531 AND suffix='C'
 AND png_reference='../images/列车/JR西日本/JR西日本_321系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR61: persisted SanyoMain/531C mismatch'; END IF;
END;
$verify$;
COMMIT;
