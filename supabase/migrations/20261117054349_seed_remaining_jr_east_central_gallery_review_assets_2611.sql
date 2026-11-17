-- Complete JR-East / JR-Central gallery asset inventory without inferring train numbers.
-- 13 JR-East + 7 JR-Central PNGs already exist in the GitHub main gallery.
-- Three JR-East images have prior guarded number references but no asset row;
-- retain those source guards and never treat this review metadata as authorization.
-- Opaque legacy filenames use '未判定' rather than fabricated vehicle identities.
DO $jr_remaining_gallery$
DECLARE
  review_rows integer;
BEGIN
  LOCK TABLE public.vehicle_image_assets IN SHARE ROW EXCLUSIVE MODE;
  PERFORM setval('public.vehicle_image_assets_id_seq'::regclass,
    GREATEST(COALESCE((SELECT MAX(id) FROM public.vehicle_image_assets),1),
             (SELECT last_value FROM public.vehicle_image_assets_id_seq)),true);
  INSERT INTO public.vehicle_image_assets
    (id,operator,vehicle_type,image_path,is_generic,asset_status,asset_scope,
     appearance_class,file_format_status,review_note)
  SELECT nextval('public.vehicle_image_assets_id_seq'::regclass),
    source.operator,source.vehicle_type,source.image_path,FALSE,
    'review','review','requires_review',NULL,
    'Inventory only: PNG file exists in GitHub main; model label from filename, ' ||
    'or 未判定 for opaque names. Byte format, in-service eligibility, formation, ' ||
    'livery and unique numbered-train identity are unverified. Existing guarded ' ||
    'number references do not make this asset available; do not auto-promote.'
  FROM (VALUES
    ('images/列车/JR東日本/JR東日本_205系_1100番台_鶴見線.png','205系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_3000番台.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_3100番台.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_719系_5000番台.png','719系','JR-East'),
    ('images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png','DE10形','JR-East'),
    ('images/列车/JR東日本/JR東日本_E127系_100番台_長野色_幌付.png','E127系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_3000番台.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_900番台_武藏野線.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png','E233系','JR-East'),
    ('images/列车/JR東日本/JR東日本_HB-E220系_八高線.png','HB-E220系','JR-East'),
    ('images/列车/JR東日本/e211na1n.png','未判定','JR-East'),
    ('images/列车/JR東海/c11nsk.png','未判定','JR-Central'),
    ('images/列车/JR東海/c25-1.png','未判定','JR-Central'),
    ('images/列车/JR東海/c313ce.png','未判定','JR-Central'),
    ('images/列车/JR東海/c35.png','未判定','JR-Central'),
    ('images/列车/JR東海/c385.png','未判定','JR-Central'),
    ('images/列车/JR東海/c75.png','未判定','JR-Central'),
    ('images/列车/JR東海/c85h.png','未判定','JR-Central')
  ) AS source(image_path,vehicle_type,operator)
  WHERE NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets a
                   WHERE a.image_path=source.image_path)
  ON CONFLICT(image_path) DO NOTHING;
  SELECT COUNT(*) INTO review_rows FROM public.vehicle_image_assets a
  WHERE a.image_path IN(SELECT source.image_path FROM (VALUES
    ('images/列车/JR東日本/JR東日本_205系_1100番台_鶴見線.png','205系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_3000番台.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_3100番台.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png','209系','JR-East'),
    ('images/列车/JR東日本/JR東日本_719系_5000番台.png','719系','JR-East'),
    ('images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png','DE10形','JR-East'),
    ('images/列车/JR東日本/JR東日本_E127系_100番台_長野色_幌付.png','E127系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_3000番台.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E231系_900番台_武藏野線.png','E231系','JR-East'),
    ('images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png','E233系','JR-East'),
    ('images/列车/JR東日本/JR東日本_HB-E220系_八高線.png','HB-E220系','JR-East'),
    ('images/列车/JR東日本/e211na1n.png','未判定','JR-East'),
    ('images/列车/JR東海/c11nsk.png','未判定','JR-Central'),
    ('images/列车/JR東海/c25-1.png','未判定','JR-Central'),
    ('images/列车/JR東海/c313ce.png','未判定','JR-Central'),
    ('images/列车/JR東海/c35.png','未判定','JR-Central'),
    ('images/列车/JR東海/c385.png','未判定','JR-Central'),
    ('images/列车/JR東海/c75.png','未判定','JR-Central'),
    ('images/列车/JR東海/c85h.png','未判定','JR-Central')
  ) AS source(image_path,vehicle_type,operator))
    AND a.asset_status='review'
    AND a.asset_scope='review'
    AND a.appearance_class='requires_review'
    AND a.file_format_status IS NULL
    AND a.is_generic=FALSE;
  IF review_rows<>20 THEN
    RAISE EXCEPTION 'Remaining JR gallery review registry mismatch: % of 20',review_rows;
  END IF;
END
$jr_remaining_gallery$;
