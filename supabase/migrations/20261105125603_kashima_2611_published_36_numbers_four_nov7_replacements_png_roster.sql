-- Kashima 2026-11 JR East 214d1/d2/u1/u2:
-- 32 regular numbers x 2 calendars, plus FOUR date-specific 11/07
-- substitutes 9520M,9545M,9548M,9549M replacing 2520M,2545M,
-- 548M,549M respectively. All existing 64 source templates have
-- 6/6 published DEPARTURE/TERMINAL clocks matched the current month.
-- Arrival clocks not in overview table remain undated, so do NOT claim
-- fully verified timetableDateVerified. No duplicate cross-line train.
-- Model FAMILY images only: two E235 direct trains; E131 0/80 regionals;
-- 548/549 and 9548/9549 mixed historical fleet remain UNRESOLVED.
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_kashima_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Kashima'),
 train_number text NOT NULL,
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
 vehicle_model text,
 png_reference text,
 official_source_url text NOT NULL,
 vehicle_source_url text,
 date_rule text NOT NULL CHECK(date_rule IN('daily','exclude_2026_11_07','only_2026_11_07')),
 operated_dates date[] NOT NULL DEFAULT '{}',
 scope_from text NOT NULL,
 scope_to text NOT NULL,
 stop_clock_status text NOT NULL DEFAULT 'overview_all_six_stations'
 CHECK(stop_clock_status IN('number_only','overview_all_six_stations')),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn),
 CHECK((vehicle_model IS NULL AND png_reference IS NULL) OR
   (vehicle_model IS NOT NULL AND png_reference IS NOT NULL)),
 CHECK(date_rule<>'only_2026_11_07' OR
   operated_dates=ARRAY['2026-11-07'::date])
);
ALTER TABLE public.published_kashima_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kashima_2611_number_roster IS
 'JR 2611 published Kashima exact numbered service per calendar, Nov 7 switch, six official line-overview station times; fleet PNG only illustrative and mixed-source types unresolved.';
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url)
VALUES
('2611','Kashima','e131_family',523,551,'M',
 'E131系0番台 / 80番台',
 '../images/列车/JR東日本/JR東日本_E131系_0番台.png',
 'https://www.jreast.co.jp/train/local/e131.html'),
('2611','Kashima','e131_family',3521,3547,'M',
 'E131系0番台 / 80番台',
 '../images/列车/JR東日本/JR東日本_E131系_0番台.png',
 'https://www.jreast.co.jp/train/local/e131.html'),
('2611','Kashima','e235_through',2520,2545,'M',
 'E235系1000番台',
 '../images/列车/JR東日本/JR東日本_E235系_1000番台.png',
 'https://www.jreast.co.jp/train/local/e235.html'),
('2611','Kashima','e235_through',9520,9545,'M',
 'E235系1000番台',
 '../images/列车/JR東日本/JR東日本_E235系_1000番台.png',
 'https://www.jreast.co.jp/train/local/e235.html')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE kashima_base_2611(
 number text,dir text,model text,png text,date_rule text,
 PRIMARY KEY(number,dir)) ON COMMIT DROP;
