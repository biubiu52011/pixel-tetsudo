-- TobuSkytree 2026-11: refine existing ordinary-service PNG references
-- by source-backed GTFS corridor, keeping the original 14 number-band rows.
-- The old 50050-for-everything row was incorrect for Asakusa and Hibiya
-- services. A corridor reference is NOT a physical formation assignment.
-- Official fleet overview: https://www.tobu.co.jp/corporation/rail/vehicles/
ALTER TABLE public.published_tobu_skytree_png_number_bands
  ADD COLUMN IF NOT EXISTS ordinary_corridor_references jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.published_tobu_skytree_png_number_bands.ordinary_corridor_references IS
 'Exact 2026-11 GTFS train-number sets partitioned by station corridor, with illustrative images only; unknown corridors have no PNG and no vehicle identification.';

DO $corridor$
DECLARE
  source_sha CONSTANT text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  expected_total integer;
  changed_rows integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tobu-skytree-2611-png-number-bands'));
  SELECT count(*) INTO expected_total
  FROM public.published_tobu_skytree_png_number_bands
  WHERE edition='2611' AND line_key='TobuSkytree' AND
    service_family='ordinary' AND feed_sha=source_sha;
  IF expected_total <> 2 THEN
    RAISE EXCEPTION 'Existing TobuSkytree ordinary source is not two calendar rows';
  END IF;

  WITH ordinary AS (
    SELECT t.service_id, split_part(t.train_number,' ',1) AS number,
      CASE
        WHEN EXISTS (SELECT 1 FROM gtfs_stage.stop_times s
          WHERE s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id AND
            s.stop_id='Tobu.TobuSkytree.Asakusa') THEN 'asakusa'
        WHEN EXISTS (SELECT 1 FROM gtfs_stage.stop_times s
          WHERE s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id AND
            s.stop_id='Tobu.TobuSkytree.Oshiage') THEN 'oshiage'
        WHEN t.train_number ~ '^[AB][0-9]+[ST]$' THEN 'hibiya'
        ELSE 'unresolved'
      END AS corridor
    FROM gtfs_stage.trips t
    WHERE t.feed_sha=source_sha AND t.route_id='Tobu.TobuSkytree'
      AND t.train_number NOT LIKE '%THライナー%'
      AND t.train_number NOT ILIKE '%スペーシアX%'
      AND t.train_number NOT LIKE '%リバティ%'
      AND t.train_number NOT LIKE '%スカイツリーライナー%'
      AND t.train_number NOT LIKE '%りょうもう%'
      AND t.train_number NOT LIKE '%けごん%'
      AND t.train_number NOT LIKE '%きぬ%'
  ),
  grouped AS (
    SELECT service_id, corridor, count(*)::integer trip_count,
      array_agg(DISTINCT number ORDER BY number) number_list
    FROM ordinary GROUP BY service_id,corridor
  ),
  per_calendar AS (
    SELECT service_id,
      jsonb_object_agg(corridor,
        jsonb_build_object(
          'trip_count',trip_count,
          'train_numbers',to_jsonb(number_list),
          'illustration_model',CASE corridor
            WHEN 'asakusa' THEN '東武10030系'
            WHEN 'hibiya' THEN '東武70000系'
            WHEN 'oshiage' THEN '東武50050系'
            ELSE NULL END,
          'png_reference',CASE corridor
            WHEN 'asakusa' THEN '../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png'
            WHEN 'hibiya' THEN '../images/列车/東武鉄道/東武鉄道_70000系.png'
            WHEN 'oshiage' THEN '../images/列车/東武鉄道/東武鉄道_50050型.png'
            ELSE NULL END,
          'reference_only',true,
          'actual_vehicle_confirmed',false
        )) AS references
    FROM grouped GROUP BY service_id
  )
  UPDATE public.published_tobu_skytree_png_number_bands b
  SET ordinary_corridor_references = p.references,
      illustration_model = 'MIXED_ORDINARY_CORRIDOR_GATED',
      png_reference = ''
  FROM per_calendar p
  WHERE b.edition='2611' AND b.line_key='TobuSkytree'
    AND b.service_family='ordinary' AND b.calendar_urn='odpt.Calendar:'||p.service_id
    AND b.feed_sha=source_sha;
  GET DIAGNOSTICS changed_rows=ROW_COUNT;
  IF changed_rows<>2 THEN RAISE EXCEPTION 'Ordinary corridor update did not touch both calendars'; END IF;
  IF EXISTS(
    SELECT 1 FROM public.published_tobu_skytree_png_number_bands b
    WHERE b.edition='2611' AND b.line_key='TobuSkytree' AND b.service_family='ordinary'
    AND (
      (b.calendar_urn='odpt.Calendar:Weekday' AND (
        b.trip_count<>793 OR
        jsonb_array_length(b.ordinary_corridor_references->'asakusa'->'train_numbers')<>223 OR
        jsonb_array_length(b.ordinary_corridor_references->'hibiya'->'train_numbers')<>340 OR
        jsonb_array_length(b.ordinary_corridor_references->'oshiage'->'train_numbers')<>222 OR
        jsonb_array_length(b.ordinary_corridor_references->'unresolved'->'train_numbers')<>8
      )) OR
      (b.calendar_urn='odpt.Calendar:SaturdayHoliday' AND (
        b.trip_count<>707 OR
        jsonb_array_length(b.ordinary_corridor_references->'asakusa'->'train_numbers')<>222 OR
        jsonb_array_length(b.ordinary_corridor_references->'hibiya'->'train_numbers')<>274 OR
        jsonb_array_length(b.ordinary_corridor_references->'oshiage'->'train_numbers')<>205 OR
        jsonb_array_length(b.ordinary_corridor_references->'unresolved'->'train_numbers')<>6
      ))
      OR EXISTS(
        SELECT 1 FROM unnest(b.exact_train_numbers) AS n
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_each(b.ordinary_corridor_references) corr,
            jsonb_array_elements_text(corr.value->'train_numbers') AS x
          WHERE x.value=n
        )
      )
      OR (SELECT count(*) FROM jsonb_each(b.ordinary_corridor_references) corr,
        jsonb_array_elements_text(corr.value->'train_numbers'))<>cardinality(b.exact_train_numbers)
      OR b.png_reference<>'' OR b.illustration_model<>'MIXED_ORDINARY_CORRIDOR_GATED'
    )
  ) THEN RAISE EXCEPTION 'GTFS corridor coverage or former gallery fallback violates contract'; END IF;
END
$corridor$;
