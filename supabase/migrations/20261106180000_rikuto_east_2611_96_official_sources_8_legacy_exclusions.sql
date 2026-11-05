-- 陸羽東線 2026-11: 45 ordinary numbers x 2 calendars + 6
-- dated "おもいで湯けむり" rapid numbers from one holiday source each.
-- Quarantine six repeated/truncated rapid imports and legacy 9727/9728D.
-- January/February Kazekko 9727/9734D must NOT appear in November.
-- Naruko-Onsen--Shinjo railroad remains closed (2024 flood).
-- Sources: https://timetables.jreast.co.jp/2611/timetable-v/268u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/268u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/268d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/268d2.html
-- https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=riku-eastline
-- https://railf.jp/news/2026/10/04/000000.html
BEGIN;
SELECT pg_advisory_xact_lock(2611268);
CREATE TABLE IF NOT EXISTS public.published_rikuto_east_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='RikutoEast'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_number text NOT NULL CHECK(train_number ~ '^[0-9]{4}D$'),
 source_template_id bigint NOT NULL UNIQUE REFERENCES public.manual_timetable_templates(id),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys) BETWEEN 2 AND 15),
 train_type_urn text NOT NULL CHECK(train_type_urn IN('odpt.TrainType:JR-East.Local','odpt.TrainType:JR-East.Rapid')),
 service_name text NOT NULL DEFAULT '',
 segment_key text NOT NULL CHECK(segment_key IN('kogota_naruko_regular','kogota_naruko_omoide_rapid')),
 valid_dates date[] NOT NULL,
 vehicle_model text NOT NULL CHECK(vehicle_model='キハ110系'),
 png_reference text NOT NULL CHECK(png_reference IN(
 '../images/列车/JR東日本/JR東日本_キハ110系.png',
 '../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png')),
 official_source_url text NOT NULL,
 stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
 CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_rikuto_east_2611_number_roster ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.published_rikuto_east_2611_excluded_source_audit(
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'RikutoEast' CHECK(line_key='RikutoEast'),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 train_number text NOT NULL,calendar_urn text NOT NULL,
 exclusion_reason text NOT NULL CHECK(exclusion_reason IN(
 'duplicate_or_truncated_rapid_import','not_in_2611_november_official_roster')),
 official_source_url text NOT NULL
);
ALTER TABLE public.published_rikuto_east_2611_excluded_source_audit ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_rikuto_east_2611_number_roster IS
'2026-11 96 source rows: 45 ordinary numbers in two calendars and six dated Omoide rapids. The 11/02 weekday special reuses holiday SQL. Historical clock and actual consist NOT certified. PNG representative only.';
COMMENT ON TABLE public.published_rikuto_east_2611_excluded_source_audit IS
'Six shorter/duplicated 97xxD sources + 9727D/9728D not scheduled in Nov; retain original SQL for audit.';
WITH src AS(
 SELECT t.*,ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
 FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id ORDER BY s.stop_sequence) stop_keys
 FROM public.manual_timetable_templates t
 WHERE t.line_key='RikutoEast' AND t.railway_urn='odpt.Railway:JR-East.RikutoEast'
 AND t.source_occurrence=0 AND t.source_path='data/timetables/RikutoEast-manual.js'
), official AS(
 SELECT *,CASE WHEN train_number=ANY(ARRAY['9721D','9722D','9723D','9724D','9725D','9726D']::text[])
 THEN 'kogota_naruko_omoide_rapid' ELSE 'kogota_naruko_regular' END kind
 FROM src
 WHERE (
 calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND ((direction_urn='odpt.RailDirection:Inbound' AND train_number=ANY(ARRAY['5720D','1720D','5722D','1722D','1724D','5724D','5726D','1726D','1728D','4730D','1732D','4734D','5728D','1736D','5730D','1738D','5732D','1740D','5734D','1742D','1744D','1746D']::text[]))
 OR (direction_urn='odpt.RailDirection:Outbound' AND train_number=ANY(ARRAY['5721D','1721D','5723D','1723D','2725D','5725D','4725D','1727D','4729D','1731D','4733D','5727D','1735D','5729D','1737D','5731D','1739D','5733D','1741D','1743D','1745D','1747D','5735D']::text[])))
 ) OR (
 calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND ((direction_urn='odpt.RailDirection:Inbound' AND train_number=ANY(ARRAY['9722D','9724D','9726D']::text[]))
 OR (direction_urn='odpt.RailDirection:Outbound' AND train_number=ANY(ARRAY['9721D','9723D','9725D']::text[])))
 )
)
INSERT INTO public.published_rikuto_east_2611_number_roster(
 edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 source_stop_keys,train_type_urn,service_name,segment_key,valid_dates,
 vehicle_model,png_reference,official_source_url)
