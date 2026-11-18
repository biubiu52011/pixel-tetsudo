-- JR54: one exact 8011M E001-series TRAIN SUITE Shiki-shima historical reference
-- restricted to the JR-East Takasaki line. Recorded 2026-09-05 and 2026-09-26.
-- IMPORTANT EVIDENCE GRADING: official JR East identifies the train/courses,
-- but does NOT independently publish the precise 8011M number here.
-- Dated eyewitness number + route (2026-09-26, Fukaya--Okabe, Takasaki line):
-- https://search.yahoo.co.jp/realtime/search?ei=UTF-8&ifr=tl_unit&nobtl=1&p=%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%82%A4%E3%83%BC%E3%83%88%E5%9B%9B%E5%AD%A3%E5%B3%B6
-- Independently documented 8011M on 2026-09-05 Takasaki line,
-- with 8011M--8013M through-service renumbering. Only 8011M is entered:
-- https://search.yahoo.co.jp/realtime/search?ei=UTF-8&mtype=image&p=%23%E9%AB%98%E5%B4%8E%E7%B7%9A&rkf=1
-- JR East official 2026 seasonal route / local visibility information:
-- https://www.jreast.co.jp/shiki-shima/omotenashi.html
-- JR East official dedicated E001 series cruise train (NOT the number proof):
-- https://www.jreast.co.jp/shiki-shima/train.html
-- REFERENCE ONLY, not an authorized live trip or physical fleet on 2026-11-18.
-- Do not infer 8012M/8013M or other days, other lines, or train identity
-- from a single dated historical number. No JS selector or asset promotion.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png'
    AND operator='JR-East' AND vehicle_type='E001形'
    AND asset_status='available' AND file_format_status='native_png'
    AND asset_scope='theme' AND appearance_class='dedicated_vehicle_identity'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN
  RAISE EXCEPTION 'JR54: dedicated E001-series theme image asset changed';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Takasaki' AND suffix='M'
    AND 8011 BETWEEN min_number AND max_number
 ) THEN
  RAISE EXCEPTION 'JR54: 8011M already claimed on Takasaki';
 END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Takasaki','png_band/Takasaki/8011-8011M',8011,8011,'M',NULL,'../images/列车/JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Takasaki' AND suffix='M'
    AND segment_key='png_band/Takasaki/8011-8011M'
    AND min_number=8011 AND max_number=8011
    AND png_reference='../images/列车/JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png'
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN
  RAISE EXCEPTION 'JR54: single historical E001 reference failed verification';
 END IF;
END;
$verify$;
COMMIT;
