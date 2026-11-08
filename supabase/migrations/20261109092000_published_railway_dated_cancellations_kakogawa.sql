-- Generic source-backed dated cancellations for recurring railway templates.
-- Replaces no legacy service_exceptions behavior (that table is intentionally disabled).
-- Official notice: https://www.city.nishiwaki.lg.jp/kakukanogoannai/machizukuribu/koutsuuseisakuka/jrkakogawasen/31530.html
BEGIN;
SELECT pg_advisory_xact_lock(26110913);
CREATE TABLE IF NOT EXISTS public.published_railway_date_exceptions (
  line_key text NOT NULL,
  service_date date NOT NULL,
  train_number text NOT NULL CHECK (length(trim(train_number))>0),
  operation_status text NOT NULL CHECK(operation_status='cancelled'),
  segment_from text NOT NULL,
  segment_to text NOT NULL,
  source_id bigint NOT NULL REFERENCES public.evidence_sources(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(line_key,service_date,train_number)
);
ALTER TABLE public.published_railway_date_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_railway_date_exceptions FROM anon,authenticated;
GRANT SELECT ON public.published_railway_date_exceptions TO service_role;
INSERT INTO public.evidence_sources
  (source_key,source_url,source_type,evidence_grade,notes)
VALUES('jrwest-kakogawa-202611-maintenance-nishiwaki-tanigawa',
 'https://www.city.nishiwaki.lg.jp/kakukanogoannai/machizukuribu/koutsuuseisakuka/jrkakogawasen/31530.html',
 'official','A','2026-11-19/20/24/25/26 Nishiwakishi-Tanigawa four daily cancelled train numbers, no replacement bus.')
ON CONFLICT(source_key) DO NOTHING;
INSERT INTO public.published_railway_date_exceptions
  (line_key,service_date,train_number,operation_status,segment_from,segment_to,source_id)
SELECT 'KakogawaLine',d.service_date,t.train_number,'cancelled',
  t.segment_from,t.segment_to,
  (SELECT id FROM public.evidence_sources
   WHERE source_key='jrwest-kakogawa-202611-maintenance-nishiwaki-tanigawa')
FROM (VALUES
 ('2026-11-19'::date),('2026-11-20'::date),('2026-11-24'::date),
 ('2026-11-25'::date),('2026-11-26'::date)) d(service_date)
CROSS JOIN (VALUES
 ('2327S','Nishiwaki-Shi','Tanigawa'),('2329S','Nishiwaki-Shi','Tanigawa'),
 ('2326S','Tanigawa','Nishiwaki-Shi'),('2328S','Tanigawa','Nishiwaki-Shi')
) t(train_number,segment_from,segment_to)
ON CONFLICT(line_key,service_date,train_number) DO NOTHING;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_railway_date_exceptions
 WHERE line_key='KakogawaLine')<>20
 THEN RAISE EXCEPTION 'Official Kakogawa cancellation rows incomplete'; END IF;
END $verify$;
COMMIT;
