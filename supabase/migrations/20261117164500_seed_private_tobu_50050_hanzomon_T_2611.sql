-- Private railway 5th band batch: Tobu 50050 on Hanzomon.
-- Source: existing frontend helper exact-number roster exported in
-- data/audits/png-to-train-number-index-2611.json.
-- Hanzomon weekday 125, SaturdayHoliday 128 source numbers, Nov 2026.
-- Bounds 0452..2282 T use the numeric train-number body after an
-- alphabetic direction prefix, e.g. A1050T, B980T.
-- Other Tobu/Tokyu 2020 Hanzomon owner suffix is K (different suffix).
--
-- REFERENCE ONLY: existing helper exact train-number membership, route,
-- operating calendar, source operator, train type, image/model and identity
-- guards remain authoritative. All numbers inside envelope are NOT valid,
-- nor does suffix T identify the actual 50050 stock. Do not promote asset.
-- Do NOT copy to TobuSkytree: different illustration/corridor/source cohorts
-- have overlapping T-number numeric envelopes on that line.
DO $tobu_50050_hanzomon_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/東武鉄道/東武鉄道_50050型.png'
      AND operator='Tobu' AND vehicle_type='50050型'
      AND asset_status='available' AND asset_scope='generic'
      AND file_format_status='native_png' AND is_generic=TRUE
      AND appearance_class IS DISTINCT FROM 'requires_review'
  ) THEN RAISE EXCEPTION 'Tobu 50050 Hanzomon reference asset status changed'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges r
    WHERE r.edition='2611' AND r.line_key='Hanzomon'
      AND r.suffix='T' AND r.min_number<=2282 AND r.max_number>=452
      AND r.png_reference<>'../images/列车/東武鉄道/東武鉄道_50050型.png'
  ) THEN RAISE EXCEPTION 'Tobu 50050 Hanzomon T envelope overlaps different PNG'; END IF;
END
$tobu_50050_hanzomon_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Hanzomon','png_band/Hanzomon/0452-2282T',452,2282,'T',NULL,'../images/列车/東武鉄道/東武鉄道_50050型.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $tobu_50050_hanzomon_verify$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Hanzomon'
    AND segment_key='png_band/Hanzomon/0452-2282T'
    AND min_number=452 AND max_number=2282 AND suffix='T'
    AND png_reference='../images/列车/東武鉄道/東武鉄道_50050型.png'
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF n<>1 THEN RAISE EXCEPTION 'Tobu 50050 Hanzomon T range mismatch: %', n; END IF;
END
$tobu_50050_hanzomon_verify$;
