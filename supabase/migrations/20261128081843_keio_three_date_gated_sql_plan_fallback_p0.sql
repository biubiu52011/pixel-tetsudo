-- Admit the three source-date-gated Keio lines as SQL plan fallback.
-- Preserve actual realtime/API capability; do not activate KeioKeibajo.
DO $verify$
DECLARE r record;
BEGIN
 FOR r IN SELECT * FROM (VALUES ('KeioMain',1675),('KeioInokashira',1178),('KeioTakao',439)) x(line_key,expected) LOOP
  IF (SELECT count(*) FROM public.manual_timetable_templates m JOIN public.train_timetable_members tm ON tm.source_template_id=m.id WHERE m.line_key=r.line_key AND m.source_path='gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:'||r.line_key)<>r.expected
  OR EXISTS (SELECT 1 FROM public.manual_timetable_templates m WHERE m.line_key=r.line_key AND m.source_path IS DISTINCT FROM 'gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:'||r.line_key)
  OR NOT EXISTS (SELECT 1 FROM public.railway_lines l WHERE l.id=r.line_key AND l.timetable_operator='Keio' AND l.realtime_position_api_enabled)
  THEN RAISE EXCEPTION 'Keio plan or realtime scope mismatch: %',r.line_key; END IF;
  UPDATE public.railway_lines SET sql_planned_fallback_enabled=true WHERE id=r.line_key;
 END LOOP;
END
$verify$;

