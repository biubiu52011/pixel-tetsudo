-- Date-scoped 2611 shinkansen source calendar in its EXISTING
-- authoritative manual_timetable_templates table. NULL preserves
-- historic recurring behavior; an empty array means the imported
-- source does not run on ANY verified 2026-11 date. A nonempty
-- array is a train-specific exact-date whitelist, independent from
-- historical Weekday/SaturdayHoliday import labels.
-- No new table, no new edge function, no full-time numerical guess.
ALTER TABLE public.manual_timetable_templates
  ADD COLUMN IF NOT EXISTS operating_dates date[] NULL;
COMMENT ON COLUMN public.manual_timetable_templates.operating_dates IS
 'Optional verified exact service-date whitelist for source templates. NULL=legacy calendar only/unverified; empty array=none in scoped edition; nonempty=array of official dates. Applied by train-runs for Nov 2026 shinkansen; historical import calendar provenance is preserved.';
