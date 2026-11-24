-- 2026-11-24: repair terminal metadata on undated Yamagata reference templates.
-- Existing last stop and official detail title agree on Yamagata.
-- 2612 links corroborate endpoint only; do not infer 2611 operating dates or clocks.
-- 704 Tsubasa 87: https://timetables.jreast.co.jp/2612/train/025/025611.html
-- 706 Tsubasa 93: https://timetables.jreast.co.jp/2612/train/025/025631.html
-- 707 Tsubasa 97: https://timetables.jreast.co.jp/2611/train/185/188061.html
-- 710 Tsubasa 127: https://timetables.jreast.co.jp/2611/train/000/002071.html
-- 711 Tsubasa 129: https://timetables.jreast.co.jp/2611/train/075/076071.html
-- 714 Tsubasa 135: https://timetables.jreast.co.jp/2611/train/030/030131.html
-- 716 Tsubasa 139: https://timetables.jreast.co.jp/2612/train/075/076101.html
-- 718 Tsubasa 143: https://timetables.jreast.co.jp/2611/train/030/030101.html
-- 720 Tsubasa 149: https://timetables.jreast.co.jp/2612/train/030/033821.html
-- 721 Tsubasa 153: https://timetables.jreast.co.jp/2612/train/030/033831.html
-- 723 Tsubasa 159: https://timetables.jreast.co.jp/2611/train/075/076091.html
-- 726 Tsubasa 195: https://timetables.jreast.co.jp/2611/train/020/022671.html
with target as (
select t.id from manual_timetable_templates t
join train_timetable_members m on m.source_template_id=t.id
join train_timetables c on c.id=m.timetable_id
join lateral (select coalesce(s.arrival_station_urn,s.departure_station_urn) station from manual_timetable_template_stops s where s.template_id=t.id order by s.stop_sequence desc limit 1) last_stop on true
where t.id in (704,706,707,710,711,714,716,718,720,721,723,726)
and t.line_key='YamagataShinkansen'
and t.destination_urns=array['odpt.Station:JR-East.YamagataShinkansen.Shinjo']::text[]
and last_stop.station='odpt.Station:JR-East.YamagataShinkansen.Yamagata'
and coalesce(cardinality(t.operating_dates),0)=0
and c.timetable_validity='undated_not_current_verified'
and c.group_evidence='source_only'
), updated as (
update manual_timetable_templates t set destination_urns=array['odpt.Station:JR-East.YamagataShinkansen.Yamagata']::text[]
from target where t.id=target.id and (select count(*) from target)=12
returning t.id,t.train_number,t.destination_urns
) select * from updated order by id;
