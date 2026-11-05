-- JR East 2026-11 Kitakami train NUMBER and service-day reference
-- separated from the 2026-08-02 flood damaged Hotto-Yuda->Yokote rail.
-- JR officially operates Kitakami–Hotto-Yuda; NEVER draw rail on the
-- replacement BUS section. Historical 9729D/9730D Hinabi ran Oct 24-25,
-- not in November. The old client index only admitted 5 existing numbers.
-- Primary sources:
-- https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=kitakamiline
-- https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html
-- https://www.city.yokote.lg.jp/kurashi/1001144/1001292/1003743.html
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_kitakami_2611_number_roster (
 edition text NOT NULL CHECK(edition='2611'),line_key text NOT NULL CHECK(line_key='Kitakami'),
 train_number text NOT NULL,calendar_urn text NOT NULL,direction_urn text NOT NULL,
 train_type_urn text NOT NULL,vehicle_model text NOT NULL,png_reference text NOT NULL,
 official_source_url text NOT NULL,source_evidence_scope text NOT NULL,
 operating_rule text NOT NULL CHECK(operating_rule IN('daily','except_sunday_national_holiday')),
 railway_from text NOT NULL,railway_to text NOT NULL,
 stop_clock_status text NOT NULL DEFAULT 'number_only'
  CHECK(stop_clock_status IN('number_only','prior_edition_or_station_board_partial',
    'official_2611_stop_list','full_2611_checked')),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 PRIMARY KEY (edition,line_key,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_kitakami_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kitakami_2611_number_roster IS
 'JR East 2611 Kitakami numbered trains and KiHa110 illustrative reference, not actual stock; exact service-day rule and flood-suspended rail segment must be checked by train-runs.';
CREATE TABLE IF NOT EXISTS public.published_kitakami_2611_rail_suspension(
 edition text PRIMARY KEY CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Kitakami'),
 suspended_from text NOT NULL,suspended_to text NOT NULL,
 effective_since date NOT NULL,status text NOT NULL,
 service_source_url text NOT NULL,replacement_mode text NOT NULL
);
ALTER TABLE public.published_kitakami_2611_rail_suspension ENABLE ROW LEVEL SECURITY;
INSERT INTO public.published_kitakami_2611_rail_suspension
(edition,line_key,suspended_from,suspended_to,effective_since,status,service_source_url,replacement_mode)
VALUES('2611','Kitakami','Hotto-Yuda','Yokote','2026-08-02','suspended_until_further_notice',
'https://traininfo.jreast.co.jp/train_info/line.aspx?gid=4&lineid=kitakamiline','replacement_bus_not_rail')
ON CONFLICT(edition) DO NOTHING;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url)
VALUES
('2611','Kitakami','rail_to_hotto_yuda',722,739,'D','キハ110系',
'../images/列车/JR東日本/JR東日本_キハ110系.png',
'https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html'),
('2611','Kitakami','rail_to_hotto_yuda',3729,3739,'D','キハ110系',
'../images/列车/JR東日本/JR東日本_キハ110系.png',
'https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html')
ON CONFLICT DO NOTHING;
WITH official(train_number,dir,train_type,rule,source_url,source_scope) AS (
VALUES
('722D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/015/016101.html','prior_edition_or_station_board_partial'),
('724D','Inbound','Local','daily','https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html','prior_edition_or_station_board_partial'),
('726D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/015/016241.html','prior_edition_or_station_board_partial'),
('728D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/015/016301.html','prior_edition_or_station_board_partial'),
('3730D','Inbound','Rapid','daily','https://timetables.jreast.co.jp/2610/train/045/048781.html','prior_edition_or_station_board_partial'),
('732D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/060/064411.html','prior_edition_or_station_board_partial'),
('734D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/015/016401.html','prior_edition_or_station_board_partial'),
('736D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/045/047121.html','prior_edition_or_station_board_partial'),
('738D','Inbound','Local','daily','https://timetables.jreast.co.jp/2610/train/015/016441.html','prior_edition_or_station_board_partial'),
('723D','Outbound','Local','daily','https://timetables.jreast.co.jp/2611/train/050/051721.html','official_2611_stop_list'),
('725D','Outbound','Local','except_sunday_national_holiday','https://timetables.jreast.co.jp/2611/train/050/052421.html','official_2611_stop_list'),
('727D','Outbound','Local','daily','https://timetables.jreast.co.jp/2611/train/050/051731.html','official_2611_stop_list'),
('3729D','Outbound','Rapid','daily','https://timetables.jreast.co.jp/2611/train/050/051741.html','official_2611_stop_list'),
('3731D','Outbound','Rapid','daily','https://timetables.jreast.co.jp/2611/train/045/048791.html','official_2611_stop_list'),
('733D','Outbound','Local','daily','https://timetables.jreast.co.jp/2611/train/050/051751.html','official_2611_stop_list'),
('735D','Outbound','Local','daily','https://timetables.jreast.co.jp/2611/train/050/052431.html','official_2611_stop_list'),
('737D','Outbound','Local','daily','https://timetables.jreast.co.jp/2611/train/050/051761.html','official_2611_stop_list'),
('3739D','Outbound','Rapid','daily','https://timetables.jreast.co.jp/2611/train/050/051771.html','official_2611_stop_list')
), cal(calendar) AS (VALUES ('Weekday'),('SaturdayHoliday'))
INSERT INTO public.published_kitakami_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 vehicle_model,png_reference,official_source_url,source_evidence_scope,operating_rule,
 railway_from,railway_to,stop_clock_status)
SELECT '2611','Kitakami',o.train_number,'odpt.Calendar:'||cal.calendar,
 'odpt.RailDirection:'||o.dir,'odpt.TrainType:JR-East.'||o.train_type,
 'キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png',
 o.source_url,o.source_scope,o.rule,
 CASE WHEN o.dir='Inbound'
 THEN CASE WHEN o.train_number='724D' THEN 'Fujine' ELSE 'Hotto-Yuda' END
 ELSE 'Kitakami' END,
 CASE WHEN o.dir='Outbound'
 THEN CASE WHEN o.train_number='725D' THEN 'Fujine' ELSE 'Hotto-Yuda' END
 ELSE 'Kitakami' END,
 CASE WHEN o.source_scope='official_2611_stop_list'
 THEN 'official_2611_stop_list'
 ELSE 'prior_edition_or_station_board_partial' END
FROM official o CROSS JOIN cal ON CONFLICT DO NOTHING;
COMMIT;