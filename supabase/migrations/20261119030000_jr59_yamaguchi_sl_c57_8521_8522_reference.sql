-- JR59: SL Yamaguchi public 8521 and 8522 train-number reference.
-- https://timetable.jr-odekake.net/train-timetable/137891?date=20260829
-- https://timetable.jr-odekake.net/train-timetable/137931?date=20261003
-- https://www.westjr.co.jp/press/article/2026/05/29/page_30690.html
-- Both numbers may be hauled by D51, C57 or diesel substitute.
-- Reference ONLY; no actual locomotive identity or review-PNG activation.
-- Composite pool does not split by running date; DATA-ONLY Yamaguchi line key.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png' AND operator='JR-West' AND vehicle_type='C57形'
   AND asset_status='review' AND asset_scope='review'
   AND is_generic=FALSE AND appearance_class='requires_review')
 THEN RAISE EXCEPTION 'JR59: review image scope changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Yamaguchi' AND COALESCE(suffix,'')=''
   AND min_number<=8522 AND max_number>=8521)
 THEN RAISE EXCEPTION 'JR59: existing Yamaguchi band intersects 8521-8522'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Yamaguchi','png_band/Yamaguchi/8521-8522',8521,8522,'',NULL,'../images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Yamaguchi' AND segment_key='png_band/Yamaguchi/8521-8522'
   AND min_number=8521 AND max_number=8522 AND suffix=''
   AND png_reference='../images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR59: reference-only number band not persisted'; END IF;
END;
$verify$;
COMMIT;
