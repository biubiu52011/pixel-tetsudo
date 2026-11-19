-- JR-08: file-byte audit only. All 14 JR-West PNGs are valid 82x98 native PNGs
-- with correct signature, IHDR, all CRCs and final IEND. Two N700 assets
-- already have native_png, so the 12 review assets below need only a format update.
-- No train number, source roster, artwork approval, livery, or formation change.
DO $migration$
DECLARE found_count integer;
BEGIN
  SELECT count(*) INTO found_count
  FROM public.vehicle_image_assets a
  WHERE a.image_path IN (
    ('images/列车/JR西日本/JR西日本_683系.png'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png')
  )
  AND a.asset_status='review' AND a.asset_scope='review'
  AND a.appearance_class='requires_review'
  AND a.formation_id IS NULL AND a.livery IS NULL;
  IF found_count <> 12 THEN
    RAISE EXCEPTION 'JR08 expected exactly 12 registered review-only assets, got %', found_count;
  END IF;

  UPDATE public.vehicle_image_assets
  SET file_format_status='native_png'
  WHERE image_path IN (
    ('images/列车/JR西日本/JR西日本_683系.png'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png')
  )
  AND asset_status='review' AND asset_scope='review'
  AND appearance_class='requires_review'
  AND file_format_status IS DISTINCT FROM 'native_png';

  SELECT count(*) INTO found_count
  FROM public.vehicle_image_assets a
  WHERE a.image_path IN (
    ('images/列车/JR西日本/JR西日本_683系.png'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png')
  )
  AND a.file_format_status='native_png'
  AND a.asset_status='review' AND a.asset_scope='review';
  IF found_count <> 12 THEN
    RAISE EXCEPTION 'JR08 expected 12 validated native_png review assets, got %', found_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges r
    WHERE r.png_reference IN (
    ('images/列车/JR西日本/JR西日本_683系.png'),
    ('images/列车/JR西日本/JR西日本_キハ35系.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_AMTC.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_ETS.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JBEL.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_JNRN.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOG.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_OOR.png'),
    ('images/列车/JR西日本/JR西日本_キハ40系_UYM.png'),
    ('images/列车/JR西日本/JR西日本_キハ41系.png'),
    ('images/列车/JR西日本/JR西日本_キハ47系_SAK.png'),
    ('images/列车/JR西日本/JR西日本_キハ87系.png')
    )
  ) THEN
    RAISE EXCEPTION 'JR08 review-only assets unexpectedly have published number ranges';
  END IF;
END
$migration$;
