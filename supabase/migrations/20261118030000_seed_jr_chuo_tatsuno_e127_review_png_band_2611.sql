-- JR batch 27. Keep image asset status REVIEW: never assert verified livery or actual train.
-- Existing original JR ChuoTatsuno js-0061 exact number 159M (both weekday/holiday).
-- A single bounded reference interval is all the published JS number source supports.
-- Date, Local type, directional parity and E127 model prefix remain runtime guards.
DO $jr_e127_review_preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png' AND operator='JR-East'
   AND vehicle_type='E127系100番台' AND asset_status='review'
   AND asset_scope='review' AND appearance_class='requires_review'
   AND file_format_status='native_png') THEN
  RAISE EXCEPTION 'JR ChuoTatsuno E127 original PNG review status changed';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key LIKE 'png_band/%'
    AND line_key='ChuoTatsuno' AND suffix='M'
    AND 159 BETWEEN min_number AND max_number
    AND png_reference<>'../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png'
 ) THEN RAISE EXCEPTION 'JR E127 159M overlaps a different PNG'; END IF;
END
$jr_e127_review_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','ChuoTatsuno','png_band/ChuoTatsuno/0159-0159M',159,159,'M',NULL,'../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr_e127_review_verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='ChuoTatsuno'
     AND segment_key='png_band/ChuoTatsuno/0159-0159M'
     AND min_number=159 AND max_number=159 AND suffix='M'
     AND png_reference='../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png'
     AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 1 THEN
  RAISE EXCEPTION 'JR ChuoTatsuno E127 159M reference row missing';
 END IF;
END
$jr_e127_review_verify$;
