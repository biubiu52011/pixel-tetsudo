-- JR East Yokohama 2611: four published K-number columns independently checked
-- against https://timetables.jreast.co.jp/2611/timetable-v/608{u,d}{1,2}.html
-- Train-number identity ONLY. Does not date-verify SQL stop clocks or real H formations.
DO $audit$
BEGIN
  IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Yokohama') <> 622 THEN
    RAISE EXCEPTION 'Yokohama 2611 expected exactly 622 SQL source templates';
  END IF;
  IF EXISTS(
    SELECT 1 FROM (VALUES
 ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','608u1',161,'f06660d605dca1c32feb4d302052feb9'),
 ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','608d1',164,'05de8bc8b0feca12e7fd5422b6368e94'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','608u2',148,'455fb9ab193da76b13c6d00bfdb66730'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','608d2',149,'25a8354f5b33dd7da6c56cb0745617d9')
) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
    LEFT JOIN public.manual_timetable_templates t
      ON t.line_key='Yokohama'
      AND t.calendar_urn=spec.calendar_urn
      AND t.direction_urn=spec.direction_urn
    GROUP BY spec.calendar_urn,spec.direction_urn,spec.expected_count,spec.expected_md5
    HAVING count(t.id)<>spec.expected_count
       OR md5(string_agg(t.train_number,',' ORDER BY t.train_number))<>spec.expected_md5
       OR count(DISTINCT t.train_number)<>spec.expected_count
  ) THEN
    RAISE EXCEPTION 'Yokohama 2611 SQL source-number sets differ from verified official 608 page lists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.manual_timetable_templates t
    WHERE t.line_key='Yokohama' AND
      (t.train_number !~ '^[0-9]{3,4}K$'
       OR t.railway_urn<>'odpt.Railway:JR-East.Yokohama'
       OR t.vehicle_type_label<>'E233系6000番台'
       OR t.train_type_urn NOT IN
         ('odpt.TrainType:JR-East.Local','odpt.TrainType:JR-East.Rapid')
       OR (substring(t.train_number from '^([0-9]+)K$')::integer % 2 = 0)
          IS DISTINCT FROM (t.direction_urn='odpt.RailDirection:Inbound'))
  ) THEN
    RAISE EXCEPTION 'Yokohama 2611 source type, railway, model or direction parity invalid';
  END IF;
END $audit$;

INSERT INTO public.published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
SELECT '2611','Yokohama',t.calendar_urn,t.direction_urn,t.train_number,
       t.id,'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       'train_number_only'
FROM public.manual_timetable_templates t
JOIN (VALUES
 ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','608u1',161,'f06660d605dca1c32feb4d302052feb9'),
 ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','608d1',164,'05de8bc8b0feca12e7fd5422b6368e94'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','608u2',148,'455fb9ab193da76b13c6d00bfdb66730'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','608d2',149,'25a8354f5b33dd7da6c56cb0745617d9')
) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
  ON t.calendar_urn=spec.calendar_urn AND t.direction_urn=spec.direction_urn
WHERE t.line_key='Yokohama'
ON CONFLICT (edition,line_key,calendar_urn,direction_urn,train_number) DO NOTHING;

INSERT INTO public.timetable_number_verifications
 (line_key,edition,page_code,official_url,calendar_urn,direction_urn,
  verification_scope,official_count,database_count,
  missing_number_count,extra_number_count,database_number_set_md5,notes)
SELECT 'Yokohama','2026-11',spec.page_code,
       'https://timetables.jreast.co.jp/2611/timetable-v/'||spec.page_code||'.html',
       spec.calendar_urn,spec.direction_urn,'train_number_set_only',
       spec.expected_count,count(t.id),0,0,
       md5(string_agg(t.train_number,',' ORDER BY t.train_number)),
       '2026-11-09: complete published K-number column compared with the JR East 2611 official page and the 622-row JS/SQL inventory. Numbers only; historical stops, service-day validity and physical carsets were NOT verified.'
FROM (VALUES
 ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound','608u1',161,'f06660d605dca1c32feb4d302052feb9'),
 ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound','608d1',164,'05de8bc8b0feca12e7fd5422b6368e94'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','608u2',148,'455fb9ab193da76b13c6d00bfdb66730'),
 ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound','608d2',149,'25a8354f5b33dd7da6c56cb0745617d9')
) AS spec(calendar_urn,direction_urn,page_code,expected_count,expected_md5)
JOIN public.manual_timetable_templates t
  ON t.line_key='Yokohama' AND t.calendar_urn=spec.calendar_urn
  AND t.direction_urn=spec.direction_urn
GROUP BY spec.page_code,spec.calendar_urn,spec.direction_urn,
  spec.expected_count,spec.expected_md5
ON CONFLICT (line_key,edition,page_code) DO UPDATE
 SET database_count=EXCLUDED.database_count,
     database_number_set_md5=EXCLUDED.database_number_set_md5,
     official_url=EXCLUDED.official_url,
     official_count=EXCLUDED.official_count,
     missing_number_count=0,extra_number_count=0,
     notes=EXCLUDED.notes;
