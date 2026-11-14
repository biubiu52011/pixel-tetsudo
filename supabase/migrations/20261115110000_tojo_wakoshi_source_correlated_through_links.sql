-- Wakoshi boundary joins: TokyoGTFS Tojo vs. published Metro timetable segments.
-- Source editions are *undated_not_current_verified*: this is not proof of
-- current-day continuity, realtime positions, carset identity or a true
-- canonical verified_continuation. Keep the source-only canonical plans intact.
BEGIN;
CREATE TABLE IF NOT EXISTS public.tojo_wakoshi_through_links (
  source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
  partner_template_id bigint NOT NULL REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
  source_line_key text NOT NULL CHECK (source_line_key IN ('Tojo','Fukutoshin','Yurakucho')),
  partner_line_key text NOT NULL CHECK (partner_line_key IN ('Tojo','Fukutoshin','Yurakucho')),
  calendar_urn text NOT NULL CHECK (calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  operation_code text NOT NULL CHECK (operation_code ~ '^[0-9]{2}[TSK]$'),
  source_train_number text NOT NULL,
  partner_train_number text NOT NULL,
  boundary_station text NOT NULL DEFAULT 'Wakoshi' CHECK(boundary_station='Wakoshi'),
  travel_direction text NOT NULL CHECK (travel_direction IN ('to_metro','to_tojo')),
  gap_minutes integer NOT NULL CHECK(gap_minutes BETWEEN 0 AND 6),
  match_level text NOT NULL DEFAULT 'source_correlated_not_date_verified'
    CHECK(match_level='source_correlated_not_date_verified'),
  authorizes_position boolean NOT NULL DEFAULT false CHECK(authorizes_position=false),
  authorizes_vehicle boolean NOT NULL DEFAULT false CHECK(authorizes_vehicle=false),
  evidence_source text NOT NULL DEFAULT 'TokyoGTFS+Metro timetable: calendar, operation code, boundary clock, bidirectional uniqueness'
);
ALTER TABLE public.tojo_wakoshi_through_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tojo_wakoshi_through_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tojo_wakoshi_through_links TO service_role;
CREATE INDEX IF NOT EXISTS idx_tojo_wakoshi_partner ON public.tojo_wakoshi_through_links(partner_template_id);
CREATE INDEX IF NOT EXISTS idx_tojo_wakoshi_calendar ON public.tojo_wakoshi_through_links(source_line_key,calendar_urn);

WITH w AS (
 SELECT m.id,m.line_key,m.train_number,m.calendar_urn,m.direction_urn,
   lpad(substring(m.train_number from '([0-9]{1,2})[TSK]$'),2,'0')||right(m.train_number,1) AS op,
   min(s.stop_sequence) first_seq,max(s.stop_sequence) last_seq,
   max(s.stop_sequence) FILTER(WHERE s.arrival_station_urn LIKE '%Wakoshi' OR s.departure_station_urn LIKE '%Wakoshi') wkseq,
   max(s.arrival_clock) FILTER(WHERE s.arrival_station_urn LIKE '%Wakoshi') arr,
   max(s.departure_clock) FILTER(WHERE s.departure_station_urn LIKE '%Wakoshi') dep
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key IN ('Tojo','Yurakucho','Fukutoshin')
   AND m.train_number ~ '[TSK]$'
 GROUP BY m.id
), st AS (
 SELECT *,CASE WHEN wkseq=first_seq THEN 'first' WHEN wkseq=last_seq THEN 'last' ELSE 'middle' END side,
   CASE WHEN arr ~ '^[0-9][0-9]:[0-9][0-9]$' THEN split_part(arr,':',1)::int*60+split_part(arr,':',2)::int END arrmin,
   CASE WHEN dep ~ '^[0-9][0-9]:[0-9][0-9]$' THEN split_part(dep,':',1)::int*60+split_part(dep,':',2)::int END depmin
 FROM w WHERE wkseq IS NOT NULL AND op IS NOT NULL
), pair AS (
 SELECT t.id tojo_id,m.id metro_id,t.train_number tojo_number,m.train_number metro_number,
   t.calendar_urn,t.op,m.line_key metro_line,
   CASE WHEN t.side='last' AND m.side='first' THEN m.depmin-t.arrmin
        WHEN t.side='first' AND m.side='last' THEN t.depmin-m.arrmin END gap,
   CASE WHEN t.side='last' AND m.side='first' THEN 'to_metro' ELSE 'to_tojo' END travel_direction
 FROM st t JOIN st m ON t.line_key='Tojo' AND m.line_key IN ('Yurakucho','Fukutoshin')
   AND t.calendar_urn=m.calendar_urn AND t.op=m.op
 WHERE (t.side='last' AND m.side='first') OR (t.side='first' AND m.side='last')
), unique_pair AS(
 SELECT *, count(*) OVER (PARTITION BY tojo_id) tojo_matches,
   count(*) OVER (PARTITION BY metro_id) metro_matches
 FROM pair WHERE gap BETWEEN 0 AND 6
), authoritative AS (
 SELECT * FROM unique_pair WHERE tojo_matches=1 AND metro_matches=1
), sym_pairs AS (
 SELECT tojo_id source_id,metro_id partner_id,
   'Tojo'::text source_line,metro_line partner_line,
   calendar_urn,op,tojo_number source_number,metro_number partner_number,
   travel_direction,gap FROM authoritative
 UNION ALL
 SELECT metro_id,tojo_id,metro_line,'Tojo',
   calendar_urn,op,metro_number,tojo_number,travel_direction,gap FROM authoritative
)
INSERT INTO public.tojo_wakoshi_through_links
 (source_template_id,partner_template_id,source_line_key,partner_line_key,
  calendar_urn,operation_code,source_train_number,partner_train_number,travel_direction,gap_minutes)
SELECT source_id,partner_id,source_line,partner_line,
  calendar_urn,op,source_number,partner_number,travel_direction,gap
FROM sym_pairs
ON CONFLICT(source_template_id) DO UPDATE SET
 partner_template_id=EXCLUDED.partner_template_id,source_line_key=EXCLUDED.source_line_key,
 partner_line_key=EXCLUDED.partner_line_key,calendar_urn=EXCLUDED.calendar_urn,
 operation_code=EXCLUDED.operation_code,source_train_number=EXCLUDED.source_train_number,
 partner_train_number=EXCLUDED.partner_train_number,travel_direction=EXCLUDED.travel_direction,
 gap_minutes=EXCLUDED.gap_minutes;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.tojo_wakoshi_through_links)<>710 OR
    (SELECT count(*) FROM public.tojo_wakoshi_through_links WHERE source_line_key='Tojo')<>355 OR
    EXISTS(SELECT 1 FROM public.tojo_wakoshi_through_links a
      LEFT JOIN public.tojo_wakoshi_through_links b
        ON a.partner_template_id=b.source_template_id AND a.source_template_id=b.partner_template_id
      WHERE b.source_template_id IS NULL)
 THEN RAISE EXCEPTION 'Wakoshi source-correlated through-link cardinality or symmetry mismatch'; END IF;
END $$;
COMMIT;
