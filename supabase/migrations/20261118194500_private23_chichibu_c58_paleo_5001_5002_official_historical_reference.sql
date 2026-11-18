-- Private23: C58 363 SL Paleo Express, ChichibuMain, exact numbered-service
-- references from operator's official *2025* timetable (NOT a 2026 daily roster).
-- Official March 2025 full timetable: weekend down 5001 / up 5002, explicitly
-- labeled 'SL パレオエクスプレス', both with NO letter suffix.
-- https://www.chichibu-railway.co.jp/assets/timetable/A3_202503_all.pdf
-- Operator's 2026 operation period (March 20 through Dec 6) / one round trip:
-- https://www.chichibu-railway.co.jp/slpaleo/calendar.html
-- Official 2026 operator release identifies locomotive C58 363:
-- https://www.chichibu-railway.co.jp/blog/news/sl2026/
-- Dated independent 2026 running references: 5001/5002 with C58 363:
-- https://www.tetsudo.com/movie/category/10061/42.html
-- https://www.tetsudo.com/blog/search/-/-/%E7%A7%A9%E7%88%B6/
-- The '5001 / 5002' numbers are *train numbers*, NOT Chichibu 5000-series
-- trainset IDs 5001/5002. Do not conflate these two separate concepts.
-- Only the C58 363 PNG is assigned; the accompanying 12-series carriage PNG
-- remains unnumbered to avoid two competing PNGs for one train number.
-- Source-only history, not proof of locomotive, livery, operating date, or
-- vehicle composition on 2026-11-18. No runtime selector or gallery promotion.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/秩父鉄道/秩父鉄道_C58形_363号機.png'
    AND operator='ChichibuRailway' AND vehicle_type='C58形'
    AND asset_status='available' AND file_format_status='native_png'
    AND asset_scope='review' AND appearance_class='dedicated_vehicle_identity'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN
  RAISE EXCEPTION 'Private23: C58-363 source-only review gallery asset changed';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND r.line_key='ChichibuMain' AND r.suffix=''
    AND (5001 BETWEEN r.min_number AND r.max_number
      OR 5002 BETWEEN r.min_number AND r.max_number)
 ) THEN
  RAISE EXCEPTION 'Private23: one of 5001 or 5002 has already been assigned';
 END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','ChichibuMain','png_band/ChichibuMain/5001-5002',5001,5002,'',
  NULL,'../images/列车/秩父鉄道/秩父鉄道_C58形_363号機.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='ChichibuMain'
     AND segment_key='png_band/ChichibuMain/5001-5002'
     AND min_number=5001 AND max_number=5002 AND suffix=''
     AND png_reference='../images/列车/秩父鉄道/秩父鉄道_C58形_363号機.png'
     AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN
  RAISE EXCEPTION 'Private23: historical reference count mismatch';
 END IF;
END;
$verify$;
COMMIT;
