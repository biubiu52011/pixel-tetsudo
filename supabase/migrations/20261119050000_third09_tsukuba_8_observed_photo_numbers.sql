-- Third09: historical passenger train-number observations on Tsukuba Express.
-- 2025 photo evidence is NOT an operator-certified daily roster or present-day fleet assignment.
-- One full number per interval; never fill unobserved gaps; no operating-date split.
-- TsukubaExpress has no real-time position API in current railway_lines.
-- TX-1000系 5305: observed 2025-08-07 https://raillab.jp/photo/470346
-- TX-1000系 5316: observed 2025-04-22 https://raillab.jp/photo/441064
-- TX-1000系 5319: observed 2025-04-22 https://raillab.jp/photo/441277
-- TX-2000系 3021: observed 2025-04-22 https://raillab.jp/photo/441001
-- TX-2000系 3027: observed 2025-01-11 https://raillab.jp/photo/413069
-- TX-2000系 5036: observed 2025-01-11 https://raillab.jp/photo/413095
-- TX-3000系 5031: observed 2025-08-07 https://raillab.jp/photo/470340
-- TX-3000系 5044: observed 2025-08-08 https://raillab.jp/photo/480738
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png' AND operator='TsukubaExpress'
 AND vehicle_type='TX-1000系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND appearance_class='standard_or_fixed_livery' AND is_generic=TRUE
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Third09: gallery asset 1 contract changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png' AND operator='TsukubaExpress'
 AND vehicle_type='TX-2000系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND appearance_class='standard_or_fixed_livery' AND is_generic=TRUE
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Third09: gallery asset 2 contract changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png' AND operator='TsukubaExpress'
 AND vehicle_type='TX-3000系' AND asset_status='available'
 AND asset_scope='generic' AND file_format_status='native_png'
 AND appearance_class='standard_or_fixed_livery' AND is_generic=TRUE
 AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Third09: gallery asset 3 contract changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5305 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5305 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5316 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5316 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5319 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5319 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 3021 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 3021 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 3027 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 3027 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5036 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5036 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5031 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5031 already occupied'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND COALESCE(suffix,'')=''
 AND 5044 BETWEEN min_number AND max_number)
 THEN RAISE EXCEPTION 'Third09: 5044 already occupied'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5305-5305',5305,5305,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5316-5316',5316,5316,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5319-5319',5319,5319,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/3021-3021',3021,3021,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/3027-3027',3027,3027,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5036-5036',5036,5036,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5031-5031',5031,5031,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png',NULL,FALSE,FALSE),
 ('2611','TsukubaExpress','png_band/TsukubaExpress/5044-5044',5044,5044,'',NULL,'../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5305-5305'
 AND min_number=5305 AND max_number=5305 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5305 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5316-5316'
 AND min_number=5316 AND max_number=5316 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5316 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5319-5319'
 AND min_number=5319 AND max_number=5319 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5319 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/3021-3021'
 AND min_number=3021 AND max_number=3021 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 3021 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/3027-3027'
 AND min_number=3027 AND max_number=3027 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 3027 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5036-5036'
 AND min_number=5036 AND max_number=5036 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5036 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5031-5031'
 AND min_number=5031 AND max_number=5031 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5031 persistence mismatch'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='TsukubaExpress' AND segment_key='png_band/TsukubaExpress/5044-5044'
 AND min_number=5044 AND max_number=5044 AND suffix=''
 AND png_reference='../images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png' AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third09: 5044 persistence mismatch'; END IF;
END;
$verify$;
COMMIT;
