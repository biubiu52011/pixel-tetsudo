-- PNG-first private railway reference bands, Tobu (2611).
-- Reuses EXISTING original source tables; no new train/vehicle identities.
-- Koizumi source: published_tobu_koizumi_2611_png_bands, two calendar
-- groups, common 701E..764E envelope, historical-undated, 10000/10030/
-- 10030-50 family candidates, illustration PNG is NOT a confirmed carset.
-- TH LINER source: published_tobu_skytree_png_number_bands, weekday
-- numeric envelope 4041..4945 and holiday 4045..4947, operator suffix T,
-- original numbers include B4041T, A4845T, B4947T; TH-only service gate.
--
-- IMPORTANT: these are INCLUSIVE SOURCE REFERENCE ENVELOPES, not a roster.
-- In-between services, dates, service type, direction, and actual fleet
-- must still pass existing per-source conditions. No new runtime rule is
-- introduced and no gallery artwork may be promoted by this reference.
-- 10030 image remains available but asset_scope=review; TH image stays
-- available/generic. Other Tobu Skytree SPACIA/REVATY/RYOMO numbered
-- source families overlap each other and are NOT inserted here.
DO $tobu_private_band_guard$
DECLARE x record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png'
      AND operator='Tobu' AND asset_status='available'
      AND asset_scope='review' AND file_format_status='native_png'
  ) THEN RAISE EXCEPTION 'Tobu Koizumi 10030 PNG review scope changed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/東武鉄道/東武鉄道_70090型.png'
      AND operator='Tobu' AND asset_status='available'
      AND asset_scope='generic' AND file_format_status='native_png'
      AND appearance_class IS DISTINCT FROM 'requires_review'
  ) THEN RAISE EXCEPTION 'Tobu 70090 source PNG unavailable'; END IF;

  IF (SELECT COUNT(*) FROM public.published_tobu_koizumi_2611_png_bands
      WHERE edition='2611' AND line_key='Koizumi'
        AND min_number=701 AND max_number=764
        AND png_reference='../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png' AND source_scope='historical-undated'
        AND reference_only=TRUE AND actual_vehicle_confirmed=FALSE)<>2
  THEN RAISE EXCEPTION 'Koizumi source envelope/guard changed'; END IF;

  IF (SELECT COUNT(*) FROM public.published_tobu_skytree_png_number_bands
      WHERE edition='2611' AND line_key='TobuSkytree'
        AND service_family='th_liner' AND png_reference='../images/列车/東武鉄道/東武鉄道_70090型.png'
        AND reference_only=TRUE AND actual_vehicle_confirmed=FALSE
        AND ((min_number=4041 AND max_number=4945 AND calendar_urn='odpt.Calendar:Weekday')
          OR (min_number=4045 AND max_number=4947 AND calendar_urn='odpt.Calendar:SaturdayHoliday')))<>2
  THEN RAISE EXCEPTION 'TH LINER reference source windows changed'; END IF;

  FOR x IN SELECT * FROM (VALUES
    ('Koizumi',701,764,'E','../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png'),
    ('TobuSkytree',4041,4945,'T','../images/列车/東武鉄道/東武鉄道_70090型.png'),
    ('TobuSkytree',4045,4947,'T','../images/列车/東武鉄道/東武鉄道_70090型.png')
  ) v(line_key,min_number,max_number,suffix,png_reference) LOOP
    IF EXISTS (SELECT 1 FROM public.published_train_png_number_ranges r
      WHERE r.edition='2611' AND r.line_key=x.line_key
        AND r.suffix=x.suffix
        AND r.min_number<=x.max_number AND r.max_number>=x.min_number
        AND r.png_reference<>x.png_reference)
    THEN RAISE EXCEPTION 'Tobu gallery PNG cross-image reference collision: %',x.line_key; END IF;
  END LOOP;
END
$tobu_private_band_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Koizumi','png_band/Koizumi/0701-0764E',701,764,'E',NULL,'../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png',NULL,FALSE,FALSE),
  ('2611','TobuSkytree','png_band/TobuSkytree/4041-4945T',4041,4945,'T',NULL,'../images/列车/東武鉄道/東武鉄道_70090型.png',NULL,FALSE,FALSE),
  ('2611','TobuSkytree','png_band/TobuSkytree/4045-4947T',4045,4947,'T',NULL,'../images/列车/東武鉄道/東武鉄道_70090型.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $tobu_private_band_verify$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND (
    (line_key='Koizumi' AND min_number=701 AND max_number=764 AND suffix='E'
      AND png_reference='../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png' AND segment_key='png_band/Koizumi/0701-0764E')
    OR (line_key='TobuSkytree' AND min_number=4041 AND max_number=4945 AND suffix='T'
      AND png_reference='../images/列车/東武鉄道/東武鉄道_70090型.png' AND segment_key='png_band/TobuSkytree/4041-4945T')
    OR (line_key='TobuSkytree' AND min_number=4045 AND max_number=4947 AND suffix='T'
      AND png_reference='../images/列车/東武鉄道/東武鉄道_70090型.png' AND segment_key='png_band/TobuSkytree/4045-4947T')
  ) AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF n<>3 THEN RAISE EXCEPTION 'Tobu private bands persisted % of 3',n; END IF;
END
$tobu_private_band_verify$;
