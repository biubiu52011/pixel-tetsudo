-- Private16: Keio 5000-series; two exact train-number references, not daily carset proof.
-- Official Keio 5000/KL service model: https://www.keio.co.jp/keiofan/museum/exist/
-- Official Liner service: https://www.keio.co.jp/zasekishitei/
-- 2026-10-31 dated 7732/Keio Liner 32/5000-series photo:
-- https://note.com/seibu_nra10000/n/n5679a4e32eba
-- 2026 revised service-number 7736: https://w.atwiki.jp/keio_unyo/pages/105.html
-- Holiday: https://w.atwiki.jp/keio_unyo/pages/108.html
-- Original manual owner: data/timetables/KeioSagami-manual.js.
-- Its source_revision_date=NULL: NOT a 2026-11-18 service or formation proof.
-- Never infer between 7732 and 7736; never promote to automatic PNG.
-- All original source, date, fleet, train type, line, and PNG uniqueness guards remain.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/京王電鉄/京王電鉄_5000系.png'
    AND operator='Keio' AND vehicle_type='5000系'
    AND asset_status='available' AND file_format_status='native_png'
    AND asset_scope='generic' AND is_generic=TRUE
    AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private16: Keio 5000 generic PNG not eligible'; END IF;
 IF (SELECT COUNT(DISTINCT train_number) FROM public.manual_timetable_templates
    WHERE line_key='KeioSagami' AND train_number IN ('7732','7736')
     AND train_type_urn='odpt.TrainType:Keio.KeioLiner'
     AND vehicle_type_label='5000系'
     AND source_path='data/timetables/KeioSagami-manual.js') <> 2
 THEN RAISE EXCEPTION 'Private16: original source numbers absent'; END IF;
 IF EXISTS (
    WITH proposed(n) AS (VALUES (7732),(7736))
    SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
       ON r.edition='2611' AND r.line_key='KeioSagami'
        AND r.suffix='' AND p.n BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private16: KeioSagami collision'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','KeioSagami','png_band/KeioSagami/7732-7732',
  7732,7732,'',NULL,'../images/列车/京王電鉄/京王電鉄_5000系.png',NULL,FALSE,FALSE),
 ('2611','KeioSagami','png_band/KeioSagami/7736-7736',
  7736,7736,'',NULL,'../images/列车/京王電鉄/京王電鉄_5000系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='KeioSagami'
    AND png_reference='../images/列车/京王電鉄/京王電鉄_5000系.png'
    AND segment_key IN ('png_band/KeioSagami/7732-7732','png_band/KeioSagami/7736-7736')
    AND suffix='' AND min_number=max_number AND min_number IN (7732,7736)
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>2
 THEN RAISE EXCEPTION 'Private16: two singleton refs absent'; END IF;
END;
$verify$;
COMMIT;
