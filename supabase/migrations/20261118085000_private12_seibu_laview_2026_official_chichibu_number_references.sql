-- Private12: official public CHICHIBU service numbers, Seibu 001 Laview.
-- Primary official 2025-03-15 train timetable still linked from Seibu Laview page:
-- https://www.seiburailway.jp/railway/reservedtrain/file/20250315_tokkyuujikoku__ikebukurosen_1.pdf
-- Seibu's 2026-06-17 official news explicitly names eight "chichibu N-go"
-- services on the Ikebukuro--SeibuChichibu corridor (July/August stops):
-- https://www.seiburailway.jp/file.jsp?newsroom%2Fnews%2Ffile%2F20260617_ashigakuboyokoze.pdf=
-- The official Laview owner declares Chichibu/Musashi/Dome trains use 001.
-- https://www.seiburailway.jp/railway/reservedtrain/laview/
-- The source contains PUBLIC EXPRESS SERVICE NUMBERS (names, N-go),
-- not a certified operator operational train number or carset identity.
-- Database '2611' is an edition-scoped advisory PNG numeric reference only.
-- We do NOT claim this verifies November 2026 daily timetable revision or
-- any concrete 2026-11 operating date. The original manual/SQL Seibu runs
-- include internal SII*/SBC* identifiers, NEVER convert those into numbers.
-- Existing source-owned trainNumber & serviceDate matching remains final.
-- No runtime selection rule is changed, and review-only image stays blocked.
-- Source exact PUBLIC numbers, not inferred even/odd slots: 0005, 0007, 0009, 0011, 0032, 0034, 0036, 0040
BEGIN;
DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/西武鉄道/西武鉄道_001系_Laview.png' AND operator='Seibu'
      AND vehicle_type='001系' AND asset_status='available'
      AND asset_scope='review' AND is_generic=FALSE
      AND file_format_status='native_png'
      AND formation_id IS NULL AND car_id IS NULL
  ) THEN RAISE EXCEPTION 'Private12: Seibu 001 image changed or no longer review-only'; END IF;

  IF EXISTS (
    WITH requested(min_number,max_number) AS (
      VALUES (5,5), (7,7), (9,9), (11,11), (32,32), (34,34), (36,36), (40,40)
    ) SELECT 1 FROM requested p JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key='SeibuChichibu' AND r.suffix=''
      AND p.min_number<=r.max_number AND r.min_number<=p.max_number
  ) THEN RAISE EXCEPTION 'Private12: service-number conflict on SeibuChichibu'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0005-0005',5,5,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0007-0007',7,7,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0009-0009',9,9,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0011-0011',11,11,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0032-0032',32,32,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0034-0034',34,34,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0036-0036',36,36,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE),
 ('2611','SeibuChichibu','png_band/SeibuChichibu/0040-0040',40,40,'',NULL,'../images/列车/西武鉄道/西武鉄道_001系_Laview.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='SeibuChichibu'
      AND png_reference='../images/列车/西武鉄道/西武鉄道_001系_Laview.png' AND segment_key LIKE 'png_band/SeibuChichibu/%'
      AND suffix='' AND min_number=max_number
      AND vehicle_model IS NULL AND source_url IS NULL
      AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
  ) <> 8 THEN RAISE EXCEPTION 'Private12: eight singleton references not persisted'; END IF;
END;
$verify$;
COMMIT;
