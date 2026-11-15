-- Tobu Koizumi 2026-11 train-number / 10000-series illustrative PNG inventory.
-- Exact source: public.manual_timetable_templates for 'Koizumi' (not KoizumiBranch).
-- BOTH calendars carry 701E–762E and 764E. Source timetable is undated;
-- 2026-11 is the PAGE REFERENCE EDITION, NOT a validated source revision date.
-- https://www.tobu.co.jp/corporation/rail/vehicles/ supports the fleet models,
-- NOT the actual vehicle or formation operated by a particular train number.
CREATE TABLE IF NOT EXISTS public.published_tobu_koizumi_2611_png_bands (
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Koizumi'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
  ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 min_number integer NOT NULL CHECK(min_number=701),
 max_number integer NOT NULL CHECK(max_number=764),
 exact_train_numbers text[] NOT NULL CHECK(cardinality(exact_train_numbers)=63),
 source_template_count integer NOT NULL CHECK(source_template_count=63),
 source_railway text NOT NULL CHECK(source_railway='odpt.Railway:Tobu.Koizumi'),
 source_scope text NOT NULL CHECK(source_scope='historical-undated'),
 model_family text NOT NULL CHECK(model_family='10000系列'),
 candidate_models text[] NOT NULL CHECK(cardinality(candidate_models)=3),
 illustration_model text NOT NULL,
 png_reference text NOT NULL,
 source_url text NOT NULL CHECK(source_url LIKE 'https://www.tobu.co.jp/%'),
 authorizes_dated_service boolean NOT NULL DEFAULT false CHECK(NOT authorizes_dated_service),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 PRIMARY KEY(edition,line_key,calendar_urn)
);
ALTER TABLE public.published_tobu_koizumi_2611_png_bands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_tobu_koizumi_2611_png_bands FROM anon,authenticated;
COMMENT ON TABLE public.published_tobu_koizumi_2611_png_bands IS
 'Historical source 701E-762E/764E in both calendars; the 10030-50 PNG is a visual representative of the mixed 10000-series family only, never actual carset evidence.';
DO $koizumi$
DECLARE expected text[]; actual text[]; total integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('tobu-koizumi-2611-png-number-bands'));
 SELECT array_agg(n||'E' ORDER BY n) INTO expected
 FROM (SELECT generate_series(701,762) AS n UNION ALL SELECT 764 AS n) numbers;
 SELECT count(*) INTO total FROM public.manual_timetable_templates WHERE line_key='Koizumi';
 IF total<>126 THEN RAISE EXCEPTION 'Koizumi source template count changed: %',total; END IF;
 IF EXISTS (
  SELECT 1 FROM public.manual_timetable_templates
  WHERE line_key='Koizumi' AND (
   vehicle_type_label IS DISTINCT FROM '10000系列'
   OR railway_urn IS DISTINCT FROM 'odpt.Railway:Tobu.Koizumi'
   OR train_type_urn IS DISTINCT FROM 'odpt.TrainType:Tobu.Local'
   OR source_revision_date IS NOT NULL OR operating_dates IS NOT NULL
   OR (train_number::text ~ '^[0-9]{3}E$') IS NOT TRUE
   OR CASE WHEN substring(train_number FROM '^[0-9]{3}')::int%2=1
     THEN direction_urn<>'odpt.RailDirection:Outbound'
     ELSE direction_urn<>'odpt.RailDirection:Inbound' END))
 THEN RAISE EXCEPTION 'Koizumi source evidence no longer has the audited family/line/calendar scope'; END IF;
 FOR actual IN
  SELECT array_agg(train_number ORDER BY train_number)
  FROM public.manual_timetable_templates WHERE line_key='Koizumi'
  GROUP BY calendar_urn
 LOOP
  IF actual<>expected THEN RAISE EXCEPTION 'Koizumi number roster drift: %',actual; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT calendar_urn) FROM public.manual_timetable_templates
     WHERE line_key='Koizumi')<>2
 THEN RAISE EXCEPTION 'Koizumi calendar scope changed'; END IF;
 INSERT INTO public.published_tobu_koizumi_2611_png_bands
  (edition,line_key,calendar_urn,min_number,max_number,exact_train_numbers,
   source_template_count,source_railway,source_scope,model_family,
   candidate_models,illustration_model,png_reference,source_url)
 SELECT '2611','Koizumi',calendar_urn,701,764,
  array_agg(train_number ORDER BY train_number),count(*)::integer,
  'odpt.Railway:Tobu.Koizumi','historical-undated','10000系列',
  ARRAY['東武10000型','東武10030型','東武10030型50番台']::text[],
  '東武10030型50番台（小泉線代表）',
  '../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png',
  'https://www.tobu.co.jp/corporation/rail/vehicles/'
 FROM public.manual_timetable_templates WHERE line_key='Koizumi'
 GROUP BY calendar_urn
 ON CONFLICT(edition,line_key,calendar_urn) DO UPDATE SET
  exact_train_numbers=excluded.exact_train_numbers,
  source_template_count=excluded.source_template_count,
  model_family=excluded.model_family,
  candidate_models=excluded.candidate_models,
  illustration_model=excluded.illustration_model,
  png_reference=excluded.png_reference;
 IF (SELECT count(*) FROM public.published_tobu_koizumi_2611_png_bands
   WHERE line_key='Koizumi')<>2 THEN RAISE EXCEPTION 'Koizumi PNG rows missing'; END IF;
END
$koizumi$;
