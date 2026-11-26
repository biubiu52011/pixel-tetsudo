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
