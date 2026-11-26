-- 千代田线直通/支线车型的只读来源快照；仅供实时明确车主、车型条件回放。
-- S末位变体保留；只有绫濑/北绫濑两站的区间记录被纳入。
-- source_revision_date 未填写，不能宣称现行时刻表已经核实。
with source as (
 select m.*, (select array_agg(distinct regexp_replace(coalesce(s.arrival_station_urn,s.departure_station_urn),'^.*\.','')) from public.manual_timetable_template_stops s where s.template_id=m.id) stations
 from public.manual_timetable_templates m where m.line_key in ('Chiyoda','ChiyodaBranch')
 and (m.train_number ~ '^[AB][0-9]{3,4}[KE]$' or m.train_number ~ '^[AB][0-9]{3,4}S[0-9]+$')
 and m.calendar_urn in ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
), grouped as (
 select line_key,case when calendar_urn like '%Weekday' then 'weekday' else 'holiday' end cal,
 case when train_number ~ 'S[0-9]+$' then 'shuttle' when train_type_urn like '%.LimitedExpress' then 'mse' when right(train_number,1)='K' then 'jr' else 'odakyu' end family,
 regexp_replace(train_type_urn,'^.*\.','') type, array_agg(distinct train_number order by train_number) numbers,count(source_revision_date) dated
 from source where train_number !~ 'S[0-9]+$' or stations <@ array['Ayase','KitaAyase']::text[] and cardinality(stations)=2
 group by 1,2,3,4
) select * from grouped order by line_key,cal,family,type;
