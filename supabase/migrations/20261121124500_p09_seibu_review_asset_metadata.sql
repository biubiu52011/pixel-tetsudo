-- P-09: correct two review-only Seibu artwork identities without adding any
-- train-number -> PNG range. The legacy filenames remain stable because they
-- are already part of the 601-PNG inventory.
--
-- Official evidence:
-- * Tokiiro is a new, not-yet-series-numbered vehicle planned for spring 2027;
--   it replaces 10000-series service and is not a 40000-series variant.
--   https://www.seiburailway.jp/newsroom/news/20260219_TOKIIRO/
-- * Seibu's official "yellow x beige" two-tone design-train page identifies
--   that livery as 101 series. It does not validate this legacy 2000-series
--   filename, so the PNG must remain review-only.
--   https://www.seiburailway.jp/railway/encyclopedia/designtrain/

BEGIN;

DO $p09$
BEGIN
  IF (SELECT COUNT(*) FROM public.vehicle_image_assets
      WHERE image_path IN (
        'images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png',
        'images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png'
      ) AND operator='Seibu') <> 2 THEN
    RAISE EXCEPTION 'P-09: expected two exact Seibu review assets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges
    WHERE regexp_replace(png_reference, '^\.\./', '') IN (
      'images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png',
      'images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png'
    )
  ) THEN
    RAISE EXCEPTION 'P-09: review artwork unexpectedly has a published number range';
  END IF;

  UPDATE public.vehicle_image_assets
  SET asset_status='review',
      asset_scope='review',
      is_generic=FALSE,
      appearance_class='requires_review',
      review_note='P-09: official Seibu design-train page assigns the yellow/beige two-tone livery to 101 series; legacy 2000-series filename remains quarantined pending source verification.'
  WHERE operator='Seibu'
    AND image_path='images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png';

  UPDATE public.vehicle_image_assets
  SET vehicle_type='トキイロ（形式未公表）',
      asset_status='review',
      asset_scope='review',
      is_generic=FALSE,
      appearance_class='requires_review',
      review_note='P-09: official 2026-02-19 release defines Tokiiro as a new spring-2027 vehicle replacing 10000-series service, not a 40000-series variant. Legacy filename retained for inventory stability.'
  WHERE operator='Seibu'
    AND image_path='images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png';

  IF (SELECT COUNT(*) FROM public.vehicle_image_assets
      WHERE image_path IN (
        'images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png',
        'images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png'
      ) AND operator='Seibu' AND asset_status='review'
        AND asset_scope='review' AND is_generic=FALSE
        AND appearance_class='requires_review') <> 2 THEN
    RAISE EXCEPTION 'P-09: review quarantine was not preserved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE operator='Seibu'
      AND image_path='images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png'
      AND vehicle_type='トキイロ（形式未公表）'
  ) THEN
    RAISE EXCEPTION 'P-09: Tokiiro metadata correction did not persist';
  END IF;
END;
$p09$;

COMMIT;
