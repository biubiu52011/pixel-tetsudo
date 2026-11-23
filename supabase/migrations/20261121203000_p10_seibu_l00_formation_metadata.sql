-- P-10: verify the two protected L00 assets without treating formation
-- identities as public train numbers. Production gained later visual review
-- baselines after this file was drafted; runtime matching separately keeps
-- both PNGs out of generic train-number selection.
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicle_image_assets a
    JOIN public.vehicle_image_review_baselines b ON b.asset_id=a.id
    WHERE a.operator='Seibu'
      AND a.image_path='images/列车/西武鉄道/西武鉄道_L00系_れおけい.png'
      AND a.vehicle_type='L00系' AND a.asset_status='available'
      AND a.asset_scope='generic' AND a.is_generic=TRUE
      AND b.metadata_lock_eligible=TRUE
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.vehicle_image_assets a
    JOIN public.vehicle_image_review_baselines b ON b.asset_id=a.id
    WHERE a.operator='Seibu'
      AND a.image_path='images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png'
      AND a.vehicle_type='L00系' AND a.formation_id='第1編成'
      AND a.asset_status='available' AND a.asset_scope='formation'
      AND a.is_generic=FALSE AND b.metadata_lock_eligible=TRUE
      AND a.review_note LIKE '%ライブ列車への自動割当は不可%'
  ) THEN
    RAISE EXCEPTION 'P-10: protected L00 production identities do not match the reviewed state';
  END IF;
END;
$p10$;

COMMIT;