INSERT INTO kashima_base_2611 VALUES
('3521M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('523M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('525M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('527M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('529M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('531M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('533M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('535M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('537M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('539M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('541M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('543M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('2545M','Outbound','E235系1000番台','../images/列车/JR東日本/JR東日本_E235系_1000番台.png','exclude_2026_11_07'),
('3547M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('549M','Outbound',NULL,NULL,'exclude_2026_11_07'),
('551M','Outbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('2520M','Inbound','E235系1000番台','../images/列车/JR東日本/JR東日本_E235系_1000番台.png','exclude_2026_11_07'),
('522M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('524M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('526M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('3528M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('530M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('532M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('534M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('536M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('538M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('540M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('542M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('544M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('546M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily'),
('548M','Inbound',NULL,NULL,'exclude_2026_11_07'),
('550M','Inbound','E131系0番台 / 80番台','../images/列车/JR東日本/JR東日本_E131系_0番台.png','daily');
INSERT INTO public.published_kashima_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 vehicle_model,png_reference,official_source_url,vehicle_source_url,date_rule,
 scope_from,scope_to)
SELECT '2611','Kashima',s.number,'odpt.Calendar:'||c.cal,
 'odpt.RailDirection:'||s.dir,'odpt.TrainType:JR-East.Local',
 s.model,s.png,'https://timetables.jreast.co.jp/2611/timetable-v/214'||
 CASE WHEN s.dir='Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN c.cal='Weekday' THEN '1' ELSE '2' END||'.html',
 CASE WHEN s.model='E235系1000番台'
 THEN 'https://www.jreast.co.jp/train/local/e235.html'
 WHEN s.model IS NOT NULL THEN 'https://www.jreast.co.jp/train/local/e131.html'
 ELSE NULL END,
 s.date_rule,CASE WHEN s.dir='Inbound' THEN 'Kashimajingu' ELSE 'Sawara' END,
 CASE WHEN s.dir='Inbound' THEN 'Sawara' ELSE 'Kashimajingu' END
FROM kashima_base_2611 s CROSS JOIN (VALUES('Weekday'),('SaturdayHoliday')) c(cal)
ON CONFLICT DO NOTHING;

-- Copy already matched SIX official station clocks, not fabricate four
-- new full itineraries. These are Kashima/Sawara segment records only,
-- NOT an invented Tokyo/Narita through canonical connection.
CREATE TEMP TABLE kashima_nov7_specials(
 number text PRIMARY KEY,base_number text NOT NULL,dir text NOT NULL,
 model text,png text,ultimate_destination text)
 ON COMMIT DROP;
INSERT INTO kashima_nov7_specials VALUES
('9520M','2520M','Inbound','E235系1000番台',
 '../images/列车/JR東日本/JR東日本_E235系_1000番台.png',
 'odpt.Station:JR-East.SobuRapid.Tokyo'),
('9545M','2545M','Outbound','E235系1000番台',
 '../images/列车/JR東日本/JR東日本_E235系_1000番台.png',
 'odpt.Station:JR-East.Kashima.Kashimajingu'),
('9548M','548M','Inbound',NULL,NULL,
 'odpt.Station:JR-East.Kashima.Sawara'),
('9549M','549M','Outbound',NULL,NULL,
 'odpt.Station:JR-East.Kashima.Kashimajingu');
INSERT INTO public.published_kashima_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 vehicle_model,png_reference,official_source_url,vehicle_source_url,date_rule,
 operated_dates,scope_from,scope_to)
SELECT '2611','Kashima',s.number,'odpt.Calendar:SaturdayHoliday',
 'odpt.RailDirection:'||s.dir,'odpt.TrainType:JR-East.Local',
 s.model,s.png,'https://timetables.jreast.co.jp/2611/timetable-v/214'||
 CASE WHEN s.dir='Inbound' THEN 'u2' ELSE 'd2' END||'.html',
 CASE WHEN s.model IS NOT NULL
 THEN 'https://www.jreast.co.jp/train/local/e235.html' ELSE NULL END,
 'only_2026_11_07',ARRAY['2026-11-07'::date],
 CASE WHEN s.dir='Inbound' THEN 'Kashimajingu' ELSE 'Sawara' END,
 CASE WHEN s.dir='Inbound' THEN 'Sawara' ELSE 'Kashimajingu' END
FROM kashima_nov7_specials s ON CONFLICT DO NOTHING;

INSERT INTO public.manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,
 train_type_urn,destination_urns,vehicle_type_label,source_path,source_occurrence)
SELECT 'Kashima','odpt.Calendar:SaturdayHoliday',s.number,
 'odpt.Railway:JR-East.Kashima','odpt.RailDirection:'||s.dir,
 'odpt.TrainType:JR-East.Local',ARRAY[s.ultimate_destination],
 s.model,'official-jreast-2611:kashima:2026-11-07:'||s.number,0
FROM kashima_nov7_specials s
WHERE NOT EXISTS(
 SELECT 1 FROM manual_timetable_templates t
 WHERE t.line_key='Kashima' AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND t.train_number=s.number
 AND t.source_path='official-jreast-2611:kashima:2026-11-07:'||s.number);

INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,
arrival_clock,departure_clock)
SELECT dest.id,st.stop_sequence,st.arrival_station_urn,st.departure_station_urn,
 st.arrival_clock,st.departure_clock
FROM kashima_nov7_specials spec
JOIN public.manual_timetable_templates dest
 ON dest.source_path='official-jreast-2611:kashima:2026-11-07:'||spec.number
JOIN public.manual_timetable_templates original
 ON original.line_key='Kashima' AND original.train_number=spec.base_number
 AND original.calendar_urn='odpt.Calendar:SaturdayHoliday'
JOIN public.manual_timetable_template_stops st ON st.template_id=original.id
ON CONFLICT(template_id,stop_sequence) DO NOTHING;

INSERT INTO public.train_timetables
(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
 group_evidence,timetable_validity)
SELECT 'source:'||t.id,t.calendar_urn,t.train_number,t.id,'source_only',
 'undated_not_current_verified'
FROM manual_timetable_templates t
WHERE t.line_key='Kashima'
 AND t.source_path LIKE 'official-jreast-2611:kashima:2026-11-07:%'
AND NOT EXISTS(SELECT 1 FROM train_timetables can
 WHERE can.canonical_key='source:'||t.id);
INSERT INTO public.train_timetable_members
(source_template_id,timetable_id,segment_order,member_role,
 first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT t.id,can.id,0,'primary',0,5,0,false
FROM manual_timetable_templates t JOIN train_timetables can
 ON can.canonical_key='source:'||t.id
WHERE t.line_key='Kashima'
 AND t.source_path LIKE 'official-jreast-2611:kashima:2026-11-07:%'
ON CONFLICT(source_template_id) DO NOTHING;
INSERT INTO public.train_timetable_vehicle_mappings
(timetable_id,source_template_id,vehicle_type,mapping_level,source_path,actual_vehicle_confirmed)
SELECT c.id,t.id,'E235系1000番台','source_single_type_candidate',
 t.source_path,false
FROM manual_timetable_templates t JOIN train_timetables c ON c.canonical_key='source:'||t.id
WHERE t.line_key='Kashima' AND t.train_number IN('9520M','9545M')
 AND t.source_path LIKE 'official-jreast-2611:kashima:2026-11-07:%'
AND NOT EXISTS(SELECT 1 FROM train_timetable_vehicle_mappings v
 WHERE v.timetable_id=c.id);

INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611','Kashima',r.calendar_urn,r.direction_urn,r.train_number,t.id,
r.official_source_url,'train_number_only'
FROM public.published_kashima_2611_number_roster r
JOIN public.manual_timetable_templates t
ON t.line_key='Kashima' AND t.calendar_urn=r.calendar_urn
 AND t.train_number=r.train_number AND t.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;

DO $guard$
DECLARE a int;b int;c int;
BEGIN
 SELECT count(*),count(distinct train_number) INTO a,b
 FROM public.published_kashima_2611_number_roster WHERE edition='2611';
 SELECT count(*) INTO c FROM public.manual_timetable_templates t
 JOIN public.published_kashima_2611_number_roster r
 ON r.train_number=t.train_number AND r.calendar_urn=t.calendar_urn
 AND r.direction_urn=t.direction_urn WHERE t.line_key='Kashima';
 IF a<>68 OR b<>36 OR c<>68 THEN RAISE EXCEPTION
  'Kashima 2611 expected 68 records, 36 distinct numbers, 68 SQL sources, got %,%,%',a,b,c;
 END IF;
 IF EXISTS(SELECT 1 FROM public.manual_timetable_templates t
 JOIN public.manual_timetable_template_stops st ON st.template_id=t.id
 WHERE t.line_key='Kashima' AND t.train_number LIKE '95%M'
 AND split_part(coalesce(st.arrival_station_urn,st.departure_station_urn),'.',4)
 NOT IN ('Sawara','Katori','Junikyo','Itako','Nobukata','Kashimajingu'))
 THEN RAISE EXCEPTION 'Out of segment 11/7 replacement stop';END IF;
END $guard$;
COMMIT;