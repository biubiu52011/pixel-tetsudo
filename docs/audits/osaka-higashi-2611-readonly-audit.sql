-- Read-only audit. Run against the owning Supabase database; no migration,
-- writes, timetable reconstruction or physical-carset assertions.
BEGIN TRANSACTION READ ONLY;

WITH sources AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
   count(*) stop_count,
   max(s.arrival_clock) arrival_clock,max(s.departure_clock) departure_clock,
   min(coalesce(s.departure_station_urn,s.arrival_station_urn)) station_urn
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi'
 GROUP BY m.id
)
SELECT calendar_urn,count(*) source_count,
 count(*) FILTER(WHERE stop_count=1) single_station_fragments,
 count(*) FILTER(WHERE stop_count>=2) multi_station_sources,
 count(*) FILTER(WHERE stop_count=1 AND arrival_clock IS NOT NULL) arrival_fragments,
 count(*) FILTER(WHERE stop_count=1 AND departure_clock IS NOT NULL) departure_fragments,
 count(*) FILTER(WHERE stop_count=1 AND
   direction_urn='odpt.RailDirection:Inbound' AND
   station_urn='odpt.Station:JR-West.OsakaHigashi.Shin-Osaka') shinosaka_inbound_fragments,
 count(*) FILTER(WHERE train_number ~ '^908[12]M(H)?$') seasonal_source_count
FROM sources GROUP BY calendar_urn ORDER BY calendar_urn;

-- Reproduce the historical 25 candidates using EITHER matching arrival
-- OR matching departure. Requiring BOTH gives one pair, a different metric.
-- All are different train numbers: even both clocks would not prove identity.
WITH sources AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
   count(*) stop_count,max(s.arrival_clock) arrival_clock,
   max(s.departure_clock) departure_clock
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi' GROUP BY m.id
), candidates AS (
 SELECT DISTINCT f.id fragment_id,m.id candidate_id,
   (f.arrival_clock IS NOT NULL AND f.arrival_clock=s.arrival_clock) arrival_match,
   (f.departure_clock IS NOT NULL AND f.departure_clock=s.departure_clock) departure_match
 FROM sources f
 JOIN public.manual_timetable_templates m ON m.line_key='OsakaHigashi'
   AND m.calendar_urn=f.calendar_urn AND m.direction_urn=f.direction_urn
   AND m.train_number<>f.train_number
 JOIN sources whole ON whole.id=m.id AND whole.stop_count>=2
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE f.stop_count=1
   AND coalesce(s.departure_station_urn,s.arrival_station_urn)=
     'odpt.Station:JR-West.OsakaHigashi.Shin-Osaka'
   AND ((f.arrival_clock IS NOT NULL AND f.arrival_clock=s.arrival_clock)
     OR (f.departure_clock IS NOT NULL AND f.departure_clock=s.departure_clock))
)
SELECT count(*) candidate_pairs,count(DISTINCT fragment_id) candidate_fragments,
 count(*) FILTER(WHERE arrival_match AND departure_match) both_clock_matches
FROM candidates;

SELECT calendar_urn,count(*) clock_proofs,
 count(*) FILTER(WHERE verified_source_match) matching_fingerprints
FROM public.published_jrwest_osaka_higashi_2611_clock_evidence
GROUP BY calendar_urn ORDER BY calendar_urn;

SELECT source_template_id,source_train_number,published_train_number,
 verified_source_match,model_family,car_count,authorizes_png,valid_from,valid_to
FROM public.published_jrwest_osaka_higashi_2611_special_clock_evidence
ORDER BY source_template_id;
COMMIT;
