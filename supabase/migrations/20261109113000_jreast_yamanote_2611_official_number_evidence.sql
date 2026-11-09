-- JR East Yamanote 2611: four official G-number columns.
-- This certifies train-number membership only. It does not infer operating
-- dates, stop clocks, through services, or physical carsets.
BEGIN;

DO $audit$
BEGIN
  IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Yamanote')<>1037 THEN
    RAISE EXCEPTION 'Yamanote 2611 expected exactly 1037 SQL source templates';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM (VALUES
      ('odpt.Calendar:Weekday','odpt.RailDirection:InnerLoop','630u1',255,'16faccf868a87c5fe57a696e7f83d06c'),
      ('odpt.Calendar:Weekday','odpt.RailDirection:OuterLoop','630d1',267,'4837a13972d9a897cf2be882cbd599d0'),
      ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:InnerLoop','630u2',255,'b0cfebd99dd8b9472eebe92679a6f358'),
      ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:OuterLoop','630d2',260,'cdd4b067e08073322bf10646c8a7ca2c')
    ) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
    LEFT JOIN public.manual_timetable_templates t
      ON t.line_key='Yamanote'
     AND t.calendar_urn=spec.calendar_urn
     AND t.direction_urn=spec.direction_urn
    GROUP BY spec.calendar_urn,spec.direction_urn,spec.expected_count,spec.expected_md5
    HAVING count(t.id)<>spec.expected_count
       OR count(DISTINCT t.train_number)<>spec.expected_count
       OR md5(string_agg(t.train_number,',' ORDER BY t.train_number))<>spec.expected_md5
  ) THEN
    RAISE EXCEPTION 'Yamanote 2611 SQL source-number sets differ from official 630 page lists';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.manual_timetable_templates t
    WHERE t.line_key='Yamanote'
      AND (t.train_number !~ '^[0-9]{3,4}G$'
       OR t.railway_urn<>'odpt.Railway:JR-East.Yamanote'
       OR t.train_type_urn<>'odpt.TrainType:JR-East.Local')
  ) THEN
    RAISE EXCEPTION 'Yamanote 2611 source identity or train-number format invalid';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM (
      SELECT m.id,
             count(s.stop_sequence)::int AS stop_count,
             min(s.stop_sequence)::int AS first_sequence,
             count(s.stop_sequence)<>count(DISTINCT s.stop_sequence) AS duplicate_sequences,
             bool_or(s.arrival_clock IS NULL AND s.departure_clock IS NULL) AS missing_clock,
             bool_or(s.arrival_station_urn IS NULL AND s.departure_station_urn IS NULL) AS missing_station
      FROM public.manual_timetable_templates m
      LEFT JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
      WHERE m.line_key='Yamanote'
      GROUP BY m.id
    ) q
    WHERE q.stop_count<4 OR q.first_sequence<>0 OR q.duplicate_sequences
       OR q.missing_clock OR q.missing_station
  ) THEN
    RAISE EXCEPTION 'Yamanote 2611 stop-event completeness check failed';
  END IF;
END $audit$;

INSERT INTO public.published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
SELECT '2611','Yamanote',t.calendar_urn,t.direction_urn,t.train_number,
       t.id,
       'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       'train_number_only'
FROM public.manual_timetable_templates t
JOIN (VALUES
  ('odpt.Calendar:Weekday','odpt.RailDirection:InnerLoop','630u1'),
  ('odpt.Calendar:Weekday','odpt.RailDirection:OuterLoop','630d1'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:InnerLoop','630u2'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:OuterLoop','630d2')
) AS spec(calendar_urn,direction_urn,page_code)
  ON t.calendar_urn=spec.calendar_urn AND t.direction_urn=spec.direction_urn
WHERE t.line_key='Yamanote'
ON CONFLICT DO NOTHING;

INSERT INTO public.timetable_number_verifications
  (line_key,edition,page_code,official_url,calendar_urn,direction_urn,
   verification_scope,official_count,database_count,
   missing_number_count,extra_number_count,database_number_set_md5,notes)
SELECT 'Yamanote','2026-11',spec.page_code,
       'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       spec.calendar_urn,spec.direction_urn,'train_number_set_only',
       spec.expected_count,count(t.id),0,0,
       md5(string_agg(t.train_number,',' ORDER BY t.train_number)),
       '2026-11-09: complete published G-number column compared with the JR East 2611 official page. Numbers only; operating-day validity, stop clocks and physical carsets were not verified.'
FROM (VALUES
  ('odpt.Calendar:Weekday','odpt.RailDirection:InnerLoop','630u1',255,'16faccf868a87c5fe57a696e7f83d06c'),
  ('odpt.Calendar:Weekday','odpt.RailDirection:OuterLoop','630d1',267,'4837a13972d9a897cf2be882cbd599d0'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:InnerLoop','630u2',255,'b0cfebd99dd8b9472eebe92679a6f358'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:OuterLoop','630d2',260,'cdd4b067e08073322bf10646c8a7ca2c')
) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
JOIN public.manual_timetable_templates t
  ON t.line_key='Yamanote'
 AND t.calendar_urn=spec.calendar_urn
 AND t.direction_urn=spec.direction_urn
GROUP BY spec.page_code,spec.calendar_urn,spec.direction_urn,
  spec.expected_count,spec.expected_md5
ON CONFLICT (line_key,edition,page_code) DO UPDATE
 SET database_count=EXCLUDED.database_count,
     database_number_set_md5=EXCLUDED.database_number_set_md5,
     official_url=EXCLUDED.official_url,
     official_count=EXCLUDED.official_count,
     missing_number_count=0,extra_number_count=0,
     notes=EXCLUDED.notes,
     checked_at=now();

COMMIT;
