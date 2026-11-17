-- Reference-only PNG number ownership band for SaitamaRapid 2000 (2611).
-- Source: 2026/03/14 operation chart, October 2026 publication, 80M..98M.
-- https://ameblo.jp/local-shibuya/entry-12980538769.html
-- https://www.jametro.or.jp/subway/japan/saitama/guide.html
-- The M is the operator stock token; 80..98 is the LAST TWO digits of
-- an actual Namboku/SaitamaRapid numbered train (e.g. A1082M).
-- The frontend/CSV numberFormat is 'tail', not 'full'. DB has no format
-- column; existing source, operating day, operator, route, numeric parser
-- and matched model evidence MUST continue to gate any image usage.
-- Sparse odd/inactive numbers in this band are not proven active trains.
-- This reference never authorizes actual 2000-series formation identity,
-- a train departure or unconditional image selection.

DO $saitama_2000_m_ref_guard$
DECLARE x record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png'
      AND operator='SaitamaRapid'
      AND asset_status='available' AND file_format_status='native_png'
      AND appearance_class IS DISTINCT FROM 'requires_review'
  ) THEN RAISE EXCEPTION 'SaitamaRapid 2000 PNG is not available'; END IF;
  FOR x IN SELECT * FROM (VALUES ('Namboku'),('SaitamaRapid')) v(line_key) LOOP
    IF EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges r
      WHERE r.edition='2611' AND r.line_key=x.line_key AND r.suffix='M'
       AND r.min_number<=98 AND r.max_number>=80
       AND r.png_reference<>'../images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png'
    ) THEN
      RAISE EXCEPTION 'SaitamaRapid M tail overlaps different PNG on %',x.line_key;
    END IF;
  END LOOP;
END
$saitama_2000_m_ref_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Namboku','png_band/Namboku/0080-0098M',80,98,'M',NULL,'../images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png',NULL,FALSE,FALSE),
  ('2611','SaitamaRapid','png_band/SaitamaRapid/0080-0098M',80,98,'M',NULL,'../images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $saitama_2000_m_ref_verify$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611'
   AND line_key IN ('Namboku','SaitamaRapid')
   AND segment_key LIKE 'png_band/%/0080-0098M'
   AND min_number=80 AND max_number=98 AND suffix='M'
   AND png_reference='../images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n<>2 THEN RAISE EXCEPTION 'SaitamaRapid 2000 M tail reference mismatch: %',n; END IF;
END
$saitama_2000_m_ref_verify$;
