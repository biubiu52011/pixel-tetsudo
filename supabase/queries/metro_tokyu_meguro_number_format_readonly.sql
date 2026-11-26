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
