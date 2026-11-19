-- JR-07: verify file bytes of 15 JR West assets, never map trains by filename.
-- 15/15 source PNGs checked from GitHub: correct 82x98 IHDR, chunk CRC, IEND.
-- Original number-to-PNG authoritative table deliberately unchanged.
-- KANI / KKANI source image may resemble 2024-25 crab wrap (official source:
-- https://www.westjr.co.jp/press/article/items/241028_00_press_matsubagani_wrappingtrain.pdf)
-- Historic wrap or carset alone cannot choose a numbered 2026 service.
BEGIN;
DO $verify_before$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM public.vehicle_image_assets
 WHERE operator='JR-West' AND image_path IN (
  'images/列车/JR西日本/JR西日本_287系.png',
  'images/列车/JR西日本/JR西日本_289系_G.png',
  'images/列车/JR西日本/JR西日本_289系_K_INS.png',
  'images/列车/JR西日本/JR西日本_289系_KANI.png',
  'images/列车/JR西日本/JR西日本_289系_KG.png',
  'images/列车/JR西日本/JR西日本_289系_KKANI.png',
  'images/列车/JR西日本/JR西日本_289系_MHR.png',
  'images/列车/JR西日本/JR西日本_289系_MHS.png',
  'images/列车/JR西日本/JR西日本_323系_M.png',
  'images/列车/JR西日本/JR西日本_323系_OR.png',
  'images/列车/JR西日本/JR西日本_681系_FT.png',
  'images/列车/JR西日本/JR西日本_683系_K.png',
  'images/列车/JR西日本/JR西日本_683系_K4.png',
  'images/列车/JR西日本/JR西日本_683系_N.png',
  'images/列车/JR西日本/JR西日本_683系_SRN.png'
 ) AND asset_status='review' AND asset_scope='review'
   AND appearance_class='requires_review' AND file_format_status IS NULL
   AND formation_id IS NULL AND review_note LIKE 'Inventory only:%';
 IF n<>15 THEN RAISE EXCEPTION 'JR-07 needs exactly 15 unverified review PNGs, found %',n; END IF;
END
$verify_before$;
UPDATE public.vehicle_image_assets
SET file_format_status='native_png',review_note='JR-07 2026-11-19: GitHub main source PNG 82x98 passed signature/IHDR/chunk CRC/IEND and visual decoding. Gallery-only review asset. This format proof does not establish era, model variant, livery, exact vehicle formation, run-day assignment, or train-number PNG authority. Remain review; neutral marker until independently verified.'
WHERE operator='JR-West' AND image_path IN (
  'images/列车/JR西日本/JR西日本_287系.png',
  'images/列车/JR西日本/JR西日本_289系_G.png',
  'images/列车/JR西日本/JR西日本_289系_K_INS.png',
  'images/列车/JR西日本/JR西日本_289系_KANI.png',
  'images/列车/JR西日本/JR西日本_289系_KG.png',
  'images/列车/JR西日本/JR西日本_289系_KKANI.png',
  'images/列车/JR西日本/JR西日本_289系_MHR.png',
  'images/列车/JR西日本/JR西日本_289系_MHS.png',
  'images/列车/JR西日本/JR西日本_323系_M.png',
  'images/列车/JR西日本/JR西日本_323系_OR.png',
  'images/列车/JR西日本/JR西日本_681系_FT.png',
  'images/列车/JR西日本/JR西日本_683系_K.png',
  'images/列车/JR西日本/JR西日本_683系_K4.png',
  'images/列车/JR西日本/JR西日本_683系_N.png',
  'images/列车/JR西日本/JR西日本_683系_SRN.png'
) AND asset_status='review' AND asset_scope='review'
  AND appearance_class='requires_review' AND file_format_status IS NULL;
DO $verify_after$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM public.vehicle_image_assets
 WHERE operator='JR-West' AND image_path IN (
  'images/列车/JR西日本/JR西日本_287系.png',
  'images/列车/JR西日本/JR西日本_289系_G.png',
  'images/列车/JR西日本/JR西日本_289系_K_INS.png',
  'images/列车/JR西日本/JR西日本_289系_KANI.png',
  'images/列车/JR西日本/JR西日本_289系_KG.png',
  'images/列车/JR西日本/JR西日本_289系_KKANI.png',
  'images/列车/JR西日本/JR西日本_289系_MHR.png',
  'images/列车/JR西日本/JR西日本_289系_MHS.png',
  'images/列车/JR西日本/JR西日本_323系_M.png',
  'images/列车/JR西日本/JR西日本_323系_OR.png',
  'images/列车/JR西日本/JR西日本_681系_FT.png',
  'images/列车/JR西日本/JR西日本_683系_K.png',
  'images/列车/JR西日本/JR西日本_683系_K4.png',
  'images/列车/JR西日本/JR西日本_683系_N.png',
  'images/列车/JR西日本/JR西日本_683系_SRN.png'
 ) AND asset_status='review' AND asset_scope='review' AND appearance_class='requires_review'
   AND file_format_status='native_png' AND formation_id IS NULL
   AND review_note LIKE 'JR-07 2026-11-19:%';
 IF n<>15 THEN RAISE EXCEPTION 'JR-07 review-only PNG update incomplete, found %',n; END IF;
END
$verify_after$;
COMMIT;
