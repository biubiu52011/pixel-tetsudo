-- TobuSkytree 2026-11 scheduled-number/PNG reference bands.
-- Exactly one row per service family + GTFS calendar. The numeric bounds
-- do not authorize gaps; only exact_train_numbers enumerates actual source
-- numbers. No published number is an actual vehicle number or carset.
-- Stage: https://github.com/MKuranowski/TokyoGTFS
CREATE TABLE IF NOT EXISTS public.published_tobu_skytree_png_number_bands (
  edition text NOT NULL CHECK (edition='2611'),
  line_key text NOT NULL CHECK (line_key='TobuSkytree'),
  feed_sha text NOT NULL,
  calendar_urn text NOT NULL CHECK (calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  service_family text NOT NULL CHECK (service_family IN ('ordinary','revaty','ryomo','skytree_liner','spacia','spacia_x','th_liner')),
  min_number integer NOT NULL,
  max_number integer NOT NULL CHECK(max_number>=min_number),
  exact_train_numbers text[] NOT NULL CHECK(cardinality(exact_train_numbers)>0),
  trip_count integer NOT NULL CHECK(trip_count>0),
  illustration_model text NOT NULL,
  png_reference text NOT NULL,
  fleet_source_url text NOT NULL CHECK(fleet_source_url LIKE 'https://%'),
  valid_from date NOT NULL CHECK(valid_from='2026-11-02'::date),
  valid_to date NOT NULL CHECK(valid_to='2026-11-30'::date),
  reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
  PRIMARY KEY(edition,line_key,calendar_urn,service_family)
);
ALTER TABLE public.published_tobu_skytree_png_number_bands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_tobu_skytree_png_number_bands FROM anon, authenticated;
COMMENT ON TABLE public.published_tobu_skytree_png_number_bands IS
 'Source-locked timetable numbers and reference artwork. Ordinary is mixed fleet; PNG is illustrative, not actual car or formation.';

DO $bands$
DECLARE
  source_sha constant text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  seen integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tobu-skytree-2611-png-number-bands'));
  IF NOT EXISTS(SELECT 1 FROM gtfs_stage.feed_imports
    WHERE feed_sha=source_sha AND service_start='2026-11-02'::date
      AND service_end='2027-11-02'::date)
  THEN RAISE EXCEPTION 'Staged GTFS feed edition changed'; END IF;
  SELECT count(*) INTO seen FROM gtfs_stage.trips
    WHERE feed_sha=source_sha AND route_id='Tobu.TobuSkytree';
  IF seen<>1738 THEN RAISE EXCEPTION 'Staged TobuSkytree train roster changed'; END IF;
  WITH classified AS (
    SELECT t.service_id,split_part(t.train_number,' ',1) AS number,
      CASE WHEN t.train_number LIKE '%THライナー%' THEN 'th_liner' WHEN t.train_number ILIKE '%スペーシアX%' THEN 'spacia_x' WHEN t.train_number LIKE '%リバティ%' THEN 'revaty' WHEN t.train_number LIKE '%スカイツリーライナー%' THEN 'skytree_liner' WHEN t.train_number LIKE '%りょうもう%' THEN 'ryomo' WHEN t.train_number LIKE '%けごん%' OR t.train_number LIKE '%きぬ%' THEN 'spacia' ELSE 'ordinary' END AS family
    FROM gtfs_stage.trips t WHERE t.feed_sha=source_sha
      AND t.route_id='Tobu.TobuSkytree'
  )
  SELECT count(*) INTO seen FROM (
    SELECT service_id,number FROM classified
    GROUP BY service_id,number HAVING count(DISTINCT family)>1
  ) c;
  IF seen<>0 THEN RAISE EXCEPTION 'GTFS train number has conflicting service families'; END IF;

  INSERT INTO public.published_tobu_skytree_png_number_bands(
    edition,line_key,feed_sha,calendar_urn,service_family,
    min_number,max_number,exact_train_numbers,trip_count,
    illustration_model,png_reference,fleet_source_url,valid_from,valid_to)
  WITH classified AS(
    SELECT t.service_id,split_part(t.train_number,' ',1) AS number,
      CASE WHEN t.train_number LIKE '%THライナー%' THEN 'th_liner' WHEN t.train_number ILIKE '%スペーシアX%' THEN 'spacia_x' WHEN t.train_number LIKE '%リバティ%' THEN 'revaty' WHEN t.train_number LIKE '%スカイツリーライナー%' THEN 'skytree_liner' WHEN t.train_number LIKE '%りょうもう%' THEN 'ryomo' WHEN t.train_number LIKE '%けごん%' OR t.train_number LIKE '%きぬ%' THEN 'spacia' ELSE 'ordinary' END AS family
    FROM gtfs_stage.trips t WHERE t.feed_sha=source_sha
      AND t.route_id='Tobu.TobuSkytree'
  )
  SELECT '2611','TobuSkytree',source_sha,'odpt.Calendar:'||service_id,
    family,min(regexp_replace(number,'[^0-9]','','g')::int),
    max(regexp_replace(number,'[^0-9]','','g')::int),
    array_agg(DISTINCT number ORDER BY number),count(*)::integer,
    CASE family WHEN 'ordinary' THEN '東武50050系' WHEN 'revaty' THEN '東武500系' WHEN 'ryomo' THEN '東武200型' WHEN 'skytree_liner' THEN '東武500系' WHEN 'spacia' THEN '東武100系' WHEN 'spacia_x' THEN '東武N100系' WHEN 'th_liner' THEN '東武70090型' END,
    CASE family WHEN 'ordinary' THEN '../images/列车/東武鉄道/東武鉄道_50050型.png' WHEN 'revaty' THEN '../images/列车/東武鉄道/東武鉄道_500系_リバティ.png' WHEN 'ryomo' THEN '../images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png' WHEN 'skytree_liner' THEN '../images/列车/東武鉄道/東武鉄道_500系_リバティ.png' WHEN 'spacia' THEN '../images/列车/東武鉄道/東武鉄道_100系_原色.png' WHEN 'spacia_x' THEN '../images/列车/東武鉄道/東武鉄道_N100系_SPACIA_X.png' WHEN 'th_liner' THEN '../images/列车/東武鉄道/東武鉄道_70090型.png' END,
    CASE family WHEN 'ordinary' THEN 'https://www.tobu.co.jp/corporation/rail/vehicles/' WHEN 'revaty' THEN 'https://www.tobu.co.jp/railway/special_express/vehicle/revaty/' WHEN 'ryomo' THEN 'https://www.tobu.co.jp/railway/special_express/vehicle/ryomo/' WHEN 'skytree_liner' THEN 'https://www.tobu.co.jp/corporation/history/fhistory08.html' WHEN 'spacia' THEN 'https://www.tobu.co.jp/railway/special_express/vehicle/spacia/' WHEN 'spacia_x' THEN 'https://www.tobu.co.jp/spaciax/guide/' WHEN 'th_liner' THEN 'https://www.tobu.co.jp/corporation/rail/vehicles/' END,
    '2026-11-02'::date,'2026-11-30'::date
  FROM classified GROUP BY service_id,family
  ON CONFLICT (edition,line_key,calendar_urn,service_family)
  DO UPDATE SET
    feed_sha=excluded.feed_sha,
    min_number=excluded.min_number,max_number=excluded.max_number,
    exact_train_numbers=excluded.exact_train_numbers,
    trip_count=excluded.trip_count,
    illustration_model=excluded.illustration_model,
    png_reference=excluded.png_reference,
    fleet_source_url=excluded.fleet_source_url;
  IF (SELECT count(*) FROM public.published_tobu_skytree_png_number_bands
    WHERE edition='2611' AND line_key='TobuSkytree')<>14 OR
     (SELECT sum(trip_count) FROM public.published_tobu_skytree_png_number_bands
    WHERE edition='2611' AND line_key='TobuSkytree')<>1738
  THEN RAISE EXCEPTION 'Incomplete PNG reference bands'; END IF;
END
$bands$;
