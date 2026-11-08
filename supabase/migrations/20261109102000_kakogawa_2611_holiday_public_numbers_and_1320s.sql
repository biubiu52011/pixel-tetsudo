-- November 2026 Kakogawa source-public-number mapping. Keep imported
-- SaturdayHoliday SH suffixes as immutable source identities; JR public
-- train numbers end in S (NOT SH). 2026-11-08 JR-West line timetables:
-- https://timetable.jr-odekake.net/line-timetable/2455
-- https://timetable.jr-odekake.net/line-timetable/2456
-- 1320S full 13-stop Holiday source:
-- https://timetable.jr-odekake.net/train-timetable/65131?date=20261128
BEGIN;
SELECT pg_advisory_xact_lock(26110920);
DO $baseline$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KakogawaLine') NOT IN (90,91)
 THEN RAISE EXCEPTION 'Kakogawa baseline changed'; END IF;
END $baseline$;
CREATE TABLE IF NOT EXISTS public.published_jrwest_kakogawa_2611_public_number_map (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 calendar_urn text NOT NULL CHECK(calendar_urn='odpt.Calendar:SaturdayHoliday'),
 source_train_label text NOT NULL,
 public_train_number text NOT NULL CHECK(public_train_number ~ '^[0-9]{2,5}S$'),
 verification_scope text NOT NULL CHECK(verification_scope='public_number_calendar_direction_only'),
 evidence_source_id bigint NOT NULL REFERENCES public.evidence_sources(id),
 checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.published_jrwest_kakogawa_2611_public_number_map ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_jrwest_kakogawa_2611_public_number_map FROM anon,authenticated;
GRANT SELECT ON public.published_jrwest_kakogawa_2611_public_number_map TO service_role;
SELECT setval(pg_get_serial_sequence('public.evidence_sources','id'),
 GREATEST((SELECT coalesce(max(id),0) FROM public.evidence_sources),
          (SELECT last_value FROM public.evidence_sources_id_seq)),true);
INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
VALUES
 ('jrwest-kakogawa-2611-down-public-number-roster',
  'https://timetable.jr-odekake.net/line-timetable/2455?date=20261108',
  'official','A','2026-11-08 SaturdayHoliday public train numbers only; not intermediate clock verification'),
 ('jrwest-kakogawa-2611-up-public-number-roster',
  'https://timetable.jr-odekake.net/line-timetable/2456?date=20261108',
  'official','A','2026-11-08 SaturdayHoliday public train numbers only; not intermediate clock verification'),
 ('jrwest-kakogawa-2611-1320s-holiday-full-clocks',
  'https://timetable.jr-odekake.net/train-timetable/65131?date=20261128',
  'official','A','2026-11-28 holiday full 13-stop published itinerary and public number 1320S')
ON CONFLICT(source_key) DO NOTHING;
-- Add one independently verified missing holiday-origin itinerary.
DO $import$
DECLARE new_template bigint;new_run bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.manual_timetable_templates
   WHERE line_key='KakogawaLine' AND calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND train_number='1320S')
 THEN
 INSERT INTO public.manual_timetable_templates
  (line_key,calendar_urn,train_number,railway_urn,direction_urn,
   train_type_urn,destination_urns,source_path,source_occurrence,
   source_revision_date,operating_dates)
 VALUES ('KakogawaLine','odpt.Calendar:SaturdayHoliday','1320S',
    'odpt.Railway:JR-West.KakogawaLine','odpt.RailDirection:Inbound',
    'odpt.TrainType:JR-West.Local',ARRAY['odpt.Station:JR-West.KakogawaLine.Kakogawa']::text[],
    'official-202611:jrwest-kakogawa-1320s-saturdayholiday',0,
    '2026-10-03'::date,
    ARRAY(SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,
        interval '1 day') d WHERE extract(isodow from d)::int IN (6,7)
      OR d::date IN ('2026-11-03'::date,'2026-11-23'::date)))
 RETURNING id INTO new_template;
 INSERT INTO public.manual_timetable_template_stops
 (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT new_template,s.ord,
   CASE WHEN s.arrival_time IS NOT NULL THEN s.urn END,
   CASE WHEN s.departure_time IS NOT NULL THEN s.urn END,
   s.arrival_time,s.departure_time
 FROM (VALUES
 (0,'odpt.Station:JR-West.KakogawaLine.Nishiwaki-Shi',NULL,'05:45'),
 (1,'odpt.Station:JR-West.KakogawaLine.Taki','05:48','05:48'),
 (2,'odpt.Station:JR-West.KakogawaLine.Takino','05:50','05:50'),
 (3,'odpt.Station:JR-West.KakogawaLine.Sha-Machi','05:54','05:55'),
 (4,'odpt.Station:JR-West.KakogawaLine.Aono-Ke-Hara','05:58','05:58'),
 (5,'odpt.Station:JR-West.KakogawaLine.Kawai-Nishi','06:01','06:01'),
 (6,'odpt.Station:JR-West.KakogawaLine.Aou','06:04','06:05'),
 (7,'odpt.Station:JR-West.KakogawaLine.Onochou','06:08','06:09'),
 (8,'odpt.Station:JR-West.KakogawaLine.Shijou','06:12','06:12'),
 (9,'odpt.Station:JR-West.KakogawaLine.Yakujin','06:17','06:20'),
 (10,'odpt.Station:JR-West.KakogawaLine.Kanno','06:23','06:24'),
 (11,'odpt.Station:JR-West.KakogawaLine.Hioka','06:27','06:27'),
 (12,'odpt.Station:JR-West.KakogawaLine.Kakogawa','06:31',NULL)
 ) AS s(ord,urn,arrival_time,departure_time)
 ORDER BY s.ord;
 INSERT INTO public.train_timetables
 (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
  group_evidence,timetable_validity,source_revision_date)
 VALUES('source:'||new_template,'odpt.Calendar:SaturdayHoliday','1320S',new_template,
       'source_only','date_verified','2026-10-03'::date)
 RETURNING id INTO new_run;
 INSERT INTO public.train_timetable_members
 (source_template_id,timetable_id,segment_order,member_role,
  first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
 VALUES(new_template,new_run,0,'primary',0,12,0,false);
 END IF;
END $import$;
-- Calendar+direction+explicit official roster validation; no bare suffix
-- stripping fallback is allowed for an unlisted train number.
WITH official(rail_direction,roster,source_key) AS (
 VALUES
 ('odpt.RailDirection:Outbound','1321S 2323S 1323S 1325S 2325S 311S 313S 1327S 317S 1329S 2327S 319S 321S 1331S 323S 1333S 325S 1335S 2329S 1337S 1339S 2331S 1341S 327S 1343S 2333S 329S 1345S 1347S 1349S 2335S 333S 1351S 2337S 335S 1353S 337S 1355S 1357S 341S','jrwest-kakogawa-2611-down-public-number-roster'),
 ('odpt.RailDirection:Inbound','310S 312S 1320S 314S 316S 1324S 1326S 1328S 2322S 1330S 318S 2324S 1332S 320S 1334S 322S 1336S 2326S 1338S 1340S 324S 1342S 326S 2328S 1344S 328S 1346S 330S 2330S 1348S 336S 1350S 338S 2332S 1352S 340S 2334S 1354S 1356S 2336S','jrwest-kakogawa-2611-up-public-number-roster')
), verified AS (
 SELECT t.id,t.calendar_urn,t.train_number,
        regexp_replace(t.train_number,'SH$','S') as public_no,
        e.id AS source_id
 FROM public.manual_timetable_templates t
 JOIN official o ON o.rail_direction=t.direction_urn
 CROSS JOIN LATERAL unnest(string_to_array(o.roster,' ')) AS pub(no)
 JOIN public.evidence_sources e ON e.source_key=o.source_key
 WHERE t.line_key='KakogawaLine'
 AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND regexp_replace(t.train_number,'SH$','S')=pub.no
)
INSERT INTO public.published_jrwest_kakogawa_2611_public_number_map
(source_template_id,calendar_urn,source_train_label,public_train_number,verification_scope,evidence_source_id)
SELECT id,calendar_urn,train_number,public_no,
 'public_number_calendar_direction_only',source_id FROM verified
ON CONFLICT(source_template_id) DO UPDATE SET
 calendar_urn=EXCLUDED.calendar_urn,
 source_train_label=EXCLUDED.source_train_label,
 public_train_number=EXCLUDED.public_train_number,
 verification_scope=EXCLUDED.verification_scope,
 evidence_source_id=EXCLUDED.evidence_source_id;
-- Use per-train full evidence for 1320S, leave all original clock versions unverified.
UPDATE public.published_jrwest_kakogawa_2611_public_number_map m
SET evidence_source_id=(SELECT id FROM public.evidence_sources
 WHERE source_key='jrwest-kakogawa-2611-1320s-holiday-full-clocks')
FROM public.manual_timetable_templates t
WHERE m.source_template_id=t.id AND t.line_key='KakogawaLine'
 AND t.train_number='1320S' AND t.calendar_urn='odpt.Calendar:SaturdayHoliday';
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
    WHERE line_key='KakogawaLine')<>91
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_public_number_map)<>43
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates t
    LEFT JOIN public.published_jrwest_kakogawa_2611_public_number_map m
      ON m.source_template_id=t.id
    WHERE t.line_key='KakogawaLine' AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
      AND m.source_template_id IS NULL)
 OR (SELECT count(*) FROM public.manual_timetable_template_stops s
    JOIN public.manual_timetable_templates t ON t.id=s.template_id
    WHERE t.line_key='KakogawaLine' AND t.train_number='1320S')<>13
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates t
    LEFT JOIN public.train_timetable_members m ON m.source_template_id=t.id
    WHERE t.line_key='KakogawaLine' AND m.source_template_id IS NULL)
 THEN RAISE EXCEPTION 'Kakogawa 2611 public number/1320S mapping incomplete'; END IF;
END $verify$;
COMMIT;
