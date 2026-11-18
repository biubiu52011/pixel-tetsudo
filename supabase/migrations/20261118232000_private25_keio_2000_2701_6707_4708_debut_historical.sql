-- Private25: Keio 2000 series 2701F debut DAY ONLY (2026-01-31).
-- Operator official 2000-series train timing, 2026-01-31 to 2026-02-08:
-- https://www.keio.co.jp/unkou_information/unkou/pdf/20260131shingata2000.pdf
-- 2026-01-31 eyewitness report cross-identifying train numbers and consist:
-- https://tamatetsurailwaay.seesaa.net/article/519989838.html
-- 6707 Local, Chofu 05:29 -> Hashimoto 05:55.
-- 4708 SemiExpress, Hashimoto 06:10 -> Shinjuku 07:03.
-- 2000 series first-running-day 2701F independently confirmed:
-- https://railf.jp/news/2026/02/02/001500.html
-- Official PDF contains times NOT literal train numbers. 6707 and 4708 come
-- from contemporaneous non-operator reporting; they are NOT official numbers.
-- Manual source only proves the train IDs and train types exist on KeioSagami;
-- it predates introduction of the 2000 series and lists older eligible models.
-- Both refs are historical; they cannot authorize a 2026-11 vehicle identity
-- or replace the live timetable, operator/date/model/roster guards.
-- Only KeioSagami sections, not unregistered KeioMain.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/京王電鉄/京王電鉄_2000系.png' AND operator='Keio' AND vehicle_type='2000系'
    AND asset_status='available' AND file_format_status='native_png'
    AND asset_scope='generic' AND is_generic=TRUE
    AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private25: Keio 2000-series gallery PNG not eligible'; END IF;
 IF (SELECT COUNT(DISTINCT train_number) FROM public.manual_timetable_templates
     WHERE line_key='KeioSagami' AND train_number IN ('6707','4708')
      AND source_path='data/timetables/KeioSagami-manual.js'
      AND ((train_number='6707' AND train_type_urn='odpt.TrainType:Keio.Local')
        OR (train_number='4708' AND train_type_urn='odpt.TrainType:Keio.SemiExpress'))
 ) <> 2 THEN RAISE EXCEPTION 'Private25: original KeioSagami train IDs drifted'; END IF;
 IF EXISTS (
   WITH proposed(n) AS (VALUES (6707),(4708))
   SELECT 1 FROM proposed x JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key='KeioSagami' AND r.suffix=''
       AND x.n BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private25: number collisions on KeioSagami'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','KeioSagami','png_band/KeioSagami/4708-4708',4708,4708,'',NULL,'../images/列车/京王電鉄/京王電鉄_2000系.png',NULL,FALSE,FALSE),
 ('2611','KeioSagami','png_band/KeioSagami/6707-6707',6707,6707,'',NULL,'../images/列车/京王電鉄/京王電鉄_2000系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
      WHERE edition='2611' AND line_key='KeioSagami'
       AND segment_key IN ('png_band/KeioSagami/4708-4708','png_band/KeioSagami/6707-6707')
       AND png_reference='../images/列车/京王電鉄/京王電鉄_2000系.png'
       AND suffix='' AND min_number=max_number
       AND min_number IN (4708,6707)
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 2
 THEN RAISE EXCEPTION 'Private25: exactly two reference islands expected'; END IF;
END;
$verify$;
COMMIT;
