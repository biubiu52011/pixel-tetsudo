-- Source-scoped, exact-number JR-Central ChuoCentral 2611 sample.
-- Two planned trains (1001M, 1011M), split into Weekday/SaturdayHoliday
-- dates for the existing finite-date importer. Sampled five stop events only;
-- no fictional intermediates, live cars or complete all-day timetable.
-- Provenance: https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1001m-1011m-2611-original-plan-facts.md
WITH service_days AS (
  SELECT d::date AS day,
    CASE WHEN extract(isodow FROM d) IN (6,7) OR d::date IN
      ('2026-11-03'::date,'2026-11-23'::date)
    THEN 'odpt.Calendar:SaturdayHoliday'
    ELSE 'odpt.Calendar:Weekday' END AS calendar_urn
  FROM generate_series('2026-11-01'::date,
    '2026-11-30'::date,'1 day'::interval) d
), day_groups AS (
  SELECT calendar_urn,jsonb_agg(to_char(day,'YYYY-MM-DD') ORDER BY day) days
  FROM service_days GROUP BY calendar_urn
), trains AS (
  SELECT source.train_number, source.stops, day_groups.calendar_urn,
    jsonb_build_object(
      'train_number',source.train_number,
      'calendar_urn',day_groups.calendar_urn,
      'direction_urn','odpt.RailDirection:Outbound',
      'train_type','LimitedExpress',
      'operating_dates',day_groups.days,
      'stops',source.stops
    ) trip
  FROM (VALUES
    ('1001M',jsonb_build_array(
      jsonb_build_object('station_id','Nagoya','arrival',NULL,'departure','07:00'),
      jsonb_build_object('station_id','JRC-ChuoCentral-013','arrival','07:22','departure','07:23'),
      jsonb_build_object('station_id','JRC-ChuoCentral-020','arrival','07:48','departure','07:49'),
      jsonb_build_object('station_id','JRC-ChuoCentral-031','arrival','08:28','departure','08:29'),
      jsonb_build_object('station_id','Shiojiri','arrival','08:57','departure',NULL)
    )),
    ('1011M',jsonb_build_array(
      jsonb_build_object('station_id','Nagoya','arrival',NULL,'departure','12:00'),
      jsonb_build_object('station_id','JRC-ChuoCentral-013','arrival','12:23','departure','12:23'),
      jsonb_build_object('station_id','JRC-ChuoCentral-020','arrival','12:48','departure','12:49'),
      jsonb_build_object('station_id','JRC-ChuoCentral-031','arrival','13:24','departure','13:25'),
      jsonb_build_object('station_id','Shiojiri','arrival','13:53','departure',NULL)
    ))
  ) AS source(train_number,stops) CROSS JOIN day_groups
), payload AS (
  SELECT jsonb_build_object(
    'source',jsonb_build_object(
      'url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1001m-1011m-2611-original-plan-facts.md',
      'authorization','original_compilation',
      'authorization_evidence_url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1001m-1011m-2611-original-plan-facts.md',
      'edition_date','2026-11-01'
    ),
    'trains',jsonb_agg(trip ORDER BY train_number,calendar_urn)
  ) AS plan
  FROM trains
)
SELECT * FROM public.import_jr_central_authorized_plan(
  'ChuoCentral',(SELECT plan FROM payload));
