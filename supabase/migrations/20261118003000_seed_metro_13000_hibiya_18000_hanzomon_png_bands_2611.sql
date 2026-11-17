-- PNG-first Metro follow-up: two previously unrecorded gallery images.
-- Source: existing JS full-exact, 2026-11 operator/calendar/line-scoped
-- train rosters exported in data/audits/png-to-train-number-index-2611.json.
-- Hibiya 13000 (A/B + digits + S): weekday 370 / holiday 222,
--     inclusive observed NUMERIC envelope 502..2468.
-- Hanzomon 18000 (A/B + digits + S): weekday 151 / holiday 112,
--     inclusive observed NUMERIC envelope 551..2491.
-- Envelopes are inventory bounds, NOT a claimed continuous operating
-- service set, not vehicle-formation identifiers and not permission to
-- render without the ORIGINAL exact-number, direction prefix, calendar,
-- source railway, operator, train type, and model/identity guards.
-- In particular, do not generalize these to TobuSkytree: two distinct
-- PNGs can have the same numeric S suffix there under different prefixes.
-- No new model/formation evidence, runtime priority, or asset scope change.
DO $metro_13000_18000_scoped_guard$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Hibiya',502,2468,'S','../images/列车/東京メトロ/東京メトロ_13000系.png'),
    ('Hanzomon',551,2491,'S','../images/列车/東京メトロ/東京メトロ_18000系.png')
  ) AS v(line_key,min_number,max_number,suffix,png_reference)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_image_assets a
      WHERE a.image_path=substring(r.png_reference FROM 4)
        AND a.operator='TokyoMetro' AND a.asset_status='available'
        AND a.asset_scope='generic' AND a.file_format_status='native_png'
        AND a.appearance_class IS DISTINCT FROM 'requires_review'
    ) THEN
      RAISE EXCEPTION 'Metro PNG unavailable or non-generic: %',r.png_reference;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges b
      WHERE b.edition='2611' AND b.line_key=r.line_key AND b.suffix=r.suffix
        AND b.min_number<=r.max_number AND b.max_number>=r.min_number
        AND b.png_reference<>r.png_reference
    ) THEN
      RAISE EXCEPTION 'Metro numeric bounds overlap another PNG: %, %',
        r.line_key,r.png_reference;
    END IF;
  END LOOP;
END
$metro_13000_18000_scoped_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Hibiya','png_band/Hibiya/0502-2468S',502,2468,'S',NULL,'../images/列车/東京メトロ/東京メトロ_13000系.png',NULL,FALSE,FALSE),
  ('2611','Hanzomon','png_band/Hanzomon/0551-2491S',551,2491,'S',NULL,'../images/列车/東京メトロ/東京メトロ_18000系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $metro_13000_18000_scoped_verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND
    ((r.line_key='Hibiya' AND r.segment_key='png_band/Hibiya/0502-2468S'
      AND r.min_number=502 AND r.max_number=2468 AND r.suffix='S'
      AND r.png_reference='../images/列车/東京メトロ/東京メトロ_13000系.png')
     OR
     (r.line_key='Hanzomon' AND r.segment_key='png_band/Hanzomon/0551-2491S'
      AND r.min_number=551 AND r.max_number=2491 AND r.suffix='S'
      AND r.png_reference='../images/列车/東京メトロ/東京メトロ_18000系.png'))
    AND r.vehicle_model IS NULL AND r.source_url IS NULL
    AND r.requires_exact_roster=FALSE AND r.actual_vehicle_confirmed=FALSE;
  IF n<>2 THEN
    RAISE EXCEPTION 'Metro 13000/18000 references absent or altered: %',n;
  END IF;
END
$metro_13000_18000_scoped_verify$;
