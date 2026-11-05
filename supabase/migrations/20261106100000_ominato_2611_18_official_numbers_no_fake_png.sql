-- 2026-11 JR East 大湊線: 18 official numbered services x two calendars.
-- Existing SQL: 40 templates, 36 November active + four December-only
-- (9227D/9236D). "しもきた" 322x/323x are Rapid, not source Local.
-- KiHa100 is a model reference; no appropriate JR East KiHa100 PNG exists.
-- Official: https://timetables.jreast.co.jp/2611/timetable-v/278u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/278u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/278d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/278d2.html
BEGIN;
SELECT pg_advisory_xact_lock(2611278);
CREATE TEMP TABLE _ominato_2611_source ON COMMIT DROP AS
SELECT t.*, ARRAY(SELECT split_part(
 coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
 FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id
 ORDER BY s.stop_sequence) AS stop_keys
FROM public.manual_timetable_templates t
WHERE t.line_key='Ominato' AND
 t.railway_urn='odpt.Railway:JR-East.Ominato';
DO $preflight$
BEGIN
 IF (SELECT count(*) FROM _ominato_2611_source)<>40 OR
 (SELECT count(*) FROM _ominato_2611_source WHERE train_number IN ('221D','223D','229D','235D','237D','239D','241D','3225D','3233D','222D','224D','234D','238D','240D','242D','3226D','3228D','3230D'))<>36 OR
 (SELECT count(*) FROM _ominato_2611_source WHERE train_number IN ('9227D','9236D'))<>4 OR
 EXISTS(SELECT 1 FROM _ominato_2611_source WHERE
 source_occurrence<>0 OR train_type_urn<>'odpt.TrainType:JR-East.Local' OR
 vehicle_type_label<>'キハ100系 / キハ110系' OR
 (substring(train_number FROM '^([0-9]+)')::int%2) <>
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END OR
 cardinality(stop_keys)<4 OR cardinality(stop_keys)>11 OR
 stop_keys[1]<>CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'Ominato' ELSE 'Noheji' END OR
 stop_keys[cardinality(stop_keys)]<>CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'Noheji' ELSE 'Ominato' END)
 THEN RAISE EXCEPTION 'Ominato SQL source changed; review number evidence';
 END IF;
END $preflight$;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611','Ominato',calendar_urn,direction_urn,train_number,
 id,'https://timetables.jreast.co.jp/2611/timetable-v/278'||
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||
 '.html','train_number_only'
FROM _ominato_2611_source WHERE train_number IN ('221D','223D','229D','235D','237D','239D','241D','3225D','3233D','222D','224D','234D','238D','240D','242D','3226D','3228D','3230D')
ON CONFLICT DO NOTHING;
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM public.published_train_number_evidence
 WHERE edition='2611' AND line_key='Ominato')<>36 OR
 EXISTS(SELECT 1 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates t ON t.id=e.source_template_id
 WHERE e.edition='2611' AND e.line_key='Ominato' AND
 (t.line_key<>'Ominato' OR t.calendar_urn<>e.calendar_urn OR
  t.direction_urn<>e.direction_urn OR t.train_number<>e.train_number))
 THEN RAISE EXCEPTION 'Ominato 2611 evidence count/source mismatch'; END IF;
END $postflight$;
COMMIT;
