-- JR East 2611 Kamaishi; correct service type and planned model.
-- Hinabi 8621D/8622D only 2026-11 7,8,14,15,21,22,23.
-- Actual running carset UNKNOWN. Keep source timetable validity separate.
BEGIN;
INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
VALUES('jr-east-2611-kamaishi-hinabi-hbe300',
'https://www.jreast.co.jp/railway/joyful/hinabi.html','official','A',
'Official JR East Hinabi HB-E300 with 2611 November 8621D/8622D; model reference, not formation')
ON CONFLICT(source_key) DO NOTHING;
UPDATE public.manual_timetable_templates m
SET train_type_urn=r.train_type_urn,vehicle_type_label=r.vehicle_model
FROM public.published_kamaishi_2611_number_roster r
WHERE m.line_key='Kamaishi' AND m.calendar_urn=r.calendar_urn
AND m.direction_urn=r.direction_urn AND m.train_number=r.train_number
AND r.edition='2611' AND r.line_key='Kamaishi'
AND (m.train_type_urn IS DISTINCT FROM r.train_type_urn OR m.vehicle_type_label IS DISTINCT FROM r.vehicle_model);
UPDATE public.train_timetable_vehicle_mappings v
SET vehicle_type='HB-E300系（ひなび）',mapping_level='published_number_family_plan',
source_id=e.id,source_path='jreast-2611:kamaishi:hinabi',actual_vehicle_confirmed=false
FROM public.train_timetable_members tm
JOIN public.manual_timetable_templates t ON t.id=tm.source_template_id
JOIN public.evidence_sources e ON e.source_key='jr-east-2611-kamaishi-hinabi-hbe300'
WHERE v.timetable_id=tm.timetable_id
AND t.line_key='Kamaishi' AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
AND t.train_number IN ('8621D','8622D');
INSERT INTO public.published_train_vehicle_number_references
(operator,network_key,train_number,service_name,train_type,vehicle_type,
image_path,timetable_month,calendar_type,source_railways,operating_dates,
train_timetable_source_url,vehicle_model_source_url,reference_role,actual_vehicle_confirmed)
SELECT 'JR-East','Kamaishi',s.number,'ひなび 釜石','Rapid','HB-E300系（ひなび）',
'images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png','2026-11','holiday',
ARRAY['odpt.Railway:JR-East.Kamaishi'],
ARRAY['2026-11-07','2026-11-08','2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23']::date[],
s.source_url,'https://www.jreast.co.jp/railway/joyful/hinabi.html',
'official-train-name-and-model',false
FROM (VALUES
('8621D','https://timetables.jreast.co.jp/2611/train/150/154901.html'),
('8622D','https://timetables.jreast.co.jp/2611/train/150/154891.html')
) s(number,source_url)
ON CONFLICT (operator,network_key,train_number,timetable_month,calendar_type) DO NOTHING;
CREATE TEMP TABLE kamaishi_hinabi_stop_fix(train_number text,stop_seq integer,
 station text,arr text,dep text,PRIMARY KEY(train_number,stop_seq)) ON COMMIT DROP;
INSERT INTO kamaishi_hinabi_stop_fix VALUES
('8621D',0,'Hanamaki',NULL,'10:53'),
('8621D',1,'Shin-Hanamaki','11:00','11:01'),
('8621D',2,'Tsuchizawa','11:08','11:09'),
('8621D',3,'Miyamori','11:23','11:26'),
('8621D',4,'Tono','11:52',NULL),
('8621D',5,'Tono',NULL,'12:23'),
('8621D',6,'Kami-Arisu','12:45','12:45'),
('8621D',7,'Rikuchu-Ohashi','12:58','12:58'),
('8621D',8,'Kamaishi','13:19',NULL),
('8622D',0,'Kamaishi',NULL,'14:18'),
('8622D',1,'Rikuchu-Ohashi','14:39','14:40'),
('8622D',2,'Kami-Arisu','14:53','14:53'),
('8622D',3,'Tono','15:19',NULL),
('8622D',4,'Tono',NULL,'15:58'),
('8622D',5,'Miyamori','16:22','16:25'),
('8622D',6,'Tsuchizawa','16:39','16:39'),
('8622D',7,'Shin-Hanamaki','16:46','16:47'),
('8622D',8,'Hanamaki','16:54',NULL);
DO $$
DECLARE n integer;
BEGIN
SELECT count(*) INTO n FROM manual_timetable_templates m
JOIN manual_timetable_template_stops st ON st.template_id=m.id
JOIN kamaishi_hinabi_stop_fix s ON s.train_number=m.train_number AND s.stop_seq=st.stop_sequence
WHERE m.line_key='Kamaishi' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
AND coalesce(st.arrival_station_urn,st.departure_station_urn)='odpt.Station:JR-East.'||s.station;
IF n<>18 THEN RAISE EXCEPTION 'Expected 18 existing Hinabi source stops, got %',n; END IF;
END $$;
UPDATE public.manual_timetable_template_stops st
SET arrival_clock=s.arr,departure_clock=s.dep,
arrival_station_urn=CASE WHEN s.arr IS NOT NULL THEN 'odpt.Station:JR-East.'||s.station ELSE NULL END,
departure_station_urn=CASE WHEN s.dep IS NOT NULL THEN 'odpt.Station:JR-East.'||s.station ELSE NULL END
FROM manual_timetable_templates m JOIN kamaishi_hinabi_stop_fix s ON s.train_number=m.train_number
WHERE st.template_id=m.id AND st.stop_sequence=s.stop_seq
AND m.line_key='Kamaishi' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday';
UPDATE public.published_kamaishi_2611_number_roster
SET stop_clock_status='full_official_segment'
WHERE edition='2611' AND line_key='Kamaishi'
AND calendar_urn='odpt.Calendar:SaturdayHoliday'
AND train_number IN('8621D','8622D');
COMMIT;