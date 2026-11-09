-- 2026-11-09: four new station-topology-only routes.
-- Registry ownership is NOT timetable, official realtime or rolling-stock evidence.
-- Do not turn on SQL fallback before dated official source templates exist.
-- Idempotent; do not alter any pre-existing route capability flags.
INSERT INTO public.railway_lines
  (id, timetable_operator, timetable_api_enabled,
   realtime_position_api_enabled, sql_planned_fallback_enabled)
VALUES
  ('Fujikyu','FujisanrokuElectricRailway',false,false,false),
  ('Nikko','JR-East',false,false,false),
  ('TohokuRifu','JR-East',false,false,false),
  ('ChikuhiWest','JR-Kyushu',false,false,false)
ON CONFLICT (id) DO NOTHING;
