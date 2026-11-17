-- Private railway gallery-only inventory: 24 physically present PNG paths.
-- Generated against the existing single-gallery 601-PNG inventory, 2026-11-17.
-- The 24 paths are present on GitHub main, but native PNG bytes, service
-- eligibility, livery, formation, actual train and train-number ownership
-- have NOT been verified. Register review-only, never autorender or attach
-- a train-number band. No new table is introduced.
-- Grouped by original directory: Izukyu 2, Fujisanroku 18, Tokyu 3, Tobu 1.
DO $private_gallery_review_24$
DECLARE n integer;
BEGIN
  LOCK TABLE public.vehicle_image_assets IN SHARE ROW EXCLUSIVE MODE;
  PERFORM setval('public.vehicle_image_assets_id_seq'::regclass,
    GREATEST(COALESCE((SELECT MAX(id) FROM public.vehicle_image_assets),1),
             (SELECT last_value FROM public.vehicle_image_assets_id_seq)),true);
  INSERT INTO public.vehicle_image_assets
    (id,operator,vehicle_type,image_path,is_generic,asset_status,
     asset_scope,appearance_class,file_format_status,review_note)
  SELECT nextval('public.vehicle_image_assets_id_seq'::regclass),
    src.operator,src.vehicle_type,src.image_path,FALSE,
    'review','review','requires_review',NULL,
    'Gallery inventory only: exact file path present in GitHub main; model is ' ||
    'filename-derived metadata. Do not infer native PNG bytes, in-service ' ||
    'eligibility, formation, livery or unique train-number assignment. ' ||
    'No automatic promotion, service binding or render entitlement.'
  FROM (VALUES
    ('images/列车/伊豆急行/伊豆急行_3000系.png','3000系','Izukyu'),
    ('images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png','8000系','Izukyu'),
    ('images/列车/富士急行/富士急行_1000系_富士登山電車_別面.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_富士登山電車.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_旧塗装_水色.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_赤白塗装.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_青色.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_非パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_非パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_5000形_トーマスランド号.png','5000形','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_5000形_標準色.png','5000形','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_マッターホルン号.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_リサとガスパールトレイン.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_紫色ラッピング.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_赤色塗装.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8000系_フジサン特急_顔B.png','8000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8500系_富士山ビュー特急_茶色.png','8500系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8500系_富士山ビュー特急_赤色.png','8500系','FujisanrokuElectricRailway'),
    ('images/列车/東急電鉄/東急電鉄_6000系.png','6000系','Tokyu'),
    ('images/列车/東急電鉄/東急電鉄_6020系_追加.png','6020系','Tokyu'),
    ('images/列车/東急電鉄/東急電鉄_9000系.png','9000系','Tokyu'),
    ('images/列车/東武鉄道/東武鉄道_8000型_標準塗装.png','8000型','Tobu')
  ) AS src(image_path,vehicle_type,operator)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets a
    WHERE a.image_path=src.image_path
  )
  ON CONFLICT (image_path) DO NOTHING;

  SELECT COUNT(*) INTO n FROM public.vehicle_image_assets a
  WHERE a.image_path IN (
    SELECT src.image_path FROM (VALUES
    ('images/列车/伊豆急行/伊豆急行_3000系.png','3000系','Izukyu'),
    ('images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png','8000系','Izukyu'),
    ('images/列车/富士急行/富士急行_1000系_富士登山電車_別面.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_富士登山電車.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_旧塗装_水色.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_赤白塗装.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_1000系_青色.png','1000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔A_非パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_2000系_フジサン特急_顔B_非パノラマ車.png','2000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_5000形_トーマスランド号.png','5000形','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_5000形_標準色.png','5000形','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_マッターホルン号.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_リサとガスパールトレイン.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_紫色ラッピング.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_6000系_赤色塗装.png','6000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8000系_フジサン特急_顔B.png','8000系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8500系_富士山ビュー特急_茶色.png','8500系','FujisanrokuElectricRailway'),
    ('images/列车/富士急行/富士急行_8500系_富士山ビュー特急_赤色.png','8500系','FujisanrokuElectricRailway'),
    ('images/列车/東急電鉄/東急電鉄_6000系.png','6000系','Tokyu'),
    ('images/列车/東急電鉄/東急電鉄_6020系_追加.png','6020系','Tokyu'),
    ('images/列车/東急電鉄/東急電鉄_9000系.png','9000系','Tokyu'),
    ('images/列车/東武鉄道/東武鉄道_8000型_標準塗装.png','8000型','Tobu')
  ) AS src(image_path,vehicle_type,operator)
  )
    AND a.asset_status='review' AND a.asset_scope='review'
    AND a.appearance_class='requires_review'
    AND a.file_format_status IS NULL AND a.is_generic=FALSE;
  IF n<>24 THEN
    RAISE EXCEPTION 'Private gallery review-only registry incorrect: %/24',n;
  END IF;
END
$private_gallery_review_24$;
