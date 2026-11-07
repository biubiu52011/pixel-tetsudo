-- JR-West 2026-11 Nara Line: another 10 EXACT original-source
-- station-clock proofs for two calendar variants of 604 / 2603 /
-- 2634 / 2638 / 2640. Published rapid kind is separate from legacy
-- Local import; no new station rows, vehicle assignment or extra work.
BEGIN;
SELECT pg_advisory_xact_lock(26110735);
ALTER TABLE public.published_jrwest_nara_2611_verified_source_clocks
 DROP CONSTRAINT nara_2611_official_type_scope;
ALTER TABLE public.published_jrwest_nara_2611_verified_source_clocks
 ADD CONSTRAINT nara_2611_official_type_scope CHECK(
    (published_train_type='Local' AND published_train_type_label='普通'
     AND published_train_number IN('601M','602M','604M','621M') AND source_stop_count=21
     AND published_service_name='')
    OR
    (published_train_type='MiyakojiRapid' AND published_train_type_label='みやこ路快速'
     AND published_train_number IN('2603M','2634M','2636M','2638M','2640M','2646M')
     AND source_stop_count=11
     AND published_service_name IN('Ｄみやこ路快速603号','Ｄみやこ路快速634号',
      'Ｄみやこ路快速636号','Ｄみやこ路快速638号',
      'Ｄみやこ路快速640号','Ｄみやこ路快速646号'))
    OR
    (published_train_type='LimitedExpress' AND published_train_type_label='特急'
     AND published_train_number IN('8061M','8062M') AND source_stop_count=3
     AND published_service_name IN('いにしへ61号','いにしへ62号')
     AND calendar_urn='odpt.Calendar:SaturdayHoliday')
 );
WITH e(source_train_number,calendar_token,direction_token,published_type,
       official_label,expected_count,expected_hash,official_url,service_name) AS(VALUES
('604M','Weekday','Inbound','Local','普通','21','a2165885cc4bffc637a56c0064c00939','https://timetable.jr-odekake.net/train-timetable/44461?date=20261023',''),
('604MH','SaturdayHoliday','Inbound','Local','普通','21','a2165885cc4bffc637a56c0064c00939','https://timetable.jr-odekake.net/train-timetable/44461?date=20261023',''),
('2603M','Weekday','Outbound','MiyakojiRapid','みやこ路快速','11','318ed2f75c9ab030b237f9a72d2a0acb','https://timetable.jr-odekake.net/train-timetable/25441?date=20260924','Ｄみやこ路快速603号'),
('2603MH','SaturdayHoliday','Outbound','MiyakojiRapid','みやこ路快速','11','318ed2f75c9ab030b237f9a72d2a0acb','https://timetable.jr-odekake.net/train-timetable/25451?date=20261025','Ｄみやこ路快速603号'),
('2634M','Weekday','Inbound','MiyakojiRapid','みやこ路快速','11','6b64623ddd10afd66fee884430cb2446','https://timetable.jr-odekake.net/train-timetable/26101?date=20261024','Ｄみやこ路快速634号'),
('2634MH','SaturdayHoliday','Inbound','MiyakojiRapid','みやこ路快速','11','6b64623ddd10afd66fee884430cb2446','https://timetable.jr-odekake.net/train-timetable/26101?date=20261024','Ｄみやこ路快速634号'),
('2638M','Weekday','Inbound','MiyakojiRapid','みやこ路快速','11','f2f4b62b4ed70d4b2038b9349ca5c40b','https://timetable.jr-odekake.net/train-timetable/322611?date=20261024','Ｄみやこ路快速638号'),
('2638MH','SaturdayHoliday','Inbound','MiyakojiRapid','みやこ路快速','11','f2f4b62b4ed70d4b2038b9349ca5c40b','https://timetable.jr-odekake.net/train-timetable/322611?date=20261024','Ｄみやこ路快速638号'),
('2640M','Weekday','Inbound','MiyakojiRapid','みやこ路快速','11','5427402e9ce604d2f0b3fdfb33194c6a','https://timetable.jr-odekake.net/train-timetable/322461?date=20261013','Ｄみやこ路快速640号'),
('2640MH','SaturdayHoliday','Inbound','MiyakojiRapid','みやこ路快速','11','5427402e9ce604d2f0b3fdfb33194c6a','https://timetable.jr-odekake.net/train-timetable/322461?date=20261013','Ｄみやこ路快速640号')
), original AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
        count(*)::integer n,
        md5(string_agg(concat_ws('|',s.stop_sequence,
             coalesce(s.departure_station_urn,s.arrival_station_urn,''),
             coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
             E'\n' ORDER BY s.stop_sequence)) hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Nara' AND m.railway_urn='odpt.Railway:JR-West.Nara'
   AND m.source_path='data/timetables/Nara-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn
)
INSERT INTO public.published_jrwest_nara_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 direction_urn,source_train_type_urn,published_train_type,
 published_train_type_label,published_service_name,
 source_stop_count,source_stops_md5,official_source_url)
SELECT o.id,o.train_number,regexp_replace(o.train_number,'H$',''),
       o.calendar_urn,o.direction_urn,o.train_type_urn,e.published_type,
       e.official_label,e.service_name,o.n,o.hash,e.official_url
FROM e JOIN original o ON o.train_number=e.source_train_number
 AND o.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND o.direction_urn='odpt.RailDirection:'||e.direction_token
 AND o.n=e.expected_count::integer AND o.hash=e.expected_hash
ON CONFLICT (source_template_id) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence)<>21
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence WHERE verified_source_match)<>21
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE calendar_urn='odpt.Calendar:Weekday')<>9
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>12
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE published_train_type='Local')<>8
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE published_train_type='MiyakojiRapid')<>11
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE published_train_type='LimitedExpress')<>2
 OR EXISTS (SELECT 1 FROM public.published_jrwest_nara_2611_clock_evidence
    WHERE actual_vehicle_confirmed OR authorizes_png)
 THEN RAISE EXCEPTION 'Nara 2611 second verified 10-source clock gate failed'; END IF;
END $proof$;
COMMIT;