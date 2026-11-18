-- Private19 source correction: 5653M appears in a timetable but is not
-- proven to be operated by Aloha 3000. The actual source-backed 3000
-- service rows are 5644M,5645M,5652M,1653M,1658M,5659M.
-- Operator daily PDF and independent trainstock cross-check:
-- https://www.izukyu.co.jp/train/index.php
-- https://ss1.xrea.com/shirabetai.g1.xrea.com/unyou/20260314/ito_ikk.html
-- Never infer vehicle artwork for an adjacent, different train number.
BEGIN;
DO $preflight$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='Ito' AND suffix='M'
      AND segment_key='png_band/Ito/5652-5653M'
      AND min_number=5652 AND max_number=5653
      AND png_reference='../images/列车/伊豆急行/伊豆急行_3000系.png'
      AND vehicle_model IS NULL AND source_url IS NULL
      AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
    ) <> 1
 THEN RAISE EXCEPTION 'Private19: expected exactly one 5652-5653 original band'; END IF;
END;
$preflight$;
UPDATE public.published_train_png_number_ranges
  SET segment_key='png_band/Ito/5652-5652M',max_number=5652
 WHERE edition='2611' AND line_key='Ito' AND suffix='M'
   AND segment_key='png_band/Ito/5652-5653M'
   AND min_number=5652 AND max_number=5653
   AND png_reference='../images/列车/伊豆急行/伊豆急行_3000系.png';
DO $verify$
DECLARE nb integer; nn integer;
BEGIN
 SELECT count(*),coalesce(sum(max_number-min_number+1),0) INTO nb,nn
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Ito'
   AND png_reference='../images/列车/伊豆急行/伊豆急行_3000系.png'
   AND segment_key LIKE 'png_band/Ito/%';
 IF nb<>5 OR nn<>6 THEN
 RAISE EXCEPTION 'Private19 expected five rows for six source numbers, got %/%',nb,nn;
 END IF;
 IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='Ito' AND suffix='M'
      AND png_reference='../images/列车/伊豆急行/伊豆急行_3000系.png'
      AND 5653 BETWEEN min_number AND max_number
 ) THEN RAISE EXCEPTION 'Private19 5653 must remain unassigned'; END IF;
END;
$verify$;
COMMIT;
