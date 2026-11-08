-- Published public-number roster for Nov 8 2026, Sat/Holiday ONLY.
-- Immutable number evidence can be linked to canonical SQL templates without
-- inventing missing stop clocks, actual carsets or API train positions.
-- https://timetable.jr-odekake.net/line-timetable/2455
-- https://timetable.jr-odekake.net/line-timetable/2456
BEGIN;
SELECT pg_advisory_xact_lock(26110923);
CREATE TABLE IF NOT EXISTS public.published_jrwest_kakogawa_2611_holiday_number_roster (
 public_train_number text PRIMARY KEY CHECK(public_train_number ~ '^[0-9]{2,5}S$'),
 direction_urn text NOT NULL CHECK(direction_urn IN
   ('odpt.RailDirection:Outbound','odpt.RailDirection:Inbound')),
 calendar_urn text NOT NULL DEFAULT 'odpt.Calendar:SaturdayHoliday'
   CHECK(calendar_urn='odpt.Calendar:SaturdayHoliday'),
 evidence_source_id bigint NOT NULL REFERENCES public.evidence_sources(id),
 verification_scope text NOT NULL DEFAULT 'official_number_calendar_direction_only'
   CHECK(verification_scope='official_number_calendar_direction_only'),
 checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.published_jrwest_kakogawa_2611_holiday_number_roster ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_jrwest_kakogawa_2611_holiday_number_roster FROM anon,authenticated;
GRANT SELECT ON public.published_jrwest_kakogawa_2611_holiday_number_roster TO service_role;
WITH roster(direction_urn,numbers,source_key) AS (VALUES
 ('odpt.RailDirection:Outbound','1321S 2323S 1323S 1325S 2325S 311S 313S 1327S 317S 1329S 2327S 319S 321S 1331S 323S 1333S 325S 1335S 2329S 1337S 1339S 2331S 1341S 327S 1343S 2333S 329S 1345S 1347S 1349S 2335S 333S 1351S 2337S 335S 1353S 337S 1355S 1357S 341S','jrwest-kakogawa-2611-down-public-number-roster'),
 ('odpt.RailDirection:Inbound','310S 312S 1320S 314S 316S 1324S 1326S 1328S 2322S 1330S 318S 2324S 1332S 320S 1334S 322S 1336S 2326S 1338S 1340S 324S 1342S 326S 2328S 1344S 328S 1346S 330S 2330S 1348S 336S 1350S 338S 2332S 1352S 340S 2334S 1354S 1356S 2336S','jrwest-kakogawa-2611-up-public-number-roster')
)
INSERT INTO public.published_jrwest_kakogawa_2611_holiday_number_roster
  (public_train_number,direction_urn,evidence_source_id)
SELECT x.number,r.direction_urn,e.id
FROM roster r
CROSS JOIN LATERAL unnest(string_to_array(r.numbers,' ')) x(number)
JOIN public.evidence_sources e ON e.source_key=r.source_key
ON CONFLICT(public_train_number) DO NOTHING;
CREATE OR REPLACE VIEW public.published_jrwest_kakogawa_2611_holiday_mapping_audit
WITH (security_invoker=true)
AS SELECT r.public_train_number,r.direction_urn,r.calendar_urn,
 r.evidence_source_id,m.source_template_id,
 CASE WHEN m.source_template_id IS NULL THEN 'missing_stop_template'
 ELSE 'public_number_mapped' END AS mapping_status
FROM public.published_jrwest_kakogawa_2611_holiday_number_roster r
LEFT JOIN public.published_jrwest_kakogawa_2611_public_number_map m
 ON m.public_train_number=r.public_train_number AND m.calendar_urn=r.calendar_urn;
GRANT SELECT ON public.published_jrwest_kakogawa_2611_holiday_mapping_audit TO service_role;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_number_roster)<>80
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit
   WHERE mapping_status='public_number_mapped')<>49
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit
   WHERE mapping_status='missing_stop_template')<>31
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit
   WHERE mapping_status='missing_stop_template' AND direction_urn='odpt.RailDirection:Inbound')<>24
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit
   WHERE mapping_status='missing_stop_template' AND direction_urn='odpt.RailDirection:Outbound')<>7
 THEN RAISE EXCEPTION 'Official Kakogawa 2611 roster source coverage is unexpected'; END IF;
END $verify$;
COMMIT;
