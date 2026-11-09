-- JR East Tadami 2611: four official local-train number columns.
-- The SQL source also contains three legacy rapid rows without a verified
-- November operating date; those rows remain outside this evidence batch.
BEGIN;

DO $audit$
BEGIN
  IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Tadami'
        AND train_type_urn='odpt.TrainType:JR-East.Local')<>34 THEN
    RAISE EXCEPTION 'Tadami 2611 expected exactly 34 official local templates';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM (VALUES
      ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','262d1',9,'7795d2581537edfba74b5ec63f09178c'),
      ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','262u1',9,'92f068c9c28fd04a64f2684b7f05d3bb'),
      ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','262d2',8,'71523fda0f88c60f24e637cb99e0b84c'),
      ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','262u2',8,'70fe725a6fbf22904d0d9450d97f5060')
    ) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
    LEFT JOIN public.manual_timetable_templates t
      ON t.line_key='Tadami'
     AND t.train_type_urn='odpt.TrainType:JR-East.Local'
     AND t.calendar_urn=spec.calendar_urn
     AND t.direction_urn=spec.direction_urn
    GROUP BY spec.calendar_urn,spec.direction_urn,spec.expected_count,spec.expected_md5
    HAVING count(t.id)<>spec.expected_count
       OR count(DISTINCT t.train_number)<>spec.expected_count
       OR md5(string_agg(t.train_number,',' ORDER BY t.train_number))<>spec.expected_md5
  ) THEN
    RAISE EXCEPTION 'Tadami 2611 SQL source-number sets differ from official 262 pages';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.manual_timetable_templates t
    WHERE t.line_key='Tadami'
      AND t.train_type_urn='odpt.TrainType:JR-East.Local'
      AND (t.railway_urn<>'odpt.Railway:JR-East.Tadami'
       OR t.train_number !~ '^[0-9]+D$')
  ) THEN
    RAISE EXCEPTION 'Tadami 2611 local source identity or train-number format invalid';
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
      WHERE m.line_key='Tadami'
        AND m.train_type_urn='odpt.TrainType:JR-East.Local'
      GROUP BY m.id
    ) q
    WHERE q.stop_count<2 OR q.first_sequence<>0 OR q.duplicate_sequences
       OR q.missing_clock OR q.missing_station
  ) THEN
    RAISE EXCEPTION 'Tadami 2611 official local stop-event completeness check failed';
  END IF;

  IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Tadami'
        AND train_type_urn='odpt.TrainType:JR-East.Rapid')<>3
     OR EXISTS(
       SELECT 1 FROM public.manual_timetable_templates
       WHERE line_key='Tadami'
         AND train_type_urn='odpt.TrainType:JR-East.Rapid'
         AND train_number NOT IN ('9423D','9425D','9430D')
     ) THEN
    RAISE EXCEPTION 'Tadami legacy rapid exclusion set drifted';
  END IF;
END $audit$;

INSERT INTO public.published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
SELECT '2611','Tadami',t.calendar_urn,t.direction_urn,t.train_number,
       t.id,
       'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       'train_number_only'
FROM public.manual_timetable_templates t
JOIN (VALUES
  ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','262d1'),
  ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','262u1'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','262d2'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','262u2')
) AS spec(calendar_urn,direction_urn,page_code)
  ON t.calendar_urn=spec.calendar_urn AND t.direction_urn=spec.direction_urn
WHERE t.line_key='Tadami'
  AND t.train_type_urn='odpt.TrainType:JR-East.Local'
ON CONFLICT DO NOTHING;

INSERT INTO public.timetable_number_verifications
  (line_key,edition,page_code,official_url,calendar_urn,direction_urn,
   verification_scope,official_count,database_count,
   missing_number_count,extra_number_count,database_number_set_md5,notes)
SELECT 'Tadami','2026-11',spec.page_code,
       'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       spec.calendar_urn,spec.direction_urn,'train_number_set_only',
       spec.expected_count,count(t.id),0,0,
       md5(string_agg(t.train_number,',' ORDER BY t.train_number)),
       '2026-11-09: official JR East 262 page compared with the SQL local-train number set. Numbers only; operating-day validity, service clocks and physical carsets were not verified. Legacy 9423D/9425D/9430D rapid rows were excluded because their November operating dates remain unverified.'
FROM (VALUES
  ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','262d1',9,'7795d2581537edfba74b5ec63f09178c'),
  ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','262u1',9,'92f068c9c28fd04a64f2684b7f05d3bb'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','262d2',8,'71523fda0f88c60f24e637cb99e0b84c'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','262u2',8,'70fe725a6fbf22904d0d9450d97f5060')
) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
JOIN public.manual_timetable_templates t
  ON t.line_key='Tadami'
 AND t.train_type_urn='odpt.TrainType:JR-East.Local'
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
