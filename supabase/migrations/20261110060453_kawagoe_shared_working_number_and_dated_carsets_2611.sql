-- Source-linked Kawagoe west shared working & dated reported formations.
-- 2026-03-14 fan working C-grade; 2026-11-09/10 crowd reports C-grade.
-- 186 distinct ODPT H trains => one duty each per calendar; ZERO fixed E231/209
-- mapping. Only date-limited reported assignments enable illustrative artwork.
BEGIN;
SELECT pg_advisory_xact_lock(2611527);
CREATE TEMP TABLE _kw_ops(cal text,no text,op text) ON COMMIT DROP;
INSERT INTO _kw_ops VALUES
('odpt.Calendar:SaturdayHoliday','1065H','65'),
('odpt.Calendar:SaturdayHoliday','1066H','67'),
('odpt.Calendar:SaturdayHoliday','1069H','69'),
('odpt.Calendar:SaturdayHoliday','1164H','65'),
('odpt.Calendar:SaturdayHoliday','1167H','67'),
('odpt.Calendar:SaturdayHoliday','1174H','75'),
('odpt.Calendar:SaturdayHoliday','1178H','79'),
('odpt.Calendar:SaturdayHoliday','1179H','79'),
('odpt.Calendar:SaturdayHoliday','1268H','69'),
('odpt.Calendar:SaturdayHoliday','1270H','71'),
('odpt.Calendar:SaturdayHoliday','1275H','75'),
('odpt.Calendar:SaturdayHoliday','1279H','79'),
('odpt.Calendar:SaturdayHoliday','1365H','65'),
('odpt.Calendar:SaturdayHoliday','1366H','67'),
('odpt.Calendar:SaturdayHoliday','1369H','69'),
('odpt.Calendar:SaturdayHoliday','1378H','79'),
('odpt.Calendar:SaturdayHoliday','1464H','65'),
('odpt.Calendar:SaturdayHoliday','1467H','67'),
('odpt.Calendar:SaturdayHoliday','1471H','71'),
('odpt.Calendar:SaturdayHoliday','1474H','75'),
('odpt.Calendar:SaturdayHoliday','1568H','69'),
('odpt.Calendar:SaturdayHoliday','1570H','71'),
('odpt.Calendar:SaturdayHoliday','1575H','75'),
('odpt.Calendar:SaturdayHoliday','1579H','79'),
('odpt.Calendar:SaturdayHoliday','1665H','65'),
('odpt.Calendar:SaturdayHoliday','1666H','67'),
('odpt.Calendar:SaturdayHoliday','1669H','69'),
('odpt.Calendar:SaturdayHoliday','1673H','73'),
('odpt.Calendar:SaturdayHoliday','1674H','75'),
('odpt.Calendar:SaturdayHoliday','1764H','65'),
('odpt.Calendar:SaturdayHoliday','1767H','67'),
('odpt.Calendar:SaturdayHoliday','1768H','69'),
('odpt.Calendar:SaturdayHoliday','1769H','69'),
('odpt.Calendar:SaturdayHoliday','1771H','71'),
('odpt.Calendar:SaturdayHoliday','1772H','73'),
('odpt.Calendar:SaturdayHoliday','1860H','61'),
('odpt.Calendar:SaturdayHoliday','1861H','61'),
('odpt.Calendar:SaturdayHoliday','1873H','73'),
('odpt.Calendar:SaturdayHoliday','1875H','75'),
('odpt.Calendar:SaturdayHoliday','1878H','79'),
('odpt.Calendar:SaturdayHoliday','1960H','61'),
('odpt.Calendar:SaturdayHoliday','1965H','65'),
('odpt.Calendar:SaturdayHoliday','1966H','67'),
('odpt.Calendar:SaturdayHoliday','1968H','69'),
('odpt.Calendar:SaturdayHoliday','1974H','75'),
('odpt.Calendar:SaturdayHoliday','1979H','79'),
('odpt.Calendar:SaturdayHoliday','2061H','61'),
('odpt.Calendar:SaturdayHoliday','2064H','65'),
('odpt.Calendar:SaturdayHoliday','2067H','67'),
('odpt.Calendar:SaturdayHoliday','2072H','73'),
('odpt.Calendar:SaturdayHoliday','2078H','79'),
('odpt.Calendar:SaturdayHoliday','2079H','79'),
('odpt.Calendar:SaturdayHoliday','2166H','67'),
('odpt.Calendar:SaturdayHoliday','2169H','69'),
('odpt.Calendar:SaturdayHoliday','2173H','73'),
('odpt.Calendar:SaturdayHoliday','2174H','75'),
('odpt.Calendar:SaturdayHoliday','2175H','75'),
('odpt.Calendar:SaturdayHoliday','2260H','61'),
('odpt.Calendar:SaturdayHoliday','2267H','67'),
('odpt.Calendar:SaturdayHoliday','2275H','75'),
('odpt.Calendar:SaturdayHoliday','2278H','79'),
('odpt.Calendar:SaturdayHoliday','2379H','79'),
('odpt.Calendar:SaturdayHoliday','2461H','61'),
('odpt.Calendar:SaturdayHoliday','460H','61'),
('odpt.Calendar:SaturdayHoliday','562H','63'),
('odpt.Calendar:SaturdayHoliday','564H','65'),
('odpt.Calendar:SaturdayHoliday','573H','73'),
('odpt.Calendar:SaturdayHoliday','575H','75'),
('odpt.Calendar:SaturdayHoliday','578H','79'),
('odpt.Calendar:SaturdayHoliday','661H','61'),
('odpt.Calendar:SaturdayHoliday','663H','63'),
('odpt.Calendar:SaturdayHoliday','666H','67'),
('odpt.Calendar:SaturdayHoliday','668H','69'),
('odpt.Calendar:SaturdayHoliday','670H','71'),
('odpt.Calendar:SaturdayHoliday','674H','75'),
('odpt.Calendar:SaturdayHoliday','675H','75'),
('odpt.Calendar:SaturdayHoliday','677H','77'),
('odpt.Calendar:SaturdayHoliday','760H','61'),
('odpt.Calendar:SaturdayHoliday','765H','65'),
('odpt.Calendar:SaturdayHoliday','769H','69'),
('odpt.Calendar:SaturdayHoliday','776H','77'),
('odpt.Calendar:SaturdayHoliday','778H','79'),
('odpt.Calendar:SaturdayHoliday','779H','79'),
('odpt.Calendar:SaturdayHoliday','864H','65'),
('odpt.Calendar:SaturdayHoliday','867H','67'),
('odpt.Calendar:SaturdayHoliday','871H','71'),
('odpt.Calendar:SaturdayHoliday','872H','73'),
('odpt.Calendar:SaturdayHoliday','874H','75'),
('odpt.Calendar:SaturdayHoliday','879H','79'),
('odpt.Calendar:SaturdayHoliday','961H','61'),
('odpt.Calendar:SaturdayHoliday','968H','69'),
('odpt.Calendar:SaturdayHoliday','975H','75'),
('odpt.Calendar:SaturdayHoliday','978H','79'),
('odpt.Calendar:Weekday','1060H','61'),
('odpt.Calendar:Weekday','1065H','65'),
('odpt.Calendar:Weekday','1066H','67'),
('odpt.Calendar:Weekday','1069H','69'),
('odpt.Calendar:Weekday','1161H','61'),
('odpt.Calendar:Weekday','1168H','69'),
('odpt.Calendar:Weekday','1175H','75'),
('odpt.Calendar:Weekday','1178H','79'),
('odpt.Calendar:Weekday','1264H','65'),
('odpt.Calendar:Weekday','1267H','67'),
('odpt.Calendar:Weekday','1274H','75'),
('odpt.Calendar:Weekday','1279H','79'),
('odpt.Calendar:Weekday','1360H','61'),
('odpt.Calendar:Weekday','1365H','65'),
('odpt.Calendar:Weekday','1366H','67'),
('odpt.Calendar:Weekday','1369H','69'),
('odpt.Calendar:Weekday','1461H','61'),
('odpt.Calendar:Weekday','1468H','69'),
('odpt.Calendar:Weekday','1475H','75'),
('odpt.Calendar:Weekday','1478H','79'),
('odpt.Calendar:Weekday','1564H','65'),
('odpt.Calendar:Weekday','1567H','67'),
('odpt.Calendar:Weekday','1574H','75'),
('odpt.Calendar:Weekday','1579H','79'),
('odpt.Calendar:Weekday','1660H','61'),
('odpt.Calendar:Weekday','1665H','65'),
('odpt.Calendar:Weekday','1669H','69'),
('odpt.Calendar:Weekday','1677H','77'),
('odpt.Calendar:Weekday','1678H','79'),
('odpt.Calendar:Weekday','1761H','61'),
('odpt.Calendar:Weekday','1764H','65'),
('odpt.Calendar:Weekday','1768H','69'),
('odpt.Calendar:Weekday','1775H','75'),
('odpt.Calendar:Weekday','1776H','77'),
('odpt.Calendar:Weekday','1777H','77'),
('odpt.Calendar:Weekday','1860H','61'),
('odpt.Calendar:Weekday','1866H','67'),
('odpt.Calendar:Weekday','1869H','69'),
('odpt.Calendar:Weekday','1874H','75'),
('odpt.Calendar:Weekday','1876H','77'),
('odpt.Calendar:Weekday','1877H','77'),
('odpt.Calendar:Weekday','1879H','79'),
('odpt.Calendar:Weekday','1965H','65'),
('odpt.Calendar:Weekday','1967H','67'),
('odpt.Calendar:Weekday','1968H','69'),
('odpt.Calendar:Weekday','1975H','75'),
('odpt.Calendar:Weekday','1978H','79'),
('odpt.Calendar:Weekday','2060H','61'),
('odpt.Calendar:Weekday','2061H','61'),
('odpt.Calendar:Weekday','2064H','65'),
('odpt.Calendar:Weekday','2076H','77'),
('odpt.Calendar:Weekday','2079H','79'),
('odpt.Calendar:Weekday','2161H','61'),
('odpt.Calendar:Weekday','2166H','67'),
('odpt.Calendar:Weekday','2169H','69'),
('odpt.Calendar:Weekday','2174H','75'),
('odpt.Calendar:Weekday','2177H','77'),
('odpt.Calendar:Weekday','2260H','61'),
('odpt.Calendar:Weekday','2267H','67'),
('odpt.Calendar:Weekday','2275H','75'),
('odpt.Calendar:Weekday','2278H','79'),
('odpt.Calendar:Weekday','2379H','79'),
('odpt.Calendar:Weekday','2461H','61'),
('odpt.Calendar:Weekday','460H','61'),
('odpt.Calendar:Weekday','562H','63'),
('odpt.Calendar:Weekday','564H','65'),
('odpt.Calendar:Weekday','573H','73'),
('odpt.Calendar:Weekday','575H','75'),
('odpt.Calendar:Weekday','578H','79'),
('odpt.Calendar:Weekday','661H','61'),
('odpt.Calendar:Weekday','665H','65'),
('odpt.Calendar:Weekday','668H','69'),
('odpt.Calendar:Weekday','672H','73'),
('odpt.Calendar:Weekday','674H','75'),
('odpt.Calendar:Weekday','677H','77'),
('odpt.Calendar:Weekday','679H','79'),
('odpt.Calendar:Weekday','760H','61'),
('odpt.Calendar:Weekday','763H','63'),
('odpt.Calendar:Weekday','766H','67'),
('odpt.Calendar:Weekday','769H','69'),
('odpt.Calendar:Weekday','770H','71'),
('odpt.Calendar:Weekday','773H','73'),
('odpt.Calendar:Weekday','861H','61'),
('odpt.Calendar:Weekday','868H','69'),
('odpt.Calendar:Weekday','871H','71'),
('odpt.Calendar:Weekday','872H','73'),
('odpt.Calendar:Weekday','875H','75'),
('odpt.Calendar:Weekday','876H','77'),
('odpt.Calendar:Weekday','878H','79'),
('odpt.Calendar:Weekday','964H','65'),
('odpt.Calendar:Weekday','967H','67'),
('odpt.Calendar:Weekday','974H','75'),
('odpt.Calendar:Weekday','979H','79');
CREATE TEMP TABLE _kw_obs(day date,op text,model text,carset text,until_time time,url text) ON COMMIT DROP;
INSERT INTO _kw_obs VALUES
('2026-11-10'::date,'61','209系3500番台','ハエ51',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'63','E231系3000番台','ハエ41',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'65','E231系3000番台','ハエ43',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'67','209系3500番台','ハエ53',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'69','E231系3000番台','ハエ45',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'71','209系3500番台','ハエ55','12:00'::time,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'73','E231系3000番台','ハエ44',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-10'::date,'79','209系3500番台','ハエ54',NULL,'https://loo-ool.com/rail/W/00/20261110/'),
('2026-11-09'::date,'61','E231系3000番台','ハエ45',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'63','209系3500番台','ハエ53',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'65','209系3500番台','ハエ52',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'67','209系3500番台','ハエ54',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'69','E231系3000番台','ハエ41',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'71','E231系3000番台','ハエ43','12:00'::time,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'73','E231系3000番台','ハエ42',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'75','209系3500番台','ハエ51',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'77','209系3500番台','ハエ55',NULL,'https://loo-ool.com/rail/W/00/20261109/'),
('2026-11-09'::date,'79','E231系3000番台','ハエ44',NULL,'https://loo-ool.com/rail/W/00/20261109/');
DO $$
BEGIN
 IF (SELECT count(*) FROM _kw_ops)<>186 OR
 (SELECT count(*) FROM _kw_ops x JOIN published_kawagoe_2611_source_roster r ON x.cal=r.calendar_urn AND x.no=r.train_number)<>186 OR
 (SELECT count(*) FROM _kw_obs)<>18 OR (SELECT count(*) FROM _kw_obs WHERE day='2026-11-09')<>10 OR
 (SELECT count(*) FROM _kw_obs WHERE day='2026-11-10')<>8 OR
 EXISTS(SELECT 1 FROM _kw_obs WHERE day='2026-11-10' AND op IN('75','77')) OR
 EXISTS(SELECT 1 FROM train_timetable_operation_evidence e JOIN manual_timetable_templates t ON e.source_template_id=t.id WHERE t.line_key='Kawagoe')
 THEN RAISE EXCEPTION 'KAWAGOE_WORKING_PREFLIGHT_DRIFT'; END IF;
END $$;
CREATE TEMP TABLE _kw_refs(k text,url text,typ text,note text) ON COMMIT DROP;
INSERT INTO _kw_refs VALUES
('kw-common-working-20260314-weekday','https://ameblo.jp/tc205-37/entry-12972148726.html','reference','Common E231-3000/209-3500 working C-grade; model not determined by duty'),
('kw-common-working-20260314-holiday','https://ameblo.jp/tc205-37/entry-12972148835.html','reference','Common E231-3000/209-3500 working C-grade; model not determined by duty'),
('kw-reported-20261109','https://loo-ool.com/rail/W/00/20261109/','observation','Crowdsourced November 9 assignments; actual vehicle unverified, duty 71(2) unknown'),
('kw-reported-20261110','https://loo-ool.com/rail/W/00/20261110/','observation','Crowdsourced November 10 assignments; 75/77 and duty 71(2) unknown');
WITH n AS(SELECT *,row_number() OVER(ORDER BY k) seq FROM _kw_refs)
INSERT INTO evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
SELECT (SELECT coalesce(max(id),0) FROM evidence_sources)+seq,k,url,typ,'C',note FROM n;
ALTER TABLE published_kawagoe_2611_source_roster
 ADD COLUMN working_operation_code text,
 ADD COLUMN working_operation_source_id bigint REFERENCES evidence_sources(id);
UPDATE published_kawagoe_2611_source_roster r SET working_operation_code=w.op,working_operation_source_id=e.id
FROM _kw_ops w JOIN evidence_sources e ON e.source_key=CASE WHEN w.cal='odpt.Calendar:Weekday'
THEN 'kw-common-working-20260314-weekday' ELSE 'kw-common-working-20260314-holiday' END
WHERE r.calendar_urn=w.cal AND r.train_number=w.no AND r.fleet_working_url=e.source_url;
ALTER TABLE published_kawagoe_2611_source_roster
 ADD CONSTRAINT kawagoe_2611_op_61_79_check CHECK(working_operation_code IN('61','63','65','67','69','71','73','75','77','79'));
CREATE TEMP TABLE _kw_links AS
SELECT t.id tid,m.timetable_id,w.cal,w.no,w.op,e.id source_id,t.direction_urn,
(SELECT coalesce(s.departure_station_urn,s.arrival_station_urn) FROM manual_timetable_template_stops s WHERE s.template_id=t.id ORDER BY stop_sequence LIMIT 1) origin,
(SELECT coalesce(s.arrival_station_urn,s.departure_station_urn) FROM manual_timetable_template_stops s WHERE s.template_id=t.id ORDER BY stop_sequence DESC LIMIT 1) dest,
(SELECT coalesce(s.departure_clock,s.arrival_clock) FROM manual_timetable_template_stops s WHERE s.template_id=t.id ORDER BY stop_sequence LIMIT 1) dc,
(SELECT coalesce(s.arrival_clock,s.departure_clock) FROM manual_timetable_template_stops s WHERE s.template_id=t.id ORDER BY stop_sequence DESC LIMIT 1) ac
FROM _kw_ops w JOIN manual_timetable_templates t ON t.line_key='Kawagoe' AND t.calendar_urn=w.cal AND t.train_number=w.no
JOIN train_timetable_members m ON m.source_template_id=t.id
JOIN evidence_sources e ON e.source_key=CASE WHEN w.cal='odpt.Calendar:Weekday'
THEN 'kw-common-working-20260314-weekday' ELSE 'kw-common-working-20260314-holiday' END;
DO $$
BEGIN
 IF (SELECT count(*) FROM _kw_links)<>186 OR
 (SELECT count(*) FROM _kw_links WHERE ac IS NULL)<>1 OR
 EXISTS(SELECT 1 FROM _kw_links WHERE dc IS NULL OR origin IS NULL OR dest IS NULL OR source_id IS NULL)
 OR EXISTS(SELECT 1 FROM published_kawagoe_2611_source_roster WHERE working_operation_code IS NULL OR working_operation_source_id IS NULL)
 THEN RAISE EXCEPTION 'KAWAGOE_WORKING_LINKS_DRIFT'; END IF;
END $$;
WITH n AS(SELECT *,row_number() OVER(ORDER BY cal,no) seq FROM _kw_links), raw AS (
SELECT n.*,split_part(dc,':',1)::int*60+split_part(dc,':',2)::int d,
CASE WHEN ac IS NULL THEN NULL ELSE split_part(ac,':',1)::int*60+split_part(ac,':',2)::int END a FROM n)
INSERT INTO train_operation_mappings(id,calendar_type,effective_from,effective_to,network_key,train_number,operation_code,
source_id,scope_key,line_id,operator,timetable_version,rail_direction,origin_station,destination_station,
departure_minute,arrival_minute,verification_status,match_evidence)
SELECT (SELECT coalesce(max(id),0) FROM train_operation_mappings)+seq,
CASE WHEN cal='odpt.Calendar:Weekday' THEN 'weekday' ELSE 'saturday_holiday' END,
DATE '2026-03-14',DATE '2026-11-30','odpt.Railway:JR-East.Kawagoe',no,op,source_id,
'Kawagoe:2611:common-working','Kawagoe','JR-East','2026-03-14-shared',direction_urn,origin,dest,
CASE WHEN d<240 THEN d+1440 ELSE d END,
CASE WHEN a<240 THEN a+1440 ELSE a END,
'unverified',jsonb_build_object('role','published-working-plan','source_calendar',cal,'no_actual_formation_claim',true)
FROM raw;
INSERT INTO train_timetable_operation_evidence(
timetable_id,source_template_id,operation_mapping_id,operation_code,source_revision_date,calendar_type,match_format,source_id)
SELECT m.timetable_id,m.tid,o.id,m.op,DATE '2026-03-14',
CASE WHEN m.cal='odpt.Calendar:Weekday' THEN 'weekday' ELSE 'saturday_holiday' END,
'source_exact',m.source_id FROM _kw_links m JOIN train_operation_mappings o ON
o.scope_key='Kawagoe:2611:common-working' AND o.train_number=m.no AND
o.calendar_type=CASE WHEN m.cal='odpt.Calendar:Weekday' THEN 'weekday' ELSE 'saturday_holiday' END
AND o.operation_code=m.op;
WITH n AS(SELECT *,row_number() OVER(ORDER BY day,op) seq FROM _kw_obs)
INSERT INTO operation_vehicle_observations(id,service_date,operator,network_key,operation_code,
valid_from_time,valid_to_time,vehicle_type,formation_ids,ambiguity_group,observed_date,source_id)
SELECT (SELECT coalesce(max(id),0) FROM operation_vehicle_observations)+seq,
day,'JR-East','odpt.Railway:JR-East.Kawagoe',op,
CASE WHEN until_time IS NULL THEN NULL ELSE '00:00'::time END,until_time,
model,ARRAY[carset], 'crowdsourced-C-unconfirmed',day,e.id
FROM n JOIN evidence_sources e ON e.source_url=n.url AND e.source_type='observation' AND e.evidence_grade='C';
DO $$
BEGIN
 IF (SELECT count(*) FROM train_timetable_operation_evidence ev JOIN manual_timetable_templates t
 ON t.id=ev.source_template_id WHERE t.line_key='Kawagoe')<>186 OR
 (SELECT count(*) FROM operation_vehicle_observations WHERE network_key='odpt.Railway:JR-East.Kawagoe'
 AND service_date IN('2026-11-09','2026-11-10'))<>18
 THEN RAISE EXCEPTION 'KAWAGOE_WORKING_POSTCHECK'; END IF;
END $$;
COMMIT;