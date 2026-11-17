-- PNG-first JR source-bands (2026-11): existing guarded runtime rules.
-- Source js-0056: SaikyoKawagoe/Rinkai E233-7000 00..71 K/F/S
--   LAST TWO numeric digits. The full published train number, railway,
--   direction parity and allowed-model guard stay in JS.
--   72..79 belongs to separate Sotetsu 12000 reference; 80..91 to
--   a model-conditional TWR reference. These bands do not overlap.
-- Source js-0001: JR-Central Gotemba local 88 exact November 2611
--   service numbers, full 2226..5550 with suffix M/G. Fleet also
--   contains 313-series: 315 PNG is ONLY a line-level illustration,
--   NEVER a claim about the actual trainset or the whole interval.
-- SQL records numeric envelopes for the 601-PNG audit; existing runtime
-- owns all date/type/number/actual-vehicle/valid-model verification.
-- No asset promotion, image priority, new runtime owner or invented services.
DO $jr_e233_315_png_source_preflight$
DECLARE ref record;
BEGIN
  FOR ref IN SELECT * FROM (VALUES
    ('JR-East','subseries','E233系','../images/列车/JR東日本/JR東日本_E233系_7000番台.png'),
    ('JR-Central','formation','315系','../images/列车/JR東海/JR東海_315系.png')
  ) AS v(operator,asset_scope,vehicle_type,png_reference)
  LOOP
    IF NOT EXISTS(
      SELECT 1 FROM public.vehicle_image_assets a
      WHERE a.image_path=substring(ref.png_reference FROM 4)
        AND a.operator=ref.operator AND a.vehicle_type=ref.vehicle_type
        AND a.asset_scope=ref.asset_scope
        AND a.asset_status='available'
        AND a.file_format_status='native_png'
        AND a.appearance_class IS DISTINCT FROM 'requires_review'
    ) THEN RAISE EXCEPTION 'JR numbered image not approved: %',ref.png_reference; END IF;
  END LOOP;

  IF EXISTS (
    WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
      ('SaikyoKawagoe',0,71,'KFS','../images/列车/JR東日本/JR東日本_E233系_7000番台.png'),
      ('Rinkai',0,71,'KFS','../images/列车/JR東日本/JR東日本_E233系_7000番台.png'),
      ('Gotemba',2226,5550,'MG','../images/列车/JR東海/JR東海_315系.png')
    )
    SELECT 1
      FROM proposed p JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key=p.line_key
      AND r.min_number<=p.max_number AND p.min_number<=r.max_number
      AND (r.suffix=p.suffix OR
           (p.suffix='KFS' AND r.suffix IN ('K','F','S')) OR
           (p.suffix='MG' AND r.suffix IN ('M','G')))
      AND r.png_reference<>p.png_reference
  ) THEN RAISE EXCEPTION 'JR source number envelope overlaps a different PNG'; END IF;
END
$jr_e233_315_png_source_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','SaikyoKawagoe','png_band/SaikyoKawagoe/0000-0071KFS',0,71,'KFS',NULL,'../images/列车/JR東日本/JR東日本_E233系_7000番台.png',NULL,FALSE,FALSE),
  ('2611','Rinkai','png_band/Rinkai/0000-0071KFS',0,71,'KFS',NULL,'../images/列车/JR東日本/JR東日本_E233系_7000番台.png',NULL,FALSE,FALSE),
  ('2611','Gotemba','png_band/Gotemba/2226-5550MG',2226,5550,'MG',NULL,'../images/列车/JR東海/JR東海_315系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr_e233_315_png_source_verify$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.published_train_png_number_ranges
   WHERE edition='2611'
     AND ((line_key='SaikyoKawagoe' AND segment_key='png_band/SaikyoKawagoe/0000-0071KFS'
        AND min_number=0 AND max_number=71 AND suffix='KFS'
        AND png_reference='../images/列车/JR東日本/JR東日本_E233系_7000番台.png')
      OR (line_key='Rinkai' AND segment_key='png_band/Rinkai/0000-0071KFS'
        AND min_number=0 AND max_number=71 AND suffix='KFS'
        AND png_reference='../images/列车/JR東日本/JR東日本_E233系_7000番台.png')
      OR (line_key='Gotemba' AND segment_key='png_band/Gotemba/2226-5550MG'
        AND min_number=2226 AND max_number=5550 AND suffix='MG'
        AND png_reference='../images/列车/JR東海/JR東海_315系.png'))
      AND vehicle_model IS NULL AND source_url IS NULL
      AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF n<>3 THEN RAISE EXCEPTION 'JR E233/315 PNG envelope mismatch: %/3',n; END IF;
END
$jr_e233_315_png_source_verify$;
