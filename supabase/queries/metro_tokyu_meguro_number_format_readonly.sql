-- 东急目黑线：只读检查来源标识及完整番号格式，不以导入序列授权车型图片。
-- 2026-11-26：内向454行，外向480行；来源修订日、trip ID、物理运行键全空。
select railway_urn, source_path, calendar_urn, direction_urn,
       case when train_number ~ '^TKYMeguroI[HW][0-9]+$' then 'sequence'
            when train_number ~ '^[0-9]+-[0-9]+$' then 'hyphen'
            else 'other' end as format,
       count(*) as rows,
       count(distinct train_number) as distinct_numbers,
       count(source_revision_date) as dated,
       count(source_trip_id) as source_trip_ids,
       count(physical_service_key) as physical_service_keys,
       count(vehicle_type_label) as typed,
       min(vehicle_type_label) as min_model,
       max(vehicle_type_label) as max_model,
       min(train_number) as sample,
       max(train_number) as last_sample
from public.manual_timetable_templates
where line_key='TokyuMeguro'
group by 1,2,3,4,5
order by 1,2,3,4,5;

-- 2026-11-26 目黑站同分钟边界候选检查（不是直通或车型的授权证据）。
-- 保留两侧完整原番号，仅按日历、方向、边界站到发分钟对照。
-- 934条：58条唯一同分钟候选；876条无同分钟匹配（含21条缺边界时刻）；两侧修订日期均未核实。
with boundary as (
 select t.id,t.line_key,t.calendar_urn,t.direction_urn,t.train_number,t.destination_urns,t.source_revision_date,
 min(s.arrival_clock) filter(where s.arrival_station_urn like '%.Meguro') as arr,
 min(s.departure_clock) filter(where s.departure_station_urn like '%.Meguro') as dep
 from public.manual_timetable_templates t join public.manual_timetable_template_stops s on t.id=s.template_id
 where t.line_key in ('TokyuMeguro','Namboku','Mita')
 group by t.id,t.line_key,t.calendar_urn,t.direction_urn,t.train_number,t.destination_urns,t.source_revision_date
), pairs as (
 select a.id,a.calendar_urn,a.direction_urn,a.train_number,a.arr,a.dep,b.id as other_id,
 b.line_key as other_line,b.train_number as other_number,
 a.source_revision_date as a_revision,b.source_revision_date as b_revision
 from boundary a left join boundary b on b.line_key in ('Mita','Namboku') and b.calendar_urn=a.calendar_urn
 and ((a.direction_urn='odpt.RailDirection:Inbound' and a.arr=b.dep
       and b.direction_urn in ('odpt.RailDirection:Northbound','odpt.RailDirection:TokyoMetro.AkabaneIwabuchi'))
 or (a.direction_urn='odpt.RailDirection:Outbound' and a.dep=b.arr
       and b.direction_urn in ('odpt.RailDirection:Southbound','odpt.RailDirection:TokyoMetro.Meguro')))
 where a.line_key='TokyuMeguro'
), counts as (
 select id,calendar_urn,direction_urn,arr,dep,count(distinct other_id) as matches,
 count(distinct other_id) filter(where a_revision is not null and b_revision is not null) as dated_pairs
 from pairs group by 1,2,3,4,5
)
select direction_urn,calendar_urn,count(*) as total,
 count(*) filter(where arr is null and dep is null) as no_boundary_clock,
 count(*) filter(where matches=0) as no_exact_match,
 count(*) filter(where matches=1) as single_candidate,
 count(*) filter(where matches>1) as multiple_candidates,
 count(*) filter(where dated_pairs>0) as both_sides_dated
from counts group by 1,2 order by 1,2;

