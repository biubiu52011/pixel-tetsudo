-- JR East November 2026 Kamaishi: ENDPOINT evidence only.
-- All 22 regular current-month train numbers appear on 979d1/d2/u1/u2.
-- These 22 published first/last endpoints match both SQL calendars
-- (44 source templates). This is NOT an all-intermediate-stops audit.
-- https://timetables.jreast.co.jp/2611/timetable-v/979d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979u2.html
BEGIN;
ALTER TABLE public.published_kamaishi_2611_number_roster
 DROP CONSTRAINT published_kamaishi_2611_number_roster_stop_clock_status_check;
ALTER TABLE public.published_kamaishi_2611_number_roster
 ADD CONSTRAINT published_kamaishi_2611_number_roster_stop_clock_status_check
 CHECK(stop_clock_status IN('number_only','endpoint_verified','full_official_segment'));
CREATE TEMP TABLE _kamaishi_2611_endpoint_examples (
 train_number text PRIMARY KEY,dir text NOT NULL,first_station text NOT NULL,
 first_clock text NOT NULL,last_station text NOT NULL,last_clock text NOT NULL
) ON COMMIT DROP;
INSERT INTO _kamaishi_2611_endpoint_examples VALUES
('651D','Outbound','Tono','06:25','Kamaishi','07:26'),
('653D','Outbound','Hanamaki','06:35','Kamaishi','08:46'),
('655D','Outbound','Hanamaki','09:00','Kamaishi','11:08'),
('3657D','Outbound','Hanamaki','09:59','Kamaishi','11:41'),
('3659D','Outbound','Hanamaki','12:01','Kamaishi','13:45'),
('661D','Outbound','Hanamaki','13:41','Kamaishi','15:43'),
('663D','Outbound','Hanamaki','15:53','Kamaishi','17:58'),
('3665D','Outbound','Hanamaki','17:51','Kamaishi','19:41'),
('1667D','Outbound','Hanamaki','18:41','Kamaishi','20:58'),
('1669D','Outbound','Hanamaki','19:43','Kamaishi','21:57'),
('671D','Outbound','Hanamaki','20:47','Tono','21:53'),
('1652D','Inbound','Tono','06:01','Hanamaki','07:08'),
('1654D','Inbound','Kamaishi','05:23','Hanamaki','07:40'),
('656D','Inbound','Kamaishi','06:39','Hanamaki','08:45'),
('3658D','Inbound','Kamaishi','07:28','Morioka','09:48'),
('660D','Inbound','Kamaishi','09:43','Hanamaki','12:09'),
('3662D','Inbound','Kamaishi','11:28','Hanamaki','13:18'),
('664D','Inbound','Kamaishi','13:32','Hanamaki','15:46'),
('3666D','Inbound','Kamaishi','15:31','Morioka','18:01'),
('1668D','Inbound','Kamaishi','16:34','Hanamaki','18:53'),
('670D','Inbound','Kamaishi','17:45','Hanamaki','19:54'),
('672D','Inbound','Kamaishi','18:53','Hanamaki','20:58');
DO $check$
DECLARE matched_count integer;
BEGIN
 SELECT count(*) INTO matched_count
 FROM public.published_kamaishi_2611_number_roster r
 JOIN public.manual_timetable_templates m
  ON m.line_key='Kamaishi' AND m.calendar_urn=r.calendar_urn
  AND m.direction_urn=r.direction_urn AND m.train_number=r.train_number
 JOIN _kamaishi_2611_endpoint_examples e
  ON e.train_number=r.train_number AND m.direction_urn='odpt.RailDirection:'||e.dir
 CROSS JOIN LATERAL (
  SELECT split_part(coalesce(z.arrival_station_urn,z.departure_station_urn),'.',3) station,
    coalesce(z.departure_clock,z.arrival_clock) clock
  FROM public.manual_timetable_template_stops z
  WHERE z.template_id=m.id ORDER BY z.stop_sequence LIMIT 1
 ) first_stop
 CROSS JOIN LATERAL (
  SELECT split_part(coalesce(z.arrival_station_urn,z.departure_station_urn),'.',3) station,
    coalesce(z.arrival_clock,z.departure_clock) clock
  FROM public.manual_timetable_template_stops z
  WHERE z.template_id=m.id ORDER BY z.stop_sequence DESC LIMIT 1
 ) last_stop
 WHERE r.edition='2611' AND r.line_key='Kamaishi'
   AND r.stop_clock_status='number_only'
   AND r.official_source_url LIKE 'https://timetables.jreast.co.jp/2611/timetable-v/979%'
   AND first_stop.station=e.first_station AND first_stop.clock=e.first_clock
   AND last_stop.station=e.last_station AND last_stop.clock=e.last_clock;
 IF matched_count<>44 THEN RAISE EXCEPTION
  'JR East 2611 Kamaishi regular endpoint mismatch: expected 44, matched %',matched_count;
 END IF;
 IF (SELECT count(*) FROM _kamaishi_2611_endpoint_examples)<>22
 THEN RAISE EXCEPTION 'Expected 22 regular official train numbers'; END IF;
END $check$;
UPDATE public.published_kamaishi_2611_number_roster r
 SET stop_clock_status='endpoint_verified'
 WHERE r.edition='2611' AND r.line_key='Kamaishi'
 AND r.stop_clock_status='number_only'
 AND r.train_number IN (SELECT train_number
 FROM _kamaishi_2611_endpoint_examples);
COMMENT ON TABLE public.published_kamaishi_2611_number_roster IS
 'JR East 2611 number, calendar, direction and representative vehicle model. endpoint_verified means ONLY first/last published stop clocks checked, NOT intermediate stop audit; full_official_segment is restricted to Hinabi. No actual carset evidence.';
COMMIT;