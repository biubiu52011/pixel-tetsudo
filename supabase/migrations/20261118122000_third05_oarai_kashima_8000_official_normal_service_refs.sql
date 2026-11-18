-- Third05: Oarai-Kashima (Kashima Rinkai Railway) 8000 series.
-- OFFICIAL dated article 2026-07-21: https://www.rintetsu.co.jp/14034.html
-- Operator explicitly describes these ten FULL train numbers as normally
-- 8000-series, with possible 6000-series substitutions 2026-08-03 through
-- 2026-09-20: 116D 179D 1131D 1156D 1157D 1172D 1173D 1178D
-- 2117D 2130D. This does NOT establish stock on 2026-11-18.
-- Official 2026-03-14 line timetable: https://www.rintetsu.co.jp/timetable
-- Use OaraiKashima as a DATA-ONLY railway reference key: the website has
-- no corresponding current railway line/view. Never treat these rows as
-- JR-East's distinct line_key Kashima or automatically render live PNG.
-- The 6000-series picture files remain REVIEW; do not give them this
-- overlapping numbering or any fictitious color/formation identity.
-- Eight minimal contiguous islands; every intervening non-source number
-- is intentionally omitted. NULL model/URL and false confirmation gates
-- encode reference-only status, not a verified daily vehicle/carset.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png'
   AND operator='KashimaRinkaiRailway' AND vehicle_type='8000形'
   AND asset_status='available' AND file_format_status='native_png'
   AND asset_scope='generic' AND is_generic=TRUE
   AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Third05: official 8000 generic PNG unavailable'; END IF;
 IF EXISTS(
   WITH proposed(a,b) AS (VALUES (116,116),(179,179),(1131,1131),(1156,1157),(1172,1173),(1178,1178),(2117,2117),(2130,2130))
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.line_key='OaraiKashima' AND r.suffix='D'
     AND r.min_number<=p.b AND r.max_number>=p.a
 ) THEN RAISE EXCEPTION 'Third05: other OaraiKashima D-number PNG conflict'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','OaraiKashima','png_band/OaraiKashima/0116-0116D',116,116,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/0179-0179D',179,179,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/1131-1131D',1131,1131,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/1156-1157D',1156,1157,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/1172-1173D',1172,1173,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/1178-1178D',1178,1178,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/2117-2117D',2117,2117,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE),
 ('2611','OaraiKashima','png_band/OaraiKashima/2130-2130D',2130,2130,'D',NULL,'../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='OaraiKashima'
  AND png_reference='../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png'
  AND segment_key LIKE 'png_band/OaraiKashima/%'
  AND suffix='D' AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>8
 THEN RAISE EXCEPTION 'Third05: expected eight source-only contiguous islands'; END IF;
 IF (SELECT SUM(max_number-min_number+1)
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='OaraiKashima'
  AND png_reference='../images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png'
  AND segment_key LIKE 'png_band/OaraiKashima/%')<>10
 THEN RAISE EXCEPTION 'Third05: expected exactly ten official full D numbers'; END IF;
END;
$verify$;
COMMIT;
