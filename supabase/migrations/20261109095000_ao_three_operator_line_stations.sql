-- Verified Ao interchange: JR West platforms 1/2, Hojo Railway 3, Kobe Electric Railway 4.
-- https://eki.jr-odekake.net/premises?id=0611506
-- Station order: published route station lists (20 + 8); coordinates: 2024
-- MLIT N02 geography as curated in antfu/mlit-json. No live/timetable APIs.
BEGIN;
SELECT pg_advisory_xact_lock(26110915);
INSERT INTO public.railway_lines
 (id,odpt_operator,odpt_railway,odpt_base_url,timetable_operator,timetable_api_enabled,
  realtime_position_api_enabled,sql_planned_fallback_enabled)
VALUES
 ('ShintetsuAo',null,null,null,'KobeDentetsu',false,false,false),
 ('HojoRailway',null,null,null,'HojoRailway',false,false,false)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.stations(id,name,latitude,longitude) VALUES
 ('Suzurandai','Suzurandai',34.723635,135.14588),
 ('Suzurandai-Nishiguchi','Suzurandai-Nishiguchi',34.72653,135.140765),
 ('Nishi-Suzurandai','Nishi-Suzurandai',34.725825,135.135013),
 ('Aina-Kobe','Aina-Kobe',34.73238,135.11822),
 ('Kizu-Kobe','Kizu-Kobe',34.744062,135.088534),
 ('Kobata-Kobe','Kobata-Kobe',34.748305,135.071385),
 ('Sakae-Kobe','Sakae-Kobe',34.75525,135.05653),
 ('Oshibedani','Oshibedani',34.756577,135.03939),
 ('Midorigaoka-Kobe','Midorigaoka-Kobe',34.765198,135.0258),
 ('Hirono-Golfjo-Mae','Hirono-Golfjo-Mae',34.770045,135.02323),
 ('Shijimi','Shijimi',34.782485,135.00759),
 ('Ebisu-Kobe','Ebisu-Kobe',34.797755,134.998575),
 ('Miki-Uenomaru','Miki-Uenomaru',34.799965,134.988805),
 ('Miki-Kobe','Miki-Kobe',34.799782,134.981884),
 ('Omura-Kobe','Omura-Kobe',34.808645,134.97152),
 ('Kashiyama','Kashiyama',34.820475,134.949805),
 ('Ichiba-Kobe','Ichiba-Kobe',34.82431,134.944565),
 ('Ono-Hyogo','Ono-Hyogo',34.843135,134.934225),
 ('Hata','Hata',34.850125,134.91993),
 ('Abiki','Abiki',34.862035,134.878085),
 ('Tahara-Hojo','Tahara-Hojo',34.865485,134.86684),
 ('Hokkeguchi','Hokkeguchi',34.87527,134.856365),
 ('Harima-Shimosato','Harima-Shimosato',34.88628,134.840215),
 ('Osa-Hojo','Osa-Hojo',34.896415,134.825725),
 ('Harima-Yokota','Harima-Yokota',34.910435,134.825335),
 ('Hojo-Machi','Hojo-Machi',34.929137,134.83217)
ON CONFLICT(id) DO NOTHING;
-- Existing source geometry for Aou remains owned by KakogawaLine.
DO $baseline$
BEGIN
 IF (SELECT count(*) FROM public.railway_lines WHERE id IN ('ShintetsuAo','HojoRailway'))<>2
 OR (SELECT count(*) FROM public.stations WHERE id IN ('Suzurandai','Suzurandai-Nishiguchi','Nishi-Suzurandai','Aina-Kobe','Kizu-Kobe','Kobata-Kobe','Sakae-Kobe','Oshibedani','Midorigaoka-Kobe','Hirono-Golfjo-Mae','Shijimi','Ebisu-Kobe','Miki-Uenomaru','Miki-Kobe','Omura-Kobe','Kashiyama','Ichiba-Kobe','Ono-Hyogo','Hata','Abiki','Tahara-Hojo','Hokkeguchi','Harima-Shimosato','Osa-Hojo','Harima-Yokota','Hojo-Machi'))<>26
 OR NOT EXISTS(SELECT 1 FROM public.stations WHERE id='Aou')
 THEN RAISE EXCEPTION 'Ao cross-operator physical station/line baseline missing'; END IF;
END $baseline$;
-- The line_stations identity sequence was behind max(id) before this migration.
SELECT setval(pg_get_serial_sequence('public.line_stations','id'),
 GREATEST((SELECT max(id) FROM public.line_stations),
 (SELECT last_value FROM public.line_stations_id_seq)),true);
WITH expected(line_id,station_name,station_index) AS (
 VALUES
 ('ShintetsuAo','Suzurandai',0),
 ('ShintetsuAo','Suzurandai-Nishiguchi',1),
 ('ShintetsuAo','Nishi-Suzurandai',2),
 ('ShintetsuAo','Aina-Kobe',3),
 ('ShintetsuAo','Kizu-Kobe',4),
 ('ShintetsuAo','Kobata-Kobe',5),
 ('ShintetsuAo','Sakae-Kobe',6),
 ('ShintetsuAo','Oshibedani',7),
 ('ShintetsuAo','Midorigaoka-Kobe',8),
 ('ShintetsuAo','Hirono-Golfjo-Mae',9),
 ('ShintetsuAo','Shijimi',10),
 ('ShintetsuAo','Ebisu-Kobe',11),
 ('ShintetsuAo','Miki-Uenomaru',12),
 ('ShintetsuAo','Miki-Kobe',13),
 ('ShintetsuAo','Omura-Kobe',14),
 ('ShintetsuAo','Kashiyama',15),
 ('ShintetsuAo','Ichiba-Kobe',16),
 ('ShintetsuAo','Ono-Hyogo',17),
 ('ShintetsuAo','Hata',18),
 ('ShintetsuAo','Aou',19),
 ('HojoRailway','Aou',0),
 ('HojoRailway','Abiki',1),
 ('HojoRailway','Tahara-Hojo',2),
 ('HojoRailway','Hokkeguchi',3),
 ('HojoRailway','Harima-Shimosato',4),
 ('HojoRailway','Osa-Hojo',5),
 ('HojoRailway','Harima-Yokota',6),
 ('HojoRailway','Hojo-Machi',7)
)
INSERT INTO public.line_stations(line_id,station_name,station_index)
SELECT x.line_id,x.station_name,x.station_index FROM expected x
WHERE NOT EXISTS (
 SELECT 1 FROM public.line_stations current
 WHERE current.line_id=x.line_id AND current.station_index=x.station_index
);
DO $validate$
BEGIN
 IF (SELECT count(*) FROM public.line_stations WHERE line_id='ShintetsuAo')<>20
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='HojoRailway')<>8
 OR (SELECT count(*) FROM public.line_stations WHERE station_name='Aou'
       AND line_id IN ('KakogawaLine','ShintetsuAo','HojoRailway'))<>3
 OR EXISTS (SELECT 1 FROM public.line_stations l
    LEFT JOIN public.stations s ON s.id=l.station_name
    WHERE l.line_id IN ('ShintetsuAo','HojoRailway') AND s.id IS NULL)
 OR EXISTS(SELECT 1 FROM public.railway_lines l WHERE l.id IN
    ('ShintetsuAo','HojoRailway')
    AND (l.odpt_railway IS NOT NULL OR l.timetable_api_enabled
      OR l.realtime_position_api_enabled OR l.sql_planned_fallback_enabled))
 THEN RAISE EXCEPTION 'Ao transfer SQL station mapping/unsupported capability mismatch'; END IF;
END $validate$;
COMMIT;
