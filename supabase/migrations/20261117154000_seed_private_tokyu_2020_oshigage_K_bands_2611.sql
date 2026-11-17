-- Private railway fourth band batch: Tokyu 2020 generic illustration.
-- Based on existing *numbered and guarded* 2026-11 frontend helper rosters,
-- as exported in data/audits/png-to-train-number-index-2611.json.
-- Source line/calendar/number-family:
-- Hanzomon through / weekday 298, holiday 180 exact documented numbers,
--   inclusive numeric envelope 501..2333, operator train suffix K.
-- TobuSkytree ordinary/Oshiage / weekday 98, holiday 84 exact numbers,
--   inclusive numeric envelope 503..4934, operator train suffix K.
-- A501K, B941K, C1005K, D4504K are examples of prefix+digits+K.
-- Store numeric envelopes only. Format in PNG audit CSV = metro-prefixed:
-- peel optional alphabetic direction prefix; compare full numeric train
-- number and ownership suffix K. Do not match vehicle formation numbers.
--
-- CRITICAL: These envelopes DO NOT claim that all contained train numbers
-- are present, or that all K-numbered trainsets are physically 2020-series.
-- The existing original frontend helper must check its *exact* documented
-- number roster, service day, operator, source railway, corridor,
-- train type, model and identity evidence; ranges do not supersede it.
-- Train stock 5000 etc may share K suffix; reference-only, fail closed.
-- Never promote gallery assets, alter current vehicle runtime selection,
-- infer dates from the bounds, or treat these records as exact trainsets.
DO $tokyu_2020_source_guard$
DECLARE x record;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/東急電鉄/東急電鉄_2020系.png'
      AND operator='Tokyu' AND vehicle_type='2020系'
      AND asset_status='available' AND asset_scope='generic'
      AND file_format_status='native_png' AND is_generic=TRUE
      AND appearance_class IS DISTINCT FROM 'requires_review'
  ) THEN
    RAISE EXCEPTION 'Tokyu 2020 generic PNG asset is not available';
  END IF;

  FOR x IN SELECT * FROM (VALUES
    ('Hanzomon',501,2333,'K','../images/列车/東急電鉄/東急電鉄_2020系.png'),
    ('TobuSkytree',503,4934,'K','../images/列车/東急電鉄/東急電鉄_2020系.png')
  ) AS v(line_key,min_number,max_number,suffix,png_reference)
  LOOP
    IF EXISTS(
      SELECT 1 FROM public.published_train_png_number_ranges r
      WHERE r.edition='2611' AND r.line_key=x.line_key
        AND r.suffix=x.suffix
        AND r.min_number<=x.max_number AND r.max_number>=x.min_number
        AND r.png_reference<>x.png_reference
    ) THEN RAISE EXCEPTION 'Tokyu 2020 K reference has cross-PNG overlap: %',x.line_key; END IF;
  END LOOP;
END
$tokyu_2020_source_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Hanzomon','png_band/Hanzomon/0501-2333K',501,2333,'K',NULL,'../images/列车/東急電鉄/東急電鉄_2020系.png',NULL,FALSE,FALSE),
  ('2611','TobuSkytree','png_band/TobuSkytree/0503-4934K',503,4934,'K',NULL,'../images/列车/東急電鉄/東急電鉄_2020系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $tokyu_2020_band_verify$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.published_train_png_number_ranges r
  WHERE edition='2611' AND
    ((r.line_key='Hanzomon' AND r.segment_key='png_band/Hanzomon/0501-2333K'
      AND r.min_number=501 AND r.max_number=2333 AND r.suffix='K'
      AND r.png_reference='../images/列车/東急電鉄/東急電鉄_2020系.png')
     OR
     (r.line_key='TobuSkytree' AND r.segment_key='png_band/TobuSkytree/0503-4934K'
      AND r.min_number=503 AND r.max_number=4934 AND r.suffix='K'
      AND r.png_reference='../images/列车/東急電鉄/東急電鉄_2020系.png'))
    AND r.vehicle_model IS NULL AND r.source_url IS NULL
    AND r.requires_exact_roster=FALSE AND r.actual_vehicle_confirmed=FALSE;
  IF n<>2 THEN RAISE EXCEPTION 'Tokyu 2020 pure reference band mismatch: %/2',n; END IF;
END
$tokyu_2020_band_verify$;
