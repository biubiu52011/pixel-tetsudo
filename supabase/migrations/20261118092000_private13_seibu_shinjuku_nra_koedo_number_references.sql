-- Private13: five source-crosschecked Koedo / New Red Arrow 10000-series
-- reference numbers for original SeibuShinjuku gallery scope ONLY.
-- 2026-04-07 Seibu official "Beer Special 2026" release (dated 2026-06-07):
-- https://www.seiburailway.jp/newsroom/news/20260407_NRABeer/
-- Source-linked official release PDF lists public train names as
-- Koedo 65, 11, 25 (down) and Koedo 18, 32 (up).
-- https://www.seiburailway.jp/file.jsp?newsroom%2Fnews%2Ffile%2F20260407_NRABeer.pdf=
-- Licensed organizer's itinerary confirms all five plus times:
-- https://l-tike.com/order/?gBaseVenueCd=34917&gCarrierCd=01&gEntryMthd=01&gLcode=33670
-- Existing canonical 2025-03-15 SeibuShinjuku manual_timetable_templates
-- (mini-tokyo-3d:seibu-shinjuku.json@504d01f44b2e4c) contains public-
-- train-number crosswalk at 165/111/125/118/132 (not labels 65/11/25/18/32).
-- Seibu 2026 official fleet FAQ: Koedo uses 10000 series:
-- https://www.seiburailway.jp/cs/faq/reservedtrain/
-- 2026-08-05 Seibu news continues Koedo 10000 into 2026/27 season:
-- https://www.seiburailway.jp/newsroom/news/20260805_NRAtanashi/
-- Public-service label => historical 2025 number: 11=>111, 18=>118,
-- 25=>125, 32=>132, 65=>165. DO NOT promote the public name 11 to
-- integer 11, nor extrapolate the rest of the timetable from this list.
-- Historical 2025 revision is NOT 2026-11 full train/timetable evidence.
-- Pure number reference ONLY. No realtime/formation, current date, livery,
-- 2026-11 timetable or actual operating-carset confirmation. Preserve
-- source, serviceDate, operator, direction, train type and review guard.
-- Existing asset is review-only and MUST NOT auto-render from these rows.
BEGIN;
DO $preflight$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png' AND operator='Seibu'
     AND vehicle_type='10000系' AND asset_status='available'
     AND asset_scope='review' AND is_generic=FALSE
     AND file_format_status='native_png'
     AND formation_id IS NULL AND car_id IS NULL
  ) THEN RAISE EXCEPTION 'Private13: existing review-only NRA artwork changed'; END IF;

  IF (SELECT COUNT(DISTINCT train_number)
      FROM public.manual_timetable_templates
      WHERE line_key='SeibuShinjuku'
       AND source_revision_date=DATE '2025-03-15'
       AND train_type_urn='odpt.TrainType:Seibu.LimitedExpress'
       AND train_number IN ('111','118','125','132','165'))<>5
  THEN RAISE EXCEPTION 'Private13: crosswalk original dated source changed'; END IF;

  IF EXISTS(
    WITH proposed(min_number,max_number) AS (VALUES (111,111), (118,118), (125,125), (132,132), (165,165))
    SELECT 1 FROM proposed p
    JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key='SeibuShinjuku' AND r.suffix=''
     AND p.min_number<=r.max_number AND r.min_number<=p.max_number
  ) THEN RAISE EXCEPTION 'Private13: SeibuShinjuku interval collision'; END IF;
END;
$preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','SeibuShinjuku','png_band/SeibuShinjuku/0111-0111',111,111,'',NULL,
  '../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png',NULL,FALSE,FALSE),
 ('2611','SeibuShinjuku','png_band/SeibuShinjuku/0118-0118',118,118,'',NULL,
  '../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png',NULL,FALSE,FALSE),
 ('2611','SeibuShinjuku','png_band/SeibuShinjuku/0125-0125',125,125,'',NULL,
  '../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png',NULL,FALSE,FALSE),
 ('2611','SeibuShinjuku','png_band/SeibuShinjuku/0132-0132',132,132,'',NULL,
  '../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png',NULL,FALSE,FALSE),
 ('2611','SeibuShinjuku','png_band/SeibuShinjuku/0165-0165',165,165,'',NULL,
  '../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='SeibuShinjuku'
     AND segment_key LIKE 'png_band/SeibuShinjuku/%'
     AND png_reference='../images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png' AND min_number=max_number
     AND suffix='' AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>5
 THEN RAISE EXCEPTION 'Private13: exact five reference rows not persisted'; END IF;
END;
$verify$;
COMMIT;
