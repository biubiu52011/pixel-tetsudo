-- JR-06: verified image-file bytes ONLY, no train-number or vehicle approval.
-- Each of the 15 source files was fetched from GitHub main and validated as
-- 82x98 PNG by signature, IHDR, per-chunk CRC, IEND and image decoding.
-- Keep asset_status=review, asset_scope=review, appearance_class=requires_review.
-- Do not assign any train number or change runtime PNG selection.
BEGIN;
DO $check_before$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.vehicle_image_assets
  WHERE image_path IN (
  'images/列车/JR西日本/JR西日本_223系_H2.png',
  'images/列车/JR西日本/JR西日本_223系_H6.png',
  'images/列车/JR西日本/JR西日本_223系_KAH.png',
  'images/列车/JR西日本/JR西日本_223系_KIL.png',
  'images/列车/JR西日本/JR西日本_223系_MORI.png',
  'images/列车/JR西日本/JR西日本_225系_V1.png',
  'images/列车/JR西日本/JR西日本_225系.png',
  'images/列车/JR西日本/JR西日本_227系_WK.png',
  'images/列车/JR西日本/JR西日本_271系.png',
  'images/列车/JR西日本/JR西日本_281系.png',
  'images/列车/JR西日本/JR西日本_283系_K.png',
  'images/列车/JR西日本/JR西日本_287系_K.png',
  'images/列车/JR西日本/JR西日本_287系_KRM.png',
  'images/列车/JR西日本/JR西日本_287系_SKR.png',
  'images/列车/JR西日本/JR西日本_287系_V1.png'
  ) AND operator='JR-West' AND asset_status='review'
    AND asset_scope='review' AND appearance_class='requires_review'
    AND file_format_status IS NULL
    AND review_note LIKE 'Inventory only:%';
  IF n<>15 THEN
    RAISE EXCEPTION 'JR06 expected 15 review-only, unknown-format PNG assets; got %', n;
  END IF;
END
$check_before$;
UPDATE public.vehicle_image_assets
SET file_format_status='native_png',
    review_note='JR-06 2026-11-19: source PNG is 82x98; PNG signature, chunk CRCs, IEND and decoded image validated against GitHub main. Vehicle/livery/formation, service date and unique train-number identity remain unverified. Keep review; never auto-select.'
WHERE image_path IN (
  'images/列车/JR西日本/JR西日本_223系_H2.png',
  'images/列车/JR西日本/JR西日本_223系_H6.png',
  'images/列车/JR西日本/JR西日本_223系_KAH.png',
  'images/列车/JR西日本/JR西日本_223系_KIL.png',
  'images/列车/JR西日本/JR西日本_223系_MORI.png',
  'images/列车/JR西日本/JR西日本_225系_V1.png',
  'images/列车/JR西日本/JR西日本_225系.png',
  'images/列车/JR西日本/JR西日本_227系_WK.png',
  'images/列车/JR西日本/JR西日本_271系.png',
  'images/列车/JR西日本/JR西日本_281系.png',
  'images/列车/JR西日本/JR西日本_283系_K.png',
  'images/列车/JR西日本/JR西日本_287系_K.png',
  'images/列车/JR西日本/JR西日本_287系_KRM.png',
  'images/列车/JR西日本/JR西日本_287系_SKR.png',
  'images/列车/JR西日本/JR西日本_287系_V1.png'
) AND operator='JR-West' AND asset_status='review'
  AND asset_scope='review' AND appearance_class='requires_review'
  AND file_format_status IS NULL;
DO $check_after$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.vehicle_image_assets
  WHERE image_path IN (
  'images/列车/JR西日本/JR西日本_223系_H2.png',
  'images/列车/JR西日本/JR西日本_223系_H6.png',
  'images/列车/JR西日本/JR西日本_223系_KAH.png',
  'images/列车/JR西日本/JR西日本_223系_KIL.png',
  'images/列车/JR西日本/JR西日本_223系_MORI.png',
  'images/列车/JR西日本/JR西日本_225系_V1.png',
  'images/列车/JR西日本/JR西日本_225系.png',
  'images/列车/JR西日本/JR西日本_227系_WK.png',
  'images/列车/JR西日本/JR西日本_271系.png',
  'images/列车/JR西日本/JR西日本_281系.png',
  'images/列车/JR西日本/JR西日本_283系_K.png',
  'images/列车/JR西日本/JR西日本_287系_K.png',
  'images/列车/JR西日本/JR西日本_287系_KRM.png',
  'images/列车/JR西日本/JR西日本_287系_SKR.png',
  'images/列车/JR西日本/JR西日本_287系_V1.png'
  ) AND operator='JR-West' AND asset_status='review'
    AND asset_scope='review' AND appearance_class='requires_review'
    AND file_format_status='native_png'
    AND review_note='JR-06 2026-11-19: source PNG is 82x98; PNG signature, chunk CRCs, IEND and decoded image validated against GitHub main. Vehicle/livery/formation, service date and unique train-number identity remain unverified. Keep review; never auto-select.';
  IF n<>15 THEN RAISE EXCEPTION 'JR06 expected exactly 15 byte-verified review assets; got %', n; END IF;
END
$check_after$;
COMMIT;
