-- JR-09: rename seven verified original PNG assets without changing approval or number mapping.
DO $migration$
DECLARE updated_count integer;
BEGIN
  WITH mapping(old_path,new_path) AS (VALUES
    ('images/列车/JR東海/c11nsk.png', 'images/列车/JR東海/JR東海_キハ11形_仕様未確認.png'),
    ('images/列车/JR東海/c25-1.png', 'images/列车/JR東海/JR東海_キハ25形_仕様未確認.png'),
    ('images/列车/JR東海/c313ce.png', 'images/列车/JR東海/JR東海_313系_前面差分_仕様未確認.png'),
    ('images/列车/JR東海/c35.png', 'images/列车/JR東海/JR東海_HC35形_外観イメージ.png'),
    ('images/列车/JR東海/c385.png', 'images/列车/JR東海/JR東海_385系_量産先行車.png'),
    ('images/列车/JR東海/c75.png', 'images/列车/JR東海/JR東海_キハ75形_仕様未確認.png'),
    ('images/列车/JR東海/c85h.png', 'images/列车/JR東海/JR東海_HC85系.png')
  )
  UPDATE public.vehicle_image_assets a
  SET image_path=m.new_path,
      vehicle_type=CASE
        WHEN m.old_path LIKE '%c11nsk.png' THEN 'キハ11形（仕様未確認）'
        WHEN m.old_path LIKE '%c25-1.png' THEN 'キハ25形（仕様未確認）'
        WHEN m.old_path LIKE '%c313ce.png' THEN '313系（前面差分・仕様未確認）'
        WHEN m.old_path LIKE '%c35.png' THEN 'HC35形（外観イメージ）'
        WHEN m.old_path LIKE '%c385.png' THEN '385系（量産先行車）'
        WHEN m.old_path LIKE '%c75.png' THEN 'キハ75形（仕様未確認）'
        WHEN m.old_path LIKE '%c85h.png' THEN 'HC85系'
        ELSE a.vehicle_type END,
      review_note=concat(coalesce(a.review_note,''),' JR-09: original filename normalized; model-level visual identification only, no unique number/formation proof; review-only.')
  FROM mapping m
  WHERE a.image_path=m.old_path
    AND a.operator='JR-Central' AND a.asset_status='review'
    AND a.asset_scope='review' AND a.appearance_class='requires_review'
    AND a.file_format_status='native_png';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 7 THEN RAISE EXCEPTION 'JR09 expected 7 renamed review-only assets, got %', updated_count; END IF;
  IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges r
    WHERE r.png_reference LIKE '%/JR東海/c11nsk.png' OR r.png_reference LIKE '%/JR東海/c25-1.png'
       OR r.png_reference LIKE '%/JR東海/c313ce.png' OR r.png_reference LIKE '%/JR東海/c35.png'
       OR r.png_reference LIKE '%/JR東海/c385.png' OR r.png_reference LIKE '%/JR東海/c75.png'
       OR r.png_reference LIKE '%/JR東海/c85h.png') THEN
    RAISE EXCEPTION 'JR09 old names unexpectedly have published number mappings';
  END IF;
END
$migration$;
