-- 2026-11-09: align JR-West 207 / 321 existing PNGs with SQL inventory.
-- No train/date/formation claim is made; NK and Y2 are gallery variants only.
-- Generic 207 has no PNG: it must never resolve to a guessed NK/Y2 artwork.
DO $jrwest_gallery$
DECLARE a record;
BEGIN
  LOCK TABLE public.vehicle_image_assets IN SHARE ROW EXCLUSIVE MODE;
  PERFORM setval('public.vehicle_image_assets_id_seq'::regclass,
    GREATEST(COALESCE((SELECT max(id) FROM public.vehicle_image_assets),1),
             (SELECT last_value FROM public.vehicle_image_assets_id_seq)),true);
  FOR a IN SELECT * FROM (VALUES
    ('207系','NK','images/列车/JR西日本/JR西日本_207系_NK.png',false,'subseries','NK'),
    ('207系','Y2','images/列车/JR西日本/JR西日本_207系_Y2.png',false,'subseries','Y2'),
    ('321系','','images/列车/JR西日本/JR西日本_321系.png',true,'generic',NULL)
  ) AS rows(vehicle_type,variant_label,image_path,is_generic,asset_scope,subseries)
  LOOP
    INSERT INTO public.vehicle_image_assets
      (id,operator,vehicle_type,image_path,is_generic,asset_scope,subseries,
       asset_status,appearance_class,file_format_status,service_context,review_note)
    SELECT nextval('public.vehicle_image_assets_id_seq'::regclass),
      'JR-West',a.vehicle_type,a.image_path,a.is_generic,a.asset_scope,
      a.subseries,'available','standard_or_fixed_livery','native_png',
      'TokaidoKansai|Fukuchiyama|Gakkentoshi|JRTozai|OsakaHigashi',
      'Canonical gallery illustration only; not proof of dated train or formation.'
    WHERE NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets x
      WHERE x.image_path=a.image_path)
    ON CONFLICT(image_path) DO NOTHING;
    IF (SELECT count(*) FROM public.vehicle_image_assets x
       WHERE x.image_path=a.image_path AND x.operator='JR-West'
         AND x.vehicle_type=a.vehicle_type AND x.is_generic=a.is_generic
         AND x.asset_scope=a.asset_scope
         AND x.subseries IS NOT DISTINCT FROM a.subseries
         AND x.asset_status='available'
         AND x.file_format_status='native_png')<>1 THEN
      RAISE EXCEPTION 'JR-West gallery inventory mismatch: %',a.image_path;
    END IF;
  END LOOP;
END
$jrwest_gallery$;
