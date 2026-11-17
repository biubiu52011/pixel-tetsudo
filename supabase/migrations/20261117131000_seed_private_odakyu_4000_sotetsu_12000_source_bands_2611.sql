-- Private railway PNG bands captured from existing guarded frontend 2611 sources.
-- Exactly two pre-existing JS rules, not new train scheduling/physical identity.
--
-- 1. Odakyu 4000: JobanLocal 0400-2599E (format full).
--    Frontend js-0096 restricts to 2026-11, JR-East.JobanLocal, Local,
--    Odakyu4000 model, and source-operator fallback.
-- 2. Sotetsu 12000: SaikyoKawagoe 0072-0079KFS (format tail).
--    Frontend js-0057 restricts to 2026-11, JR-East.SaikyoKawagoe,
--    inbound-even direction, Local/Rapid/CommuterRapid, Sotetsu12000 model.
--
-- DB numbers are REFERENCE ONLY, not a replacement for those JS guards.
-- Never use the number interval to bypass dates, train types, source railway,
-- vehicle identity, operator context, or selection conflict checks.
-- The Odakyu image has asset_scope=review even if asset_status=available:
-- do not change its asset metadata or promote the artwork.

DO $private_js_bands_guard$
DECLARE x record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png'
      AND operator='Odakyu' AND asset_status='available'
      AND file_format_status='native_png' AND asset_scope='review'
  ) THEN RAISE EXCEPTION 'Odakyu 4000 source artwork review scope changed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png'
      AND operator='Sotetsu' AND asset_status='available'
      AND file_format_status='native_png'
      AND appearance_class IS DISTINCT FROM 'requires_review'
  ) THEN RAISE EXCEPTION 'Sotetsu 12000 source artwork unavailable'; END IF;
  FOR x IN SELECT * FROM (VALUES
    ('JobanLocal',400,2599,'E','../images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png'),
    ('SaikyoKawagoe',72,79,'KFS','../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png')
  ) v(line_key,min_number,max_number,suffix,png_reference) LOOP
    IF EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges r
      WHERE r.edition='2611' AND r.line_key=x.line_key
        AND r.suffix=x.suffix
        AND r.min_number<=x.max_number AND r.max_number>=x.min_number
        AND r.png_reference<>x.png_reference
    ) THEN RAISE EXCEPTION 'Private number source collision %',x.line_key; END IF;
  END LOOP;
END
$private_js_bands_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','JobanLocal','png_band/JobanLocal/0400-2599E',400,2599,'E',NULL,'../images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png',NULL,FALSE,FALSE),
  ('2611','SaikyoKawagoe','png_band/SaikyoKawagoe/0072-0079KFS',72,79,'KFS',NULL,'../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $private_js_bands_verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND (
   (line_key='JobanLocal' AND segment_key='png_band/JobanLocal/0400-2599E'
    AND min_number=400 AND max_number=2599 AND suffix='E'
    AND png_reference='../images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png')
   OR
   (line_key='SaikyoKawagoe' AND segment_key='png_band/SaikyoKawagoe/0072-0079KFS'
    AND min_number=72 AND max_number=79 AND suffix='KFS'
    AND png_reference='../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png')
 ) AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n<>2 THEN RAISE EXCEPTION 'Private JS reference band mismatch: %',n; END IF;
END
$private_js_bands_verify$;
