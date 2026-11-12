-- Source-scoped, exact-number JR-Central ChuoCentral 2611 INBOUND samples.
-- Two planned trains (1002M, 1026M), 19 Weekday + 11 holiday November
-- service dates, five verified stop events per source, no actual train tracking.
-- Independently authored timetable fact subset/provenance: https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1002m-1026m-2611-original-plan-facts.md
WITH service_days AS (
 SELECT d::date day,
 CASE WHEN extract(isodow FROM d) IN (6,7) OR d::date IN
   ('2026-11-03'::date,'2026-11-23'::date)
 THEN 'odpt.Calendar:SaturdayHoliday'
 ELSE 'odpt.Calendar:Weekday' END calendar_urn
 FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day'::interval) d
), day_groups AS (
 SELECT calendar_urn,jsonb_agg(to_char(day,'YYYY-MM-DD') ORDER BY day) days
 FROM service_days GROUP BY calendar_urn
), trains AS (
 SELECT sources.train_number,groups.calendar_urn,
 jsonb_build_object(
  'train_number',sources.train_number,
  'calendar_urn',groups.calendar_urn,
  'direction_urn','odpt.RailDirection:Inbound',
  'train_type','LimitedExpress',
  'operating_dates',groups.days,
  'stops',sources.stops
 ) trip
 FROM (VALUES
  ('1002M',jsonb_build_array(
   jsonb_build_object('station_id','Shiojiri','arrival',NULL,'departure','07:14'),
   jsonb_build_object('station_id','JRC-ChuoCentral-031','arrival','07:42','departure','07:43'),
   jsonb_build_object('station_id','JRC-ChuoCentral-020','arrival','08:21','departure','08:22'),
   jsonb_build_object('station_id','JRC-ChuoCentral-013','arrival','08:50','departure','08:51'),
   jsonb_build_object('station_id','Nagoya','arrival','09:18','departure',NULL)
  )),
  ('1026M',jsonb_build_array(
   jsonb_build_object('station_id','Shiojiri','arrival',NULL,'departure','20:43'),
   jsonb_build_object('station_id','JRC-ChuoCentral-031','arrival','21:10','departure','21:11'),
   jsonb_build_object('station_id','JRC-ChuoCentral-020','arrival','21:47','departure','21:48'),
   jsonb_build_object('station_id','JRC-ChuoCentral-013','arrival','22:16','departure','22:17'),
   jsonb_build_object('station_id','Nagoya','arrival','22:42','departure',NULL)
  ))
 ) AS sources(train_number,stops) CROSS JOIN day_groups groups
), payload AS (
 SELECT jsonb_build_object(
  'source',jsonb_build_object(
   'url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1002m-1026m-2611-original-plan-facts.md',
   'authorization','original_compilation',
   'authorization_evidence_url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-chuo-1002m-1026m-2611-original-plan-facts.md',
   'edition_date','2026-11-01'
  ),'trains',jsonb_agg(trip ORDER BY train_number,calendar_urn)
 ) plan FROM trains
)
SELECT * FROM public.import_jr_central_authorized_plan(
 'ChuoCentral',(SELECT plan FROM payload));
