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
