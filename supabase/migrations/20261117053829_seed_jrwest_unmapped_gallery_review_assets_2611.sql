-- JR West PNG gallery registry: 62 existing files missing from vehicle_image_assets.
-- Filename-derived family labels are review metadata only, not vehicle identity
-- evidence. No numbered service, date, livery, physical formation or PNG
-- selection entitlement is conferred by these records.
-- Exact file names were verified present on GitHub main before this migration.
DO $jrwest_review_inventory$
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
    'JR-West', source.vehicle_type, source.image_path, FALSE,
    'review','review','requires_review',NULL,
    'Inventory only: exact file exists in GitHub main. Vehicle family from filename; ' ||
    'PNG byte validation, current-service eligibility, special livery and numbered ' ||
    'train identity remain unverified. Do not assign trains or promote automatically.'
  FROM (VALUES
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G1.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G2.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G3.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA.png','103系'),
    ('images/列车/JR西日本/JR西日本_113系_福知山線_FK053.png','113系'),
    ('images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png','117系'),
    ('images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png','120系'),
    ('images/列车/JR西日本/JR西日本_120系_関西地区_KAN.png','120系'),
    ('images/列车/JR西日本/JR西日本_122系.png','122系'),
    ('images/列车/JR西日本/JR西日本_187系.png','187系'),
    ('images/列车/JR西日本/JR西日本_205系_阪和線_HN2.png','205系'),
    ('images/列车/JR西日本/JR西日本_213系_W.png','213系'),
    ('images/列车/JR西日本/JR西日本_221系_CHA.png','221系'),
    ('images/列车/JR西日本/JR西日本_221系_N.png','221系'),
    ('images/列车/JR西日本/JR西日本_223系_5500番台.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_H2.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_H6.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_KAH.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_KIL.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_MORI.png','223系'),
    ('images/列车/JR西日本/JR西日本_225系.png','225系'),
    ('images/列车/JR西日本/JR西日本_225系_V1.png','225系'),
    ('images/列车/JR西日本/JR西日本_227系_WK.png','227系'),
    ('images/列车/JR西日本/JR西日本_271系.png','271系'),
    ('images/列车/JR西日本/JR西日本_273系.png','273系'),
    ('images/列车/JR西日本/JR西日本_281系.png','281系'),
    ('images/列车/JR西日本/JR西日本_283系.png','283系'),
    ('images/列车/JR西日本/JR西日本_283系_K.png','283系'),
    ('images/列车/JR西日本/JR西日本_287系.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_K.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_KRM.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_SKR.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_V1.png','287系'),
    ('images/列车/JR西日本/JR西日本_289系_G.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KANI.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KG.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KKANI.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_K_INS.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_MHR.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_MHS.png','289系'),
    ('images/列车/JR西日本/JR西日本_323系_M.png','323系'),
    ('images/列车/JR西日本/JR西日本_323系_OR.png','323系'),
    ('images/列车/JR西日本/JR西日本_681系_FT.png','681系'),
    ('images/列车/JR西日本/JR西日本_683系.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_K.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_K4.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_N.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_SRN.png','683系'),
    ('images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png','C57形'),
    ('images/列车/JR西日本/JR西日本_キハ189系.png','キハ189系'),
    ('images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png','キハ189系'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png','キハ35系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png','キハ41系'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png','キハ47系'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png','キハ87系')
  ) AS source(image_path,vehicle_type)
  WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets a
                    WHERE a.image_path=source.image_path)
  ON CONFLICT (image_path) DO NOTHING;
  SELECT COUNT(*) INTO review_rows FROM public.vehicle_image_assets a
  WHERE a.image_path IN (SELECT source.image_path FROM (VALUES
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G1.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G2.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA-G3.png','103系'),
    ('images/列车/JR西日本/JR西日本_103系_播但線_BA.png','103系'),
    ('images/列车/JR西日本/JR西日本_113系_福知山線_FK053.png','113系'),
    ('images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png','117系'),
    ('images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png','120系'),
    ('images/列车/JR西日本/JR西日本_120系_関西地区_KAN.png','120系'),
    ('images/列车/JR西日本/JR西日本_122系.png','122系'),
    ('images/列车/JR西日本/JR西日本_187系.png','187系'),
    ('images/列车/JR西日本/JR西日本_205系_阪和線_HN2.png','205系'),
    ('images/列车/JR西日本/JR西日本_213系_W.png','213系'),
    ('images/列车/JR西日本/JR西日本_221系_CHA.png','221系'),
    ('images/列车/JR西日本/JR西日本_221系_N.png','221系'),
    ('images/列车/JR西日本/JR西日本_223系_5500番台.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_H2.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_H6.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_KAH.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_KIL.png','223系'),
    ('images/列车/JR西日本/JR西日本_223系_MORI.png','223系'),
    ('images/列车/JR西日本/JR西日本_225系.png','225系'),
    ('images/列车/JR西日本/JR西日本_225系_V1.png','225系'),
    ('images/列车/JR西日本/JR西日本_227系_WK.png','227系'),
    ('images/列车/JR西日本/JR西日本_271系.png','271系'),
    ('images/列车/JR西日本/JR西日本_273系.png','273系'),
    ('images/列车/JR西日本/JR西日本_281系.png','281系'),
    ('images/列车/JR西日本/JR西日本_283系.png','283系'),
    ('images/列车/JR西日本/JR西日本_283系_K.png','283系'),
    ('images/列车/JR西日本/JR西日本_287系.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_K.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_KRM.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_SKR.png','287系'),
    ('images/列车/JR西日本/JR西日本_287系_V1.png','287系'),
    ('images/列车/JR西日本/JR西日本_289系_G.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KANI.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KG.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_KKANI.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_K_INS.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_MHR.png','289系'),
    ('images/列车/JR西日本/JR西日本_289系_MHS.png','289系'),
    ('images/列车/JR西日本/JR西日本_323系_M.png','323系'),
    ('images/列车/JR西日本/JR西日本_323系_OR.png','323系'),
    ('images/列车/JR西日本/JR西日本_681系_FT.png','681系'),
    ('images/列车/JR西日本/JR西日本_683系.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_K.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_K4.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_N.png','683系'),
    ('images/列车/JR西日本/JR西日本_683系_SRN.png','683系'),
    ('images/列车/JR西日本/JR西日本_C57形_SLやまぐち.png','C57形'),
    ('images/列车/JR西日本/JR西日本_キハ189系.png','キハ189系'),
    ('images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png','キハ189系'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png','キハ35系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png','キハ40系'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png','キハ41系'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png','キハ47系'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png','キハ87系')
  ) AS source(image_path,vehicle_type))
    AND a.operator='JR-West' AND a.asset_status='review'
    AND a.asset_scope='review' AND a.appearance_class='requires_review'
    AND a.file_format_status IS NULL AND a.is_generic=FALSE;
  IF review_rows<>62 THEN
    RAISE EXCEPTION 'JR-West review gallery registry mismatch: % of 62',review_rows;
  END IF;
END
$jrwest_review_inventory$;
