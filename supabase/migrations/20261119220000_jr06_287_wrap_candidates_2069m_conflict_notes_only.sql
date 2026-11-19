-- JR-06 focused visual/source triage: two 287-series Kuroshio anniversary sprites.
-- These are possible appearance correspondences, NOT train-number or real-car validation.
-- Source (official JR West first wave extension): https://www.westjr.co.jp/press/article/2026/01/page_30035.html
-- Source (official JR West second wave): https://www.westjr.co.jp/press/article/items/250821_00_press_kuroshio60th.pdf
-- Historical field sightings on different dates for the SAME 2069M:
--   2026-08-22 HC603 and 2026-08-30 HC602: https://search.yahoo.co.jp/realtime/search?ei=UTF-8&p=287%E7%B3%BBhc&rkf=1
-- Therefore do NOT seed 2069M into either PNG as an unconditional static band.
-- Only update existing review_note; preserve exact NULL formation_id, NULL livery,
-- NULL theme, review asset_scope/status, PNG status, and number range table.
BEGIN;
DO $before$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.vehicle_image_assets
 WHERE operator='JR-West' AND image_path IN ('images/列车/JR西日本/JR西日本_287系_KRM.png','images/列车/JR西日本/JR西日本_287系_SKR.png')
   AND vehicle_type='287系' AND asset_status='review' AND asset_scope='review'
   AND appearance_class='requires_review' AND file_format_status='native_png'
   AND formation_id IS NULL AND livery IS NULL AND theme IS NULL
   AND review_note LIKE 'JR-06 2026-11-19: source PNG is 82x98%';
 IF n<>2 THEN RAISE EXCEPTION 'JR06 287 wrap review guard mismatch: %',n; END IF;
END
$before$;
UPDATE public.vehicle_image_assets SET review_note='JR-06 2026-11-19: native PNG 82x98 byte/CRC verified, remain review. Livery visual comparison is candidate only, not independently verified pixel-art provenance or train assignment. Historical 2069M was observed with HC603 on 2026-08-22 and HC602 on 2026-08-30. Static pure number alone cannot select uniquely; do not seed 2069M or auto-display. Appearance matches ocean-green 287 Kuroshio 60th second wrapping, actual HC603 candidate (operating 2025-08 to about 2028-11), not a confirmed formation-id mapping.'
WHERE operator='JR-West' AND image_path='images/列车/JR西日本/JR西日本_287系_KRM.png' AND asset_status='review' AND asset_scope='review';
UPDATE public.vehicle_image_assets SET review_note='JR-06 2026-11-19: native PNG 82x98 byte/CRC verified, remain review. Livery visual comparison is candidate only, not independently verified pixel-art provenance or train assignment. Historical 2069M was observed with HC603 on 2026-08-22 and HC602 on 2026-08-30. Static pure number alone cannot select uniquely; do not seed 2069M or auto-display. Appearance matches red 287 Kuroshio 60th first wrapping, actual HC602 candidate (2026 extension to about 2027-08), not a confirmed formation-id mapping.'
WHERE operator='JR-West' AND image_path='images/列车/JR西日本/JR西日本_287系_SKR.png' AND asset_status='review' AND asset_scope='review';
DO $after$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.vehicle_image_assets
 WHERE operator='JR-West' AND asset_status='review' AND asset_scope='review'
   AND appearance_class='requires_review' AND file_format_status='native_png'
   AND formation_id IS NULL AND livery IS NULL AND theme IS NULL
   AND ((image_path='images/列车/JR西日本/JR西日本_287系_KRM.png' AND review_note='JR-06 2026-11-19: native PNG 82x98 byte/CRC verified, remain review. Livery visual comparison is candidate only, not independently verified pixel-art provenance or train assignment. Historical 2069M was observed with HC603 on 2026-08-22 and HC602 on 2026-08-30. Static pure number alone cannot select uniquely; do not seed 2069M or auto-display. Appearance matches ocean-green 287 Kuroshio 60th second wrapping, actual HC603 candidate (operating 2025-08 to about 2028-11), not a confirmed formation-id mapping.') OR (image_path='images/列车/JR西日本/JR西日本_287系_SKR.png' AND review_note='JR-06 2026-11-19: native PNG 82x98 byte/CRC verified, remain review. Livery visual comparison is candidate only, not independently verified pixel-art provenance or train assignment. Historical 2069M was observed with HC603 on 2026-08-22 and HC602 on 2026-08-30. Static pure number alone cannot select uniquely; do not seed 2069M or auto-display. Appearance matches red 287 Kuroshio 60th first wrapping, actual HC602 candidate (2026 extension to about 2027-08), not a confirmed formation-id mapping.'));
 IF n<>2 THEN RAISE EXCEPTION 'JR06 287 wrap evidence write mismatch: %',n; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges
  WHERE png_reference IN ('../images/列车/JR西日本/JR西日本_287系_KRM.png','../images/列车/JR西日本/JR西日本_287系_SKR.png'))
 THEN RAISE EXCEPTION 'JR06 unexpected 287 commemorative train number binding'; END IF;
END
$after$;
COMMIT;
