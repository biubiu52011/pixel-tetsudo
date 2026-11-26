-- 地下铁番号映射最终只读验收，范围为东京Metro、都营、横滨市营17个线路键（含两支线）。
-- 既有SQL号段与运行时证据分离；缺少纯号段不等于无番号或无车型。
-- 横滨官方现行目录：https://ckan.odpt.org/dataset/yokohama_municipal_train
-- 20251226版有效至2026-12-31；旧模板无来源修订日，本查询不把它们升级为现行。
WITH lines(line_key) AS (
 VALUES ('Ginza'),('Marunouchi'),('MarunouchiBranch'),('Hibiya'),('Tozai'),('Chiyoda'),
 ('ChiyodaBranch'),('Yurakucho'),('Hanzomon'),('Namboku'),('Fukutoshin'),
 ('Asakusa'),('Mita'),('Shinjuku'),('Oedo'),('YokohamaBlue'),('YokohamaGreen')
), p AS (
 SELECT r.* FROM public.published_train_png_number_ranges r JOIN lines l USING(line_key)
 WHERE r.edition='2611'
), range_summary AS (
 SELECT l.line_key,count(p.line_key) range_rows,count(distinct p.png_reference) pngs,
 count(*) FILTER(WHERE p.actual_vehicle_confirmed) actual_vehicle_rows,
 count(*) FILTER(WHERE p.requires_exact_roster) exact_guard_rows
 FROM lines l LEFT JOIN p USING(line_key) GROUP BY 1
), collisions AS (
 SELECT count(*) n FROM p a JOIN p b ON a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.png_reference<b.png_reference AND a.min_number<=b.max_number AND b.min_number<=a.max_number
), y AS (
 SELECT m.* FROM public.manual_timetable_templates m WHERE m.line_key IN ('YokohamaBlue','YokohamaGreen')
), y_cal AS (
 SELECT line_key,calendar_urn,count(*) templates,count(distinct train_number) full_numbers,
 count(*) FILTER(WHERE source_revision_date IS NOT NULL) dated_templates
 FROM y GROUP BY 1,2
), y_suffix AS (
 SELECT line_key,right(train_number,1) suffix,direction_urn,count(*) templates,
 count(distinct train_number) full_numbers
 FROM y GROUP BY 1,2,3
), y_fleet AS (
 SELECT y.line_key,r.mapping_level,r.vehicle_type,count(*) templates,
 count(distinct y.train_number) full_numbers,
 count(*) FILTER(WHERE r.vehicle_artwork_path IS NOT NULL) artwork
 FROM y JOIN public.train_timetable_source_resolution r ON r.source_template_id=y.id GROUP BY 1,2,3
), y_assets AS (
 SELECT vehicle_type,image_path,asset_status,asset_scope
 FROM public.vehicle_image_assets WHERE operator='YokohamaMunicipal'
 AND image_path LIKE '%横浜市交通局/%'
), ready AS (
 SELECT count(*) old_wide_rows FROM p WHERE
 (line_key='Hibiya' AND suffix='S' AND min_number=502 AND max_number=2468)
 OR (line_key='Hanzomon' AND ((suffix='S' AND min_number=551 AND max_number=2491)
 OR (suffix='K' AND min_number=501 AND max_number=2333)
 OR (suffix='T' AND min_number=452 AND max_number=2282)))
), pending_seibu AS (
 SELECT count(*) n FROM public.manual_timetable_templates WHERE line_key='Ikebukuro'
 AND source_path='data/timetables/Ikebukuro-manual.js'
 AND train_type_urn='odpt.TrainType:Seibu.F-Liner'
 AND vehicle_type_label='西武40000系 / 東武50070系 / メトロ17000系 / 東急5050系4000番台'
)
SELECT jsonb_build_object(
 'ranges',(SELECT jsonb_agg(to_jsonb(s) ORDER BY line_key) FROM range_summary s),
 'total_ranges',(SELECT count(*) FROM p),
 'lines_with_ranges',(SELECT count(distinct line_key) FROM p),
 'cross_png_overlap',(SELECT n FROM collisions),
 'yokohama_calendar',(SELECT jsonb_agg(to_jsonb(c) ORDER BY line_key,calendar_urn) FROM y_cal c),
 'yokohama_suffix',(SELECT jsonb_agg(to_jsonb(s) ORDER BY line_key,suffix,direction_urn) FROM y_suffix s),
 'yokohama_distinct',(SELECT count(distinct (line_key,train_number)) FROM y),
 'yokohama_fleet',(SELECT jsonb_agg(to_jsonb(f) ORDER BY line_key,vehicle_type) FROM y_fleet f),
 'yokohama_assets',(SELECT jsonb_agg(to_jsonb(a) ORDER BY image_path) FROM y_assets a),
 'wide_ranges_pending',(SELECT old_wide_rows FROM ready),
 'seibu_labels_pending',(SELECT n FROM pending_seibu)
) audit;


-- 2026-11-27：旧模板缺来源修订日，不能由导入时间或运营方改点公告推定逐条版本。
-- 只读检查现有 revision 外键、有效日起及来源内容哈希；没有明确绑定的记录不得批量升级。
select m.line_key,count(*) as templates,count(m.source_revision_date) as dated,
 count(m.revision_id) as revision_linked,count(r.effective_from) as linked_effective_date,
 count(*) filter(where r.line_id=m.line_key and r.effective_from is not null and r.source_content_hash is not null) as linked_hashed_revision
from public.manual_timetable_templates m left join public.timetable_revisions r on r.id=m.revision_id
where m.line_key in ('Ginza','Marunouchi','MarunouchiBranch','Hibiya','Tozai','Chiyoda','ChiyodaBranch','Yurakucho','Hanzomon','Namboku','Fukutoshin','Asakusa','Mita','Shinjuku','Oedo','YokohamaBlue','YokohamaGreen','TokyuMeguro')
group by 1 order by 1;

-- 2026-11-27 来源批次与原始车次ID可恢复性；导入时间不是改点日期。
select case when source_path like 'odpt-api:%' then 'ODPT' else 'manual' end as origin,
 count(*) as templates,count(distinct line_key) as lines,count(nullif(source_trip_id,'')) as trip_ids,
 count(distinct (line_key,calendar_urn,source_trip_id)) filter(where nullif(source_trip_id,'') is not null) as unique_scoped_ids,
 count(nullif(physical_service_key,'')) as physical_keys,count(source_revision_date) as dated
from public.manual_timetable_templates
where line_key in ('Ginza','Marunouchi','MarunouchiBranch','Hibiya','Tozai','Chiyoda','ChiyodaBranch','Yurakucho','Hanzomon','Namboku','Fukutoshin','Mita','YokohamaBlue','YokohamaGreen','TokyuMeguro')
group by 1 order by 1;

-- 2026-11-27 ODPT原始ID、线路、日历、番号、方向、种别、终点及完整停站顺序内容指纹。
-- 仅比较现行官方来源与旧库快照内容；MD5用于非安全内容比较，不用于认证或实际车型判定。
with source_rows as (
 select m.id,m.line_key,m.calendar_urn,m.source_trip_id,m.source_revision_date,
 md5(jsonb_build_array(m.source_trip_id,m.railway_urn,m.calendar_urn,m.train_number,m.direction_urn,m.train_type_urn,coalesce(to_jsonb(m.destination_urns),'[]'::jsonb),
 coalesce((select jsonb_agg(jsonb_build_array(s.arrival_station_urn,s.departure_station_urn,s.arrival_clock,s.departure_clock) order by s.stop_sequence) from public.manual_timetable_template_stops s where s.template_id=m.id),'[]'::jsonb))::text) as fingerprint
 from public.manual_timetable_templates m
 where m.line_key in ('Ginza','Marunouchi','Hibiya','Tozai','Yurakucho','Mita','YokohamaBlue') and m.source_path='odpt-api:v1:'||m.line_key
)
select line_key,calendar_urn,count(*) as records,count(distinct source_trip_id) as distinct_ids,count(source_revision_date) as dated,
 md5(string_agg(fingerprint,'' order by fingerprint collate "C")) as fingerprint
from source_rows group by 1,2 order by 1,2;
