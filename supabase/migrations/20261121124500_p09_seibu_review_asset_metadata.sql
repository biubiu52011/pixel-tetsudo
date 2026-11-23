-- P-09: reconcile two Seibu artwork identities without adding any
-- train-number -> PNG range. Production gained later evidence and protected
-- review baselines after this file was drafted, so this migration verifies
-- those newer identities instead of overwriting them.
--
-- Official evidence:
-- * Tokiiro is planned for spring 2027. Production metadata now contains
--   later 2026 evidence about the delivered vehicle, so this migration must
--   preserve its newer vehicle_type and review_note instead of restoring the
--   February provisional "series unknown" conclusion.
--   https://www.seiburailway.jp/newsroom/news/20260805_TOKIIROexpress/
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicle_image_assets a
    JOIN public.vehicle_image_review_baselines b ON b.asset_id=a.id
    WHERE a.operator='Seibu'
      AND a.image_path='images/列车/西武鉄道/西武鉄道_2000系_ツートンカラー.png'
      AND a.asset_status='available' AND a.asset_scope='review'
      AND a.is_generic=FALSE AND b.metadata_lock_eligible=TRUE
  ) OR NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE operator='Seibu'
      AND image_path='images/列车/西武鉄道/西武鉄道_40000系_トキイロ.png'
      AND asset_status='review' AND asset_scope='formation'
      AND is_generic=FALSE AND formation_id='48101F'
      AND review_note LIKE '%20260805_TOKIIROexpress%'
  ) THEN
    RAISE EXCEPTION 'P-09: protected production identities do not match the reviewed state';
  END IF;
END;
$p09$;

COMMIT;
