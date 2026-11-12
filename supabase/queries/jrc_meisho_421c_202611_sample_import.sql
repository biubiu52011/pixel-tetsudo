-- Reproducible, idempotent first JR-Central conventional SQL *planned*
-- journey: Meisho 421C, one sample (not a full-day 13-line database).
-- 2026-11 daily scheduled endpoints + Iejo turn; exact train number
-- cross-checked and facts independently collated in:
-- https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-meisho-421c-202611-original-plan-facts.md
-- The remaining 12 intermediate-station stop clocks are deliberately absent;
-- no artificial time/actual carset/formation, or all-day-acceptance asserted.
WITH service_days AS (
  SELECT d::date AS day,
    CASE WHEN extract(isodow FROM d) IN (6,7) OR d::date IN
       ('2026-11-03'::date,'2026-11-23'::date)
     THEN 'odpt.Calendar:SaturdayHoliday'
     ELSE 'odpt.Calendar:Weekday' END AS calendar_urn
  FROM generate_series('2026-11-01'::date,
       '2026-11-30'::date,'1 day'::interval) AS d
), variants AS (
  SELECT calendar_urn,
    jsonb_build_object(
      'train_number','421C',
      'calendar_urn',calendar_urn,
      'direction_urn','odpt.RailDirection:Outbound',
      'train_type','Local',
      'operating_dates',jsonb_agg(to_char(day,'YYYY-MM-DD') ORDER BY day),
      'stops',jsonb_build_array(
        jsonb_build_object('station_id','JRC-KiseiCentral-008',
          'arrival',NULL,'departure','19:01'),
        jsonb_build_object('station_id','JRC-Meisho-010',
          'arrival','19:38','departure','19:51'),
        jsonb_build_object('station_id','JRC-Meisho-015',
          'arrival','20:26','departure',NULL)
      )
    ) AS trip
  FROM service_days GROUP BY calendar_urn
), payload AS (
  SELECT jsonb_build_object(
    'source',jsonb_build_object(
      'url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-meisho-421c-202611-original-plan-facts.md',
      'authorization','original_compilation',
      'authorization_evidence_url','https://github.com/biubiu52011/pixel-tetsudo/blob/main/docs/audits/jrc-meisho-421c-202611-original-plan-facts.md',
      'edition_date','2026-11-01'
    ),
    'trains',jsonb_agg(trip ORDER BY calendar_urn DESC)
  ) AS plan
  FROM variants
)
SELECT * FROM public.import_jr_central_authorized_plan(
   'Meisho',(SELECT plan FROM payload));
