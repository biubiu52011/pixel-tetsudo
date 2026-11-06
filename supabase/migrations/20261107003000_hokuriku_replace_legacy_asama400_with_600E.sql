-- November 2611: legacy Hokuriku 06:00->07:40 あさま400
-- no longer exists as that service. The current corresponding
-- Nagano->Tokyo morning planned slot is あさま600, formal 600E,
-- departing 06:02 and arriving 07:40. This is a SCHEDULE-SLOT
-- replacement, not an assertion of shared historical train identity.
-- The old Annaka-Haruna stop is absent in 600E. Published 2611
-- 038992 variant is used for the baseline (Ueno 07:35/07:36);
-- 038991 has a one-minute different Ueno variant on some dates.
-- Preserve unchanged original source_path as old imported provenance.
-- No guessed E7 or W7 physical model / PNG.
BEGIN;
SELECT pg_advisory_xact_lock(2611,600);
DO $hokuriku_reconcile_asama600$
DECLARE
  template_ bigint; tt_ bigint; n int; i int; route_ text;
  stop_names text[]:=ARRAY['Nagano','Ueda','Ueda','Sakudaira','Sakudaira','Karuizawa','Karuizawa','Takasaki','Takasaki','Omiya','Omiya','Ueno','Ueno','Tokyo']::text[];
  events text[]:=ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[];
  clocks text[]:=ARRAY['06:02','06:13','06:14','06:24','06:24','06:33','06:34','06:49','06:50','07:14','07:15','07:35','07:36','07:40']::text[];
BEGIN
 SELECT m.id,mem.timetable_id INTO STRICT template_,tt_
 FROM manual_timetable_templates m
 JOIN train_timetable_members mem ON mem.source_template_id=m.id
   AND mem.member_role='primary' AND mem.first_stop_sequence=0
   AND mem.last_stop_sequence=8 AND mem.stop_offset=0 AND mem.merge_first_stop=false
 JOIN train_timetables t ON t.id=mem.timetable_id
   AND t.group_evidence='source_only' AND t.canonical_key='source:1995'
   AND t.primary_train_number='あさま400'
 WHERE m.id=1995 AND m.train_number='あさま400'
 AND m.line_key='HokurikuShinkansen'
 AND m.railway_urn='odpt.Railway:JR-East.HokurikuShinkansen'
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:Inbound'
 AND m.destination_urns=ARRAY['odpt.Station:JR-East.HokurikuShinkansen.Tokyo']::text[]
 AND m.source_path='data/timetables/HokurikuShinkansen-manual.js'
 AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=t.id)=1;
 IF EXISTS(select 1 from manual_timetable_templates m
   WHERE m.line_key='HokurikuShinkansen' AND m.calendar_urn='odpt.Calendar:Weekday'
   AND m.train_number='あさま600' AND m.id<>template_)
  THEN RAISE EXCEPTION 'Asama600 already exists'; END IF;
 IF EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611'
   AND e.source_template_id=template_)
  OR EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v WHERE v.timetable_id=tt_)
  THEN RAISE EXCEPTION 'Old Asama400 has other official evidence'; END IF;
 route_:=(SELECT string_agg(regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),
   '^.*[.]','')||'@'||coalesce(s.departure_clock,s.arrival_clock),'|' ORDER BY s.stop_sequence)
   FROM manual_timetable_template_stops s WHERE s.template_id=template_);
 IF route_<>'Nagano@06:00|Ueda@06:12|Sakudaira@06:22|Karuizawa@06:31|Annaka-Haruna@06:42|Takasaki@06:50|Omiya@07:14|Ueno@07:34|Tokyo@07:40'
 OR (select count(*) from train_timetable_stops z
    WHERE z.timetable_id=tt_ AND z.source_template_id=template_)<>9
 THEN RAISE EXCEPTION 'Old Asama400 source or view unexpectedly changed'; END IF;
 IF array_length(stop_names,1)<>14 OR array_length(events,1)<>14
    OR array_length(clocks,1)<>14
 THEN RAISE EXCEPTION 'Asama600 official event sequence malformed'; END IF;
 DELETE FROM manual_timetable_template_stops s WHERE s.template_id=template_;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>9 THEN RAISE EXCEPTION 'Asama original event deletion mismatch'; END IF;
 FOR i IN 1..14 LOOP
  IF NOT EXISTS (SELECT 1 FROM stations WHERE id=stop_names[i])
  THEN RAISE EXCEPTION 'Official Asama station does not exist: %',stop_names[i]; END IF;
  IF events[i]='A' THEN
   INSERT INTO manual_timetable_template_stops
   (template_id,stop_sequence,arrival_station_urn,arrival_clock)
   VALUES (template_,i-1,'odpt.Station:JR-East.HokurikuShinkansen.'||stop_names[i],clocks[i]);
  ELSIF events[i]='D' THEN
   INSERT INTO manual_timetable_template_stops
   (template_id,stop_sequence,departure_station_urn,departure_clock)
   VALUES (template_,i-1,'odpt.Station:JR-East.HokurikuShinkansen.'||stop_names[i],clocks[i]);
  ELSE RAISE EXCEPTION 'Unknown Asama event %',events[i]; END IF;
 END LOOP;
 UPDATE train_timetable_members mem SET last_stop_sequence=13
  WHERE mem.timetable_id=tt_ AND mem.source_template_id=template_
  AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=8;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Asama canonical stop boundary not updated'; END IF;
 UPDATE manual_timetable_templates m SET train_number='あさま600'
  WHERE m.id=template_ AND m.train_number='あさま400';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Asama name replacement failed'; END IF;
 UPDATE train_timetables t SET primary_train_number='あさま600'
  WHERE t.id=tt_ AND t.primary_train_number='あさま400';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Canonical name replacement failed'; END IF;
 IF (SELECT count(*) FROM train_timetable_stops z
  WHERE z.source_template_id=template_ AND z.timetable_id=tt_)<>14
 OR (SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')||'@'||
    coalesce(z.arrival_clock,z.departure_clock),'|' ORDER BY z.stop_sequence)
    FROM train_timetable_stops z WHERE z.timetable_id=tt_ AND z.source_template_id=template_) <>
    (SELECT string_agg(stop_names[j]||'@'||clocks[j],'|' ORDER BY j) FROM generate_subscripts(stop_names,1) j)
 THEN RAISE EXCEPTION 'Asama600 source VIEW official events mismatch'; END IF;
 INSERT INTO published_train_number_evidence
   (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
     official_source_url,verification_scope)
 VALUES ('2611','HokurikuShinkansen','odpt.Calendar:Weekday',
   'odpt.RailDirection:Inbound','600E',template_,
   'https://timetables.jreast.co.jp/2611/train/035/038992.html','train_number_only');
 IF (SELECT count(*) FROM published_train_number_evidence e
  WHERE e.edition='2611' AND e.source_template_id=template_
    AND e.train_number='600E' AND e.line_key='HokurikuShinkansen'
    AND e.calendar_urn='odpt.Calendar:Weekday'
    AND e.direction_urn='odpt.RailDirection:Inbound')<>1
 THEN RAISE EXCEPTION 'Asama600 full number missing'; END IF;
END $hokuriku_reconcile_asama600$;
COMMIT;