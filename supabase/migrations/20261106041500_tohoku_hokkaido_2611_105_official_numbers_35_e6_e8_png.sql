-- JR East official 2026-11 printed "東北・山形・秋田・北海道新幹線":
-- official paired 列車名/列車番号, full weekday train-number evidence.
-- 25 Hokkaido (railway owner JR-Hokkaido), 80 Tohoku (JR-East).
-- Do not convert mixed H5/E5, coupled physical sets or old name suffix
-- into exact fleet PNG without source-scoped unique official model plan.
-- Excludes the old Tohoku template Hayabusa39 (not found in 2611)
-- and does not infer SaturdayHoliday operations from weekday sources.
BEGIN;
WITH official(line_key,service_name,full_number,direction,official_source_url) AS
(VALUES
 ('HokkaidoShinkansen','はやて91','91B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやて93','93B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ95','3095B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ1','3001B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ5','5B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ11','11B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ17','17B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ23','3023B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ25','3025B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ27','3027B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ31','3031B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ35','3035B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('HokkaidoShinkansen','はやぶさ10','3010B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ12','3012B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ16','3016B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ18','3018B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ24','3024B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ28','3028B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ32','3032B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ36','3036B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ40','40B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ44','44B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやぶさ96','3096B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやて98','98B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('HokkaidoShinkansen','はやて100','100B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa109','4109B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Hayabusa111','4111B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Hayabusa29','29B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko201','201B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko203','203B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko131','131B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko141','141B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko211','211B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko143','143B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko145','145B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko213','213B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko219','219B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko221','221B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Yamabiko223','223B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno251','251B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno259','259B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno261','261B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno269','269B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno273','273B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno275','275B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno277','277B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Nasuno279','279B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi27','3027M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi31','3031M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi35','3035M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi37','3037M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi39','3039M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Komachi41','3041M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa121','121B','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa123','123M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa135','135M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa137','137M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa139','139M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa141','141M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa143','143M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa149','149M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa153','153M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa157','157M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Tsubasa159','159M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('TohokuShinkansen','Hayabusa102','4102B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa104','4104B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa6','3006B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa106','4106B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa8','8B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Hayabusa44','44B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko202','202B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko204','204B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko124','124B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko126','1126B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko128','128B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko210','210B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko130','1130B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko132','132B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko134','1134B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko138','138B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko220','220B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Yamabiko222','222B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Nasuno268','268B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Nasuno270','270B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Nasuno272','272B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Nasuno274','274B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Nasuno276','276B','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi6','3006M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi10','3010M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi12','3012M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi32','3032M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi34','3034M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi36','3036M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi42','3042M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Komachi44','3044M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa122','122M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa124','124M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa132','132M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa138','138M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa140','140M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa148','148M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa154','154M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa156','156M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa158','158M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('TohokuShinkansen','Tsubasa160','160M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html')
), matched AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,o.full_number,o.official_source_url
 FROM official o JOIN public.manual_timetable_templates m
 ON m.line_key=o.line_key
 AND m.train_number=o.service_name
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:'||o.direction
 AND m.railway_urn='odpt.Railway:'||
   (CASE WHEN o.line_key='HokkaidoShinkansen' THEN 'JR-Hokkaido' ELSE 'JR-East' END)||'.'||o.line_key
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
 m.full_number,m.id,m.official_source_url,'train_number_only'
FROM matched m
WHERE (SELECT COUNT(*) FROM matched)=105
  AND (SELECT COUNT(DISTINCT id) FROM matched)=105
ON CONFLICT DO NOTHING;

-- E6/E8 train-specific plans are already validated in the existing
-- canonical SQL. Only those 35 trains with a native generic PNG receive
-- exact singleton roster entries. No upgrade to real-carset confirmation.
WITH eligible AS (
 SELECT e.*,SUBSTRING(e.train_number FROM '^[0-9]+')::integer AS digits,
        SUBSTRING(e.train_number FROM '[A-Z]$') AS suffix,vm.vehicle_type,
        a.image_path
 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates m
   ON m.id=e.source_template_id AND m.line_key=e.line_key
   AND m.calendar_urn=e.calendar_urn AND m.direction_urn=e.direction_urn
 JOIN public.train_timetable_members tm ON tm.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
   ON vm.timetable_id=tm.timetable_id
   AND vm.source_template_id=m.id
   AND vm.mapping_level='official_service_vehicle_plan'
   AND vm.vehicle_type IN ('E6系','E8系')
   AND vm.actual_vehicle_confirmed=false
 JOIN public.vehicle_image_assets a
   ON a.operator='JR-East' AND a.vehicle_type=vm.vehicle_type
   AND a.image_path='images/列车/JR東日本/JR東日本_'||vm.vehicle_type||'.png'
   AND a.asset_status='available' AND a.is_generic=true
   AND a.file_format_status='native_png'
 WHERE e.edition='2611' AND e.line_key='TohokuShinkansen'
   AND e.calendar_urn='odpt.Calendar:Weekday'
   AND e.verification_scope='train_number_only'
   AND e.train_number~'^[0-9]{1,5}[BM]$'
   AND m.railway_urn='odpt.Railway:JR-East.TohokuShinkansen'
)
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
SELECT edition,line_key,'weekday_verified_single_number',digits,digits,suffix,
 vehicle_type,'../'||image_path,official_source_url,true,false
FROM eligible WHERE (SELECT COUNT(*) FROM eligible)=35
ON CONFLICT DO NOTHING;
COMMIT;