-- 官方2026-03-14改正目黑站下行时刻表（只读核对发车分钟；不证明番号/车主/车型）。
-- https://www.tokyu.co.jp/railway/timetable/pdf/202603_mg01_meguro_2.pdf
with hours(h,weekday,holiday) as (values
 (5,'0 8 15 26 38 41 49 54 58','0 8 15 26 38 41 49 56'),
 (6,'5 11 14 21 24 27 33 37 41 45 49 53 55 58','4 8 14 21 24 29 36 44 50 56'),
 (7,'2 5 8 11 13 16 19 22 25 28 30 33 37 39 43 45 48 51 55 58','3 9 14 18 23 26 31 36 42 47 52 56 59'),
 (8,'1 4 6 9 12 15 18 20 23 25 28 30 33 35 38 41 43 46 48 51 53 56 59','4 10 13 19 25 28 34 40 43 49 55 58'),
 (9,'1 4 7 10 14 16 19 22 25 28 32 36 38 41 46 50 56','5 11 14 20 26 29 35 41 44 50 56 59'),
 (10,'0 6 13 16 22 27 29 35 41 44 52 56 59','5 11 14 20 26 30 36 41 44 50 56 59'),
 (11,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 44 50 56 59'),
 (12,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (13,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (14,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (15,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (16,'5 11 14 20 26 29 35 41 44 50 56 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (17,'5 11 15 20 25 29 32 37 42 46 49 55 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (18,'2 6 10 14 18 21 25 29 32 35 39 43 47 50 55 59','5 11 14 20 26 29 35 41 44 50 56 59'),
 (19,'2 5 10 14 17 20 24 29 32 36 39 43 47 50 54 59','5 11 14 20 26 29 34 41 46 51 56 59'),
 (20,'2 5 10 14 17 20 24 30 33 36 42 47 50 56','6 13 18 21 27 31 36 42 46 51 57'),
 (21,'2 6 11 17 19 26 33 36 42 48 52 57','0 8 15 21 24 30 38 46 53 55'),
 (22,'5 8 14 20 23 29 36 42 48 54 59','2 9 14 21 25 31 39 48 56'),
 (23,'2 8 15 23 32 35 41 51','5 13 19 22 32 40 51'),
 (0,'2 7 15 21 30','2 7 15 21 30')
), official as (
 select 'odpt.Calendar:Weekday'::text as cal,lpad(h::text,2,'0')||':'||lpad(m,2,'0') as clock
 from hours cross join lateral unnest(string_to_array(weekday,' ')) m
 union all
 select 'odpt.Calendar:SaturdayHoliday',lpad(h::text,2,'0')||':'||lpad(m,2,'0')
 from hours cross join lateral unnest(string_to_array(holiday,' ')) m
), db as (
 select t.id,t.calendar_urn as cal,t.train_number,min(s.departure_clock) as clock
 from public.manual_timetable_templates t join public.manual_timetable_template_stops s on s.template_id=t.id
 where t.line_key='TokyuMeguro' and t.direction_urn='odpt.RailDirection:Outbound'
 and s.departure_station_urn='odpt.Station:Tokyu.Meguro.Meguro' group by t.id,t.calendar_urn,t.train_number
)
select coalesce(o.cal,d.cal) as calendar,
 count(o.clock) as official_minutes,count(d.id) as db_rows,
 count(*) filter(where o.clock is not null and d.id is not null) as matched,
 array_agg(d.train_number||'@'||d.clock) filter(where o.clock is null) as extra_db,
 array_agg(o.clock) filter(where d.id is null) as missing_db
from official o full join db d on d.cal=o.cal and d.clock=o.clock group by 1 order by 1;

-- 第三方2026-03-14平日新横滨方向番号抽样：完整番号、目黑发车、东急线车种、终点均一致才算匹配。
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/destination/sh01
-- 仅作为交叉证据，不作运行时PNG真值，不覆盖数据库来源修订日。
with samples(number,clock,kind) as (values
 ('205-051','05:00','Local'),
 ('338-051','05:15','Local'),
 ('360-051','05:41','Express'),
 ('241-053','05:54','Local'),
 ('439-061','06:05','Local'),
 ('334-061','06:21','Local'),
 ('445-061','06:33','Local'),
 ('202-061','06:45','Local'),
 ('451-061','06:58','Local'),
 ('455-071','07:08','Local'),
 ('216-071','07:22','Local'),
 ('354-071','07:30','Local'),
 ('421-071','07:43','Local'),
 ('596-081','08:12','Express'),
 ('437-081','08:25','Express'),
 ('435-081','08:35','Local'),
 ('431-081','08:46','Local'),
 ('481-081','08:56','Local'),
 ('445-091','09:36','Local')
), db as (
 select t.id,t.train_number,t.train_type_urn,t.destination_urns,min(s.departure_clock) as clock
 from public.manual_timetable_templates t join public.manual_timetable_template_stops s on s.template_id=t.id
 where t.line_key='TokyuMeguro' and t.direction_urn='odpt.RailDirection:Outbound'
 and t.calendar_urn='odpt.Calendar:Weekday' and s.departure_station_urn='odpt.Station:Tokyu.Meguro.Meguro'
 group by t.id,t.train_number,t.train_type_urn,t.destination_urns
)
select count(*) as sample_rows,count(d.id) as exact_matches,
 array_agg(s.number) filter(where d.id is null) as unmatched
from samples s left join db d on d.train_number=s.number and d.clock=s.clock
 and d.train_type_urn='odpt.TrainType:Tokyu.'||s.kind
 and d.destination_urns=array['odpt.Station:Tokyu.TokyuShinYokohama.ShinYokohama']::text[];

-- 第三方2026-03-14平日日吉行：117条中排除1条武藏小山始发（无目黑发车），其余116条逐号对账。
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/destination/ty13-mg13-sh03
-- 仅审计：车次、到发、车种、终点一致不等于实际车型/车主已验证。
with samples(number,dep,arr,kind) as (values
 ('437-051','05:26','05:48','Local'),
 ('431-051','05:49','06:11','Local'),
 ('580-051','05:58','06:20','Local'),
 ('582-061','06:14','06:37','Local'),
 ('443-061','06:27','06:50','Local'),
 ('352-061','06:37','07:01','Local'),
 ('447-061','06:41','07:04','Local'),
 ('362-061','06:49','07:12','Local'),
 ('449-061','06:53','07:18','Local'),
 ('453-071','07:02','07:25','Local'),
 ('340-071','07:05','07:28','Local'),
 ('356-071','07:11','07:36','Local'),
 ('336-071','07:16','07:39','Local'),
 ('433-071','07:28','07:51','Local'),
 ('457-071','07:33','07:56','Local'),
 ('350-071','07:37','08:02','Local'),
 ('459-071','07:48','08:11','Local'),
 ('364-071','07:55','08:17','Local'),
 ('342-081','08:01','08:21','Express'),
 ('227-081','08:04','08:30','Local'),
 ('441-081','08:09','08:35','Local'),
 ('467-081','08:18','08:37','Express'),
 ('207-081','08:15','08:41','Local'),
 ('588-081','08:28','08:52','Local'),
 ('475-081','08:30','08:54','Local'),
 ('346-081','08:41','09:06','Local'),
 ('594-081','08:53','09:17','Local'),
 ('485-081','08:59','09:25','Local'),
 ('487-091','09:10','09:30','Express'),
 ('360-091','09:07','09:34','Local'),
 ('370-091','09:19','09:43','Local'),
 ('582-091','09:25','09:51','Local'),
 ('449-091','09:41','10:05','Local'),
 ('463-091','09:56','10:25','Local'),
 ('471-101','10:22','10:45','Local'),
 ('479-101','10:35','10:59','Local'),
 ('477-101','10:41','11:07','Local'),
 ('421-111','11:05','11:29','Local'),
 ('489-111','11:11','11:37','Local'),
 ('580-111','11:20','11:44','Local'),
 ('461-111','11:35','11:59','Local'),
 ('431-111','11:41','12:07','Local'),
 ('354-111','11:50','12:14','Local'),
 ('481-121','12:05','12:29','Local'),
 ('469-121','12:11','12:37','Local'),
 ('360-121','12:20','12:44','Local'),
 ('459-121','12:35','12:59','Local'),
 ('445-121','12:41','13:07','Local'),
 ('332-121','12:50','13:14','Local'),
 ('475-131','13:05','13:29','Local'),
 ('441-131','13:11','13:37','Local'),
 ('330-131','13:20','13:44','Local'),
 ('453-131','13:35','13:59','Local'),
 ('485-131','13:41','14:07','Local'),
 ('370-131','13:50','14:14','Local'),
 ('487-141','14:05','14:29','Local'),
 ('473-141','14:11','14:37','Local'),
 ('366-141','14:20','14:44','Local'),
 ('449-141','14:35','14:59','Local'),
 ('463-141','14:41','15:07','Local'),
 ('584-141','14:50','15:14','Local'),
 ('471-151','15:05','15:29','Local'),
 ('479-151','15:11','15:37','Local'),
 ('346-151','15:20','15:44','Local'),
 ('477-151','15:35','15:59','Local'),
 ('421-151','15:41','16:07','Local'),
 ('588-151','15:50','16:14','Local'),
 ('489-161','16:05','16:29','Local'),
 ('461-161','16:11','16:37','Local'),
 ('342-161','16:20','16:44','Local'),
 ('431-161','16:35','16:59','Local'),
 ('481-161','16:41','17:07','Local'),
 ('362-161','16:50','17:14','Local'),
 ('370-161','16:56','17:22','Local'),
 ('344-171','17:20','17:43','Local'),
 ('356-171','17:25','17:48','Local'),
 ('483-171','17:29','17:55','Local'),
 ('354-171','17:37','18:00','Local'),
 ('330-171','17:42','18:05','Local'),
 ('471-171','17:59','18:22','Local'),
 ('584-181','18:02','18:29','Local'),
 ('590-181','18:14','18:37','Local'),
 ('346-181','18:25','18:48','Local'),
 ('334-181','18:29','18:52','Local'),
 ('477-181','18:32','18:58','Local'),
 ('639-181','18:39','19:02','Local'),
 ('487-181','18:47','19:13','Local'),
 ('596-191','19:05','19:25','Express'),
 ('459-191','19:10','19:33','Local'),
 ('364-191','19:17','19:43','Local'),
 ('332-191','19:24','19:47','Local'),
 ('431-191','19:29','19:52','Local'),
 ('586-191','19:32','19:59','Local'),
 ('481-191','19:39','20:04','Local'),
 ('594-191','19:54','20:17','Local'),
 ('201-191','19:59','20:22','Local'),
 ('592-201','20:02','20:28','Local'),
 ('453-201','20:10','20:33','Local'),
 ('483-201','20:24','20:49','Local'),
 ('356-201','20:30','20:53','Local'),
 ('473-201','20:56','21:20','Local'),
 ('588-211','21:02','21:28','Local'),
 ('441-211','21:17','21:42','Local'),
 ('477-211','21:26','21:50','Local'),
 ('445-211','21:42','22:06','Local'),
 ('346-211','21:48','22:17','Local'),
 ('582-211','21:57','22:22','Local'),
 ('368-221','22:05','22:31','Local'),
 ('481-221','22:36','22:59','Local'),
 ('354-221','22:48','23:11','Local'),
 ('586-221','22:54','23:17','Local'),
 ('471-221','22:59','23:25','Local'),
 ('370-231','23:35','23:55','Express'),
 ('485-231','23:32','23:58','Local'),
 ('208-231','23:51','00:14','Local'),
 ('221-241','00:15','00:41','Local')
), db as (
 select t.id,t.train_number,t.train_type_urn,t.destination_urns,
 min(s.departure_clock) filter(where s.departure_station_urn='odpt.Station:Tokyu.Meguro.Meguro') as dep,
 min(s.arrival_clock) filter(where s.arrival_station_urn='odpt.Station:Tokyu.Meguro.Hiyoshi') as arr
 from public.manual_timetable_templates t join public.manual_timetable_template_stops s on s.template_id=t.id
 where t.line_key='TokyuMeguro' and t.direction_urn='odpt.RailDirection:Outbound'
 and t.calendar_urn='odpt.Calendar:Weekday'
 group by t.id,t.train_number,t.train_type_urn,t.destination_urns
)
select count(*) as sample_rows,count(d.id) as number_found,
 count(*) filter(where d.dep=s.dep and d.train_type_urn='odpt.TrainType:Tokyu.'||s.kind
  and d.destination_urns=array['odpt.Station:Tokyu.Meguro.Hiyoshi']::text[]) as four_field_match,
 count(*) filter(where d.dep=s.dep and d.arr=s.arr and d.train_type_urn='odpt.TrainType:Tokyu.'||s.kind
  and d.destination_urns=array['odpt.Station:Tokyu.Meguro.Hiyoshi']::text[]) as five_field_match,
 json_agg(json_build_object('number',s.number,'source_dep',s.dep,'db_dep',d.dep,'source_arr',s.arr,'db_arr',d.arr,'db_dest',d.destination_urns))
 filter(where d.id is null or d.dep is distinct from s.dep or d.arr is distinct from s.arr
 or d.train_type_urn is distinct from ('odpt.TrainType:Tokyu.'||s.kind)
 or d.destination_urns is distinct from array['odpt.Station:Tokyu.Meguro.Hiyoshi']::text[]) as mismatches
from samples s left join db d on d.train_number=s.number;

-- 2026-03-14日吉上行：平日6、7、9、12、23时台及土休日7时台；独立运用表交叉核验，不作物理车辆确认。
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/downstream/06/departure
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/downstream/07/departure
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/downstream/09/departure
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/downstream/12/departure
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/weekday/downstream/23/departure
-- https://www.train.chokopy.net/unyo-search/Meguro/2026-03-14/saturdayholiday/downstream/07/departure
with samples(cal,number,dep,arr,kind,dest) as (values
('Weekday','207-062','06:02','06:18','Express','NishiTakashimadaira'),
('Weekday','437-062','06:06','06:31','Local','NishiTakashimadaira'),
('Weekday','642-062','06:11','06:28','Express','UrawaMisono'),
('Weekday','638-062','06:14','06:38','Local','UrawaMisono'),
('Weekday','431-062','06:22','06:45','Local','NishiTakashimadaira'),
('Weekday','360-062','06:25','06:49','Local','UrawaMisono'),
('Weekday','633-062','06:31','06:53','Local','NishiTakashimadaira'),
('Weekday','241-062','06:34','07:04','Local','NishiTakashimadaira'),
('Weekday','236-062','06:40','06:57','Express','UrawaMisono'),
('Weekday','582-062','06:45','07:09','Local','UrawaMisono'),
('Weekday','580-062','06:49','07:15','Local','Hatogaya'),
('Weekday','439-062','06:55','07:12','Express','NishiTakashimadaira'),
('Weekday','443-062','06:57','07:24','Local','NishiTakashimadaira'),
('Weekday','238-062','07:01','07:21','Express','UrawaMisono'),
('Weekday','334-064','07:04','07:27','Local','UrawaMisono'),
('Weekday','352-072','07:08','07:34','Local','Hatogaya'),
('Weekday','447-072','07:11','07:38','Local','NishiTakashimadaira'),
('Weekday','635-072','07:14','07:31','Express','NishiTakashimadaira'),
('Weekday','445-072','07:17','07:44','Local','NishiTakashimadaira'),
('Weekday','230-072','07:21','07:41','Express','UrawaMisono'),
('Weekday','449-072','07:23','07:49','Local','NishiTakashimadaira'),
('Weekday','362-072','07:28','07:54','Local','Hatogaya'),
('Weekday','202-072','07:31','07:51','Express','UrawaMisono'),
('Weekday','340-072','07:33','07:59','Local','UrawaMisono'),
('Weekday','639-072','07:36','07:56','Express','NishiTakashimadaira'),
('Weekday','453-072','07:39','08:05','Local','NishiTakashimadaira'),
('Weekday','451-072','07:43','08:10','Local','NishiTakashimadaira'),
('Weekday','240-072','07:46','08:07','Express','UrawaMisono'),
('Weekday','336-072','07:48','08:15','Local','Hatogaya'),
('Weekday','631-072','07:51','08:12','Express','Takashimadaira'),
('Weekday','356-072','07:54','08:20','Local','OjiKamiya'),
('Weekday','455-072','07:56','08:17','Express','NishiTakashimadaira'),
('Weekday','433-072','07:58','08:25','Local','Takashimadaira'),
('Weekday','441-092','09:03','09:30','Local','NishiTakashimadaira'),
('Weekday','212-082','09:06','09:25','Express','UrawaMisono'),
('Weekday','437-092','09:09','09:33','Local','Takashimadaira'),
('Weekday','346-092','09:14','09:40','Local','UrawaMisono'),
('Weekday','213-092','09:17','09:36','Express','NishiTakashimadaira'),
('Weekday','435-092','09:20','09:44','Local','Takashimadaira'),
('Weekday','594-092','09:25','09:51','Local','UrawaMisono'),
('Weekday','431-092','09:30','09:48','Express','NishiTakashimadaira'),
('Weekday','485-092','09:33','09:56','Local','NishiTakashimadaira'),
('Weekday','481-092','09:40','10:05','Local','NishiTakashimadaira'),
('Weekday','217-092','09:45','10:03','Express','NishiTakashimadaira'),
('Weekday','360-092','09:48','10:10','Local','UrawaMisono'),
('Weekday','487-092','09:54','10:16','Local','NishiTakashimadaira'),
('Weekday','205-092','09:58','10:23','Local','NishiTakashimadaira'),
('Weekday','588-112','12:04','12:21','Express','UrawaMisono'),
('Weekday','461-122','12:07','12:29','Local','NishiTakashimadaira'),
('Weekday','336-122','12:13','12:38','Local','AkabaneIwabuchi'),
('Weekday','639-122','12:19','12:36','Express','NishiTakashimadaira'),
('Weekday','354-122','12:22','12:44','Local','UrawaMisono'),
('Weekday','431-122','12:28','12:53','Local','NishiTakashimadaira'),
('Weekday','212-122','12:34','12:51','Express','AkabaneIwabuchi'),
('Weekday','481-122','12:37','12:59','Local','NishiTakashimadaira'),
('Weekday','346-122','12:43','13:08','Local','UrawaMisono'),
('Weekday','227-122','12:49','13:06','Express','NishiTakashimadaira'),
('Weekday','360-122','12:52','13:14','Local','AkabaneIwabuchi'),
('Weekday','469-122','12:58','13:23','Local','NishiTakashimadaira'),
('Weekday','461-232','23:08','23:30','Local','NishiTakashimadaira'),
('Weekday','481-232','23:14','23:39','Local','NishiTakashimadaira'),
('Weekday','580-232','23:19','23:36','Express','UrawaMisono'),
('Weekday','586-232','23:24','23:46','Local','UrawaMisono'),
('Weekday','231-232','23:29','23:33','Local','MusashiKosugi'),
('Weekday','471-232','23:32','23:54','Local','Takashimadaira'),
('Weekday','594-232','23:36','23:58','Local','Hatogaya'),
('Weekday','340-232','23:49','00:11','Local','Meguro'),
('SaturdayHoliday','443-072','07:04','07:26','Local','NishiTakashimadaira'),
('SaturdayHoliday','332-072','07:10','07:32','Local','Hatogaya'),
('SaturdayHoliday','206-072','07:19','07:46','Local','Hatogaya'),
('SaturdayHoliday','445-072','07:24','07:43','Express','NishiTakashimadaira'),
('SaturdayHoliday','340-072','07:27','07:49','Local','UrawaMisono'),
('SaturdayHoliday','447-072','07:31','07:53','Local','NishiTakashimadaira'),
('SaturdayHoliday','352-072','07:35','07:57','Local','UrawaMisono'),
('SaturdayHoliday','635-072','07:39','08:02','Local','NishiTakashimadaira'),
('SaturdayHoliday','334-074','07:45','08:07','Local','UrawaMisono'),
('SaturdayHoliday','336-072','07:50','08:12','Local','UrawaMisono'),
('SaturdayHoliday','453-072','07:56','08:21','Local','NishiTakashimadaira')
), db as (
 select t.id,t.calendar_urn,t.train_number,t.train_type_urn,t.destination_urns,
 min(s.departure_clock) filter(where s.departure_station_urn='odpt.Station:Tokyu.Meguro.Hiyoshi') as dep,
 min(s.arrival_clock) filter(where s.arrival_station_urn='odpt.Station:Tokyu.Meguro.Meguro') as arr,
 min(s.arrival_clock) filter(where s.arrival_station_urn='odpt.Station:Tokyu.Meguro.MusashiKosugi') as kosugi_arr
 from public.manual_timetable_templates t join public.manual_timetable_template_stops s on s.template_id=t.id
 where t.line_key='TokyuMeguro' and t.direction_urn='odpt.RailDirection:Inbound'
 and t.calendar_urn in ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 group by t.id,t.calendar_urn,t.train_number,t.train_type_urn,t.destination_urns
), candidates as (
 select s.cal,s.number,s.dep,s.arr as published_arr,s.dest,d.train_number as import_id,
 case when s.dest='MusashiKosugi' then d.kosugi_arr else d.arr end as database_arr,
 count(d.id) over(partition by s.cal,s.number,s.dep) as candidate_count
 from samples s left join db d on d.calendar_urn='odpt.Calendar:'||s.cal and s.dep=d.dep
 and d.train_type_urn='odpt.TrainType:Tokyu.'||s.kind
 and d.destination_urns=array[case when s.dest in ('NishiTakashimadaira','Takashimadaira') then 'odpt.Station:Toei.Mita.'
 when s.dest in ('OjiKamiya','AkabaneIwabuchi') then 'odpt.Station:TokyoMetro.Namboku.'
 when s.dest in ('Meguro','MusashiKosugi') then 'odpt.Station:Tokyu.Meguro.'
 else 'odpt.Station:SaitamaRailway.SaitamaRailway.' end||s.dest]::text[]
), classified as (
 select *,case when candidate_count=1 and published_arr=database_arr then 'exact_boundary_candidate'
 when candidate_count=1 and database_arr is null then 'missing_boundary_clock'
 when candidate_count=1 then 'arrival_clock_conflict' else 'unresolved' end as status
 from candidates
)
select * from classified order by cal,case when left(dep,2)='00' then '24'||substring(dep,3) else dep end,number;

-- 已发现终点前截断的深夜样本：只读列出实际停站，避免将跨午夜误作时刻缺失的唯一原因。
select t.train_number,s.stop_sequence,s.arrival_station_urn,s.departure_station_urn,s.arrival_clock,s.departure_clock
from public.manual_timetable_templates t join public.manual_timetable_template_stops s on s.template_id=t.id
where t.line_key='TokyuMeguro' and t.calendar_urn='odpt.Calendar:Weekday'
and t.train_number in ('TKYMeguroIW237','TKYMeguroIW240')
order by t.train_number,s.stop_sequence;
