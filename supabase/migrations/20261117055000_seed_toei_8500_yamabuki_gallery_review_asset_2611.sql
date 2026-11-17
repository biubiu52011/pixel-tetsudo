-- Metro inventory follow-up: register the sole gallery PNG absent from
-- public.vehicle_image_assets; this is asset metadata only, NOT a number band.
-- Based on the 53 distinct metro-classified image paths in the one existing CSV:
-- Tokyo Metro 16, Toei directory 30, Yokohama Municipal 7.
-- 52 paths already have assets; the Toei 8501 image is the only missing path.
DO $metro_gallery_inventory$
DECLARE
  v_path text := 'images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png';
  v_matches integer;
BEGIN
  LOCK TABLE public.vehicle_image_assets IN SHARE ROW EXCLUSIVE MODE;

  PERFORM setval('public.vehicle_image_assets_id_seq'::regclass,
    GREATEST(
      COALESCE((SELECT MAX(id) FROM public.vehicle_image_assets), 1),
      (SELECT last_value FROM public.vehicle_image_assets_id_seq)
    ), true);

  INSERT INTO public.vehicle_image_assets
    (id, operator, vehicle_type, image_path, is_generic, asset_status,
     asset_scope, appearance_class, file_format_status, review_note)
  SELECT nextval('public.vehicle_image_assets_id_seq'::regclass),
    'Toei', '8500形', v_path, FALSE, 'review', 'review',
    'requires_review', NULL,
    'Gallery inventory only: 8501号車 山吹色 PNG exists in GitHub main. ' ||
    'Do not infer operating eligibility, specific carset, date, livery, ' ||
    'or a unique train-number-to-PNG mapping; no auto-promotion.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets WHERE image_path = v_path
  )
  ON CONFLICT (image_path) DO NOTHING;

  SELECT COUNT(*) INTO v_matches
  FROM public.vehicle_image_assets
  WHERE image_path = v_path
    AND asset_status = 'review'
    AND asset_scope = 'review'
    AND appearance_class = 'requires_review'
    AND is_generic = FALSE
    AND file_format_status IS NULL;

  IF v_matches <> 1 THEN
    RAISE EXCEPTION 'Toei 8500 Yamabuki asset inventory check failed: %', v_matches;
  END IF;
END
$metro_gallery_inventory$;
