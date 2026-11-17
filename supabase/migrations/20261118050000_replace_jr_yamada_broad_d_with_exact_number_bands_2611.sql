-- JR31 | Yamada line KiHa110 family: tighten a speculative 0631-9642D PNG envelope.
-- 19 distinct 2026-11 original published D numbers -> 12 gap-free numeric islands.
-- Keeps the existing JS Local, JR-East, line, date and model-label guards.
-- This is a PNG illustration reference, NOT evidence of an actual trainset.
BEGIN;
DO $yamada_png_preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系.png'
  AND asset_status='available' AND file_format_status='native_png'
 ) THEN RAISE EXCEPTION 'Yamada original PNG asset not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Yamada'
  AND segment_key='png_band/Yamada/0631-9642D'
  AND min_number=631 AND max_number=9642 AND suffix='D'
  AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png'
  AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Yamada original broad PNG reference changed'; END IF;
 IF EXISTS (
  WITH proposed(min_number,max_number) AS (VALUES
    (631,632),
    (641,641),
    (644,644),
    (646,646),
    (2632,2636),
    (2638,2639),
    (2641,2641),
    (9631,9631),
    (9633,9633),
    (9636,9637),
    (9639,9639),
    (9642,9642)
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges other
  ON other.edition='2611' AND other.line_key='Yamada'
  AND other.segment_key LIKE 'png_band/%' AND other.suffix='D'
  AND p.min_number<=other.max_number AND p.max_number>=other.min_number
  AND other.png_reference<>'../images/列车/JR東日本/JR東日本_キハ110系.png'
 ) THEN RAISE EXCEPTION 'Yamada proposed D intervals collide with another PNG'; END IF;
END;
$yamada_png_preflight$;
DELETE FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Yamada'
 AND segment_key='png_band/Yamada/0631-9642D'
 AND min_number=631 AND max_number=9642 AND suffix='D'
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Yamada','png_band/Yamada/0631-0632D',631,632,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/0641-0641D',641,641,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/0644-0644D',644,644,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/0646-0646D',646,646,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/2632-2636D',2632,2636,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/2638-2639D',2638,2639,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/2641-2641D',2641,2641,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/9631-9631D',9631,9631,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/9633-9633D',9633,9633,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/9636-9637D',9636,9637,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/9639-9639D',9639,9639,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/9642-9642D',9642,9642,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $yamada_png_verify$
DECLARE n_bands integer; n_numbers integer;
BEGIN
 SELECT count(*),coalesce(sum(max_number-min_number+1),0) INTO n_bands,n_numbers
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Yamada'
 AND segment_key LIKE 'png_band/Yamada/%' AND suffix='D'
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL
 AND source_url IS NULL AND requires_exact_roster=FALSE
 AND actual_vehicle_confirmed=FALSE;
 IF n_bands<>12 OR n_numbers<>19
 THEN RAISE EXCEPTION 'Yamada expected 12 bands and 19 numbers; got %/%',n_bands,n_numbers; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Yamada' AND segment_key='png_band/Yamada/0631-9642D'
 ) THEN RAISE EXCEPTION 'Yamada invalid broad range still present'; END IF;
END;
$yamada_png_verify$;
COMMIT;