SELECT '2611','RikutoEast',calendar_urn,direction_urn,train_number,id,stop_keys,
 CASE WHEN kind='kogota_naruko_omoide_rapid' THEN 'odpt.TrainType:JR-East.Rapid'
 ELSE 'odpt.TrainType:JR-East.Local' END,
 CASE WHEN kind='kogota_naruko_omoide_rapid' THEN
 'おもいで湯けむり'||substring(train_number FROM '^972([1-6])D$')||'号'
 ELSE '' END,
 kind,
 CASE WHEN kind='kogota_naruko_omoide_rapid'
 THEN ARRAY['2026-11-01','2026-11-02','2026-11-03','2026-11-07','2026-11-08',
 '2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23',
 '2026-11-28','2026-11-29']::date[]
 ELSE '{}'::date[] END,
 'キハ110系',
 CASE WHEN kind='kogota_naruko_omoide_rapid'
 THEN '../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png'
 ELSE '../images/列车/JR東日本/JR東日本_キハ110系.png' END,
 'https://timetables.jreast.co.jp/2611/timetable-v/268'||
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM official WHERE train_type_urn='odpt.TrainType:JR-East.Local'
 AND vehicle_type_label='キハ110系' AND cardinality(stop_keys) BETWEEN 2 AND 15
ON CONFLICT DO NOTHING;
INSERT INTO public.published_rikuto_east_2611_excluded_source_audit(
 source_template_id,train_number,calendar_urn,exclusion_reason,official_source_url)
SELECT id,train_number,calendar_urn,
 CASE WHEN train_number IN('9727D','9728D') THEN 'not_in_2611_november_official_roster'
 ELSE 'duplicate_or_truncated_rapid_import' END,
 'https://timetables.jreast.co.jp/2611/timetable-v/268'||
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u2.html' ELSE 'd2.html' END
FROM public.manual_timetable_templates
WHERE line_key='RikutoEast' AND (train_number IN('9727D','9728D')
 OR (train_number=ANY(ARRAY['9721D','9722D','9723D','9724D','9725D','9726D']::text[]) AND source_occurrence=1))
ON CONFLICT(source_template_id) DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_rikuto_east_2611_number_roster ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,
 source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','RikutoEast','kogota_naruko_regular',1720,5735,'D','キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/268u1.html',true,false),
 ('2611','RikutoEast','kogota_naruko_omoide_rapid',9721,9726,'D','キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/268u2.html',true,false)
ON CONFLICT DO NOTHING;
DO $test$
BEGIN
 IF (SELECT COUNT(*) FROM public.manual_timetable_templates WHERE line_key='RikutoEast')<>104
 OR (SELECT COUNT(*) FROM public.published_rikuto_east_2611_number_roster)<>96
 OR (SELECT COUNT(*) FROM public.published_rikuto_east_2611_number_roster
  WHERE segment_key='kogota_naruko_regular')<>90
 OR (SELECT COUNT(*) FROM public.published_rikuto_east_2611_number_roster
  WHERE segment_key='kogota_naruko_omoide_rapid')<>6
 OR (SELECT COUNT(*) FROM public.published_rikuto_east_2611_excluded_source_audit)<>8
 OR (SELECT COUNT(*) FROM public.published_train_number_evidence
  WHERE edition='2611' AND line_key='RikutoEast')<>96
 OR (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='RikutoEast')<>2
 OR EXISTS(SELECT source_template_id FROM public.published_rikuto_east_2611_number_roster
 INTERSECT SELECT source_template_id FROM public.published_rikuto_east_2611_excluded_source_audit)
 THEN RAISE EXCEPTION 'RikutoEast 2026-11 source count/identity mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_rikuto_east_2611_number_roster r
 CROSS JOIN LATERAL unnest(r.source_stop_keys) s(station) WHERE s.station NOT IN(
 'Kogota','Kita-Ura','Rikuzen-Yachi','Furukawa','Tsukume',
 'Nishi-Furukawa','Higashi-Ohsaki','Nishi-Ohsaki','Iwadeyama','Yubikan',
 'Kaminome','Igetsuki','Kawatabi-Onsen','Naruko-Gotenyu','Naruko-Onsen'))
 THEN RAISE EXCEPTION 'RikutoEast source includes closed/foreign railway stop';END IF;
END $test$;
COMMIT;