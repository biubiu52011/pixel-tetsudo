-- P-10: split the two L00 review PNGs into their official formation-specific
-- identities. Neither formation identity is a public train number, so this
-- migration deliberately adds no train-number -> PNG range.
--
-- Official evidence:
-- * 2026-03-27: first formation entered service in the Seibu Lions design.
--   https://www.seiburailway.jp/newsroom/news/20260327_LEOLINER/
-- * 2026-03-05: the navy Seibuen-amusement-park design was announced for the
--   second formation planned in FY2026.
--   https://www.seiburailway.jp/newsroom/news/20260305_LEOLINER/

BEGIN;

DO $p10$
BEGIN
  IF (SELECT COUNT(*) FROM public.vehicle_image_assets
      WHERE image_path IN (
        'images/列车/西武鉄道/西武鉄道_L00系_れおけい.png',
        'images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png'
      ) AND operator='Seibu') <> 2 THEN
    RAISE EXCEPTION 'P-10: expected two exact Seibu L00 review assets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges
    WHERE regexp_replace(png_reference, '^\.\./', '') IN (
      'images/列车/西武鉄道/西武鉄道_L00系_れおけい.png',
      'images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png'
    )
  ) THEN
    RAISE EXCEPTION 'P-10: formation artwork unexpectedly has a published number range';
  END IF;

  UPDATE public.vehicle_image_assets
  SET vehicle_type='L00系（第2編成・西武園ゆうえんちデザイン）',
      asset_status='review',
      asset_scope='review',
      is_generic=FALSE,
      appearance_class='requires_review',
      review_note='P-10: official 2026-03-05 release identifies the navy artwork as the FY2026 second-formation Seibuen-amusement-park design. It is not generic L00 artwork and is not a train-number mapping.'
  WHERE operator='Seibu'
    AND image_path='images/列车/西武鉄道/西武鉄道_L00系_れおけい.png';

  UPDATE public.vehicle_image_assets
  SET vehicle_type='L00系（第1編成・埼玉西武ライオンズ）',
      asset_status='review',
      asset_scope='review',
      is_generic=FALSE,
      appearance_class='requires_review',
      review_note='P-10: official 2026-03-27 release identifies this as the first-formation Seibu Lions design. Formation ordinal is not a public train number.'
  WHERE operator='Seibu'
    AND image_path='images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png';

  IF (SELECT COUNT(*) FROM public.vehicle_image_assets
      WHERE image_path IN (
        'images/列车/西武鉄道/西武鉄道_L00系_れおけい.png',
        'images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png'
      ) AND operator='Seibu' AND asset_status='review'
        AND asset_scope='review' AND is_generic=FALSE
        AND appearance_class='requires_review') <> 2 THEN
    RAISE EXCEPTION 'P-10: L00 formation review boundary was not preserved';
  END IF;
END;
$p10$;

COMMIT;
