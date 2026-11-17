-- Other railway category, first pass: existing 17 Hakodate tram gallery PNGs.
-- The paths are present in the single 601-PNG audit and in GitHub main.
-- This is asset inventory only, not train-number bands or render permission.
-- The operator is the existing gallery directory label; vehicle types are
-- filename-derived (toq9002or.png deliberately remains 未判定).
-- All 17 assets MUST remain review-only until verified by their original owner.
DO $hakodate_gallery_review_17$
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
    'Gallery inventory only: name and operator are filename/directory-derived. ' ||
    'No train-number ownership, date eligibility, formation identity, exact ' ||
    'appearance, file format verification or automatic display entitlement.'
  FROM (VALUES
    ('images/列车/函館市電/toq9002or.png','未判定','函館市電'),
    ('images/列车/函館市電/函館市電_3000形.png','3000形','函館市電'),
    ('images/列车/函館市電/函館市電_3000形_3001号車.png','3000形','函館市電'),
    ('images/列车/函館市電/函館市電_3000形_3002号車.png','3000形','函館市電'),
    ('images/列车/函館市電/函館市電_30形_39号車.png','30形','函館市電'),
    ('images/列车/函館市電/函館市電_500形.png','500形','函館市電'),
    ('images/列车/函館市電/函館市電_7000形.png','7000形','函館市電'),
    ('images/列车/函館市電/函館市電_710形.png','710形','函館市電'),
    ('images/列车/函館市電/函館市電_710形_広告車.png','710形','函館市電'),
    ('images/列车/函館市電/函館市電_8000形.png','8000形','函館市電'),
    ('images/列车/函館市電/函館市電_8000形_広告車.png','8000形','函館市電'),
    ('images/列车/函館市電/函館市電_8100形.png','8100形','函館市電'),
    ('images/列车/函館市電/函館市電_8100形_広告車.png','8100形','函館市電'),
    ('images/列车/函館市電/函館市電_9600形.png','9600形','函館市電'),
    ('images/列车/函館市電/函館市電_9600形_9601号車.png','9600形','函館市電'),
    ('images/列车/函館市電/函館市電_9600形_9604号車.png','9600形','函館市電'),
    ('images/列车/函館市電/函館市電_9600形_広告車.png','9600形','函館市電')
  ) AS src(image_path,vehicle_type,operator)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets a WHERE a.image_path=src.image_path
  )
  ON CONFLICT (image_path) DO NOTHING;

  SELECT COUNT(*) INTO n FROM public.vehicle_image_assets a
  WHERE a.image_path LIKE 'images/列车/函館市電/%'
    AND a.asset_status='review' AND a.asset_scope='review'
    AND a.appearance_class='requires_review' AND a.file_format_status IS NULL
    AND a.is_generic=FALSE AND a.operator='函館市電';
  IF n<>17 THEN
    RAISE EXCEPTION 'Hakodate tram gallery review-only registry incorrect: %/17',n;
  END IF;
END
$hakodate_gallery_review_17$;
