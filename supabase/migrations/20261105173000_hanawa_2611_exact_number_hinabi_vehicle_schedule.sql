-- Hanawa Line JR East 2611. App canonical line key: Kounan.
-- Published number list: https://timetables.jreast.co.jp/2611/timetable-v/274u1.html
-- Planned model artwork only; 2611 stop clocks not independently confirmed.
BEGIN;
SELECT pg_advisory_xact_lock(2611274);
CREATE TABLE IF NOT EXISTS public.published_hanawa_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Kounan'),
 train_number text NOT NULL,
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_type_urn text NOT NULL,
 segment_key text NOT NULL CHECK(segment_key IN('regular','maintenance','hinabi')),
 vehicle_model text NOT NULL,
 png_reference text NOT NULL,
 official_source_url text NOT NULL,
 operating_dates date[] NOT NULL DEFAULT '{}',
 suspended_dates date[] NOT NULL DEFAULT '{}',
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn)
);
ALTER TABLE public.published_hanawa_2611_number_roster ENABLE ROW LEVEL SECURITY;
INSERT INTO public.published_hanawa_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,segment_key,
 vehicle_model,png_reference,official_source_url,operating_dates,suspended_dates)
SELECT '2611',t.line_key,t.train_number,t.calendar_urn,t.direction_urn,t.train_type_urn,
 CASE WHEN t.train_number IN('9921D','9922D') THEN 'hinabi'
 WHEN t.train_number='9934D' THEN 'maintenance' ELSE 'regular' END,
 CASE WHEN t.train_number IN('9921D','9922D') THEN 'HB-E300系（ひなび）' ELSE 'キハ110系' END,
 CASE WHEN t.train_number IN('9921D','9922D') THEN '../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png'
 ELSE '../images/列车/JR東日本/JR東日本_キハ110系.png' END,
 CASE WHEN t.train_number='9921D' THEN 'https://timetables.jreast.co.jp/2611/train/185/188831.html'
 WHEN t.train_number='9922D' THEN 'https://timetables.jreast.co.jp/2611/train/185/188851.html'
 ELSE 'https://timetables.jreast.co.jp/2611/timetable-v/274'||
 CASE WHEN t.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html' END,
 CASE WHEN t.train_number IN('9921D','9922D') THEN ARRAY['2026-11-27'::date,'2026-11-28'::date,'2026-11-29'::date,'2026-11-30'::date]
 WHEN t.train_number='9934D' THEN ARRAY['2026-11-04'::date,'2026-11-05'::date]
 ELSE '{}'::date[] END,
 CASE WHEN t.train_number IN('928D','929D','1927D','1930D','1931D','1932D','1934D')
 THEN ARRAY['2026-11-04'::date,'2026-11-05'::date] ELSE '{}'::date[] END
FROM public.manual_timetable_templates t
WHERE t.line_key='Kounan' AND t.railway_urn='odpt.Railway:JR-East.Kounan'
 AND t.train_number = ANY(ARRAY['921D','1923D','1925D','929D','9921D','1927D',
 '1931D','933D','1935D','1937D','1939D','1922D','1924D','1926D',
 '928D','1930D','1932D','1934D','9922D','9934D','936D','1938D','1940D','942D'])
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url)
VALUES
('2611','Kounan','regular',921,1940,'D','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/274d1.html'),
('2611','Kounan','maintenance',9934,9934,'D','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/274u1.html'),
('2611','Kounan','hinabi',9921,9922,'D','HB-E300系（ひなび）',
 '../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png',
 'https://www.jreast.co.jp/railway/joyful/hinabi.html')
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT r.edition,r.line_key,r.calendar_urn,r.direction_urn,r.train_number,t.id,
r.official_source_url,'train_number_only'
FROM public.published_hanawa_2611_number_roster r
JOIN public.manual_timetable_templates t ON t.line_key=r.line_key AND
 t.train_number=r.train_number AND t.calendar_urn=r.calendar_urn AND t.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;
UPDATE public.manual_timetable_templates SET vehicle_type_label='HB-E300系（ひなび）'
WHERE line_key='Kounan' AND train_number IN('9921D','9922D')
AND train_type_urn='odpt.TrainType:JR-East.Rapid' AND vehicle_type_label='キハ110系';
DO $check$ BEGIN
IF (SELECT count(*) FROM public.published_hanawa_2611_number_roster)<>47
OR (SELECT count(distinct train_number) FROM public.published_hanawa_2611_number_roster)<>24
OR (SELECT count(*) FROM public.published_hanawa_2611_number_roster WHERE segment_key='hinabi')<>4
OR (SELECT count(*) FROM public.published_train_number_evidence WHERE line_key='Kounan' AND edition='2611')<>47
THEN RAISE EXCEPTION 'Hanawa 2611 24-number/47-calendar audit failed'; END IF;
END $check$;
COMMIT;