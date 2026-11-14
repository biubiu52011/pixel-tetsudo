-- The 2026-11 checksum-pinned TokyoGTFS staging promotion is a real plan
-- source; the old "missing_all_plans" audit is now stale. Do NOT elevate
-- to official independent complete coverage or actual vehicle confirmation.
BEGIN;
UPDATE public.published_timetable_coverage_audit a
SET template_count = v.templates,
    calendar_count = 2,
    direction_count = 2,
    sampled_count = 0,
    coverage_status = 'source-only-calendar-scoped',
    issues = ARRAY[
      'TOKYOGTFS_SOURCE_ONLY_NOT_INDEPENDENTLY_OFFICIAL_VERIFIED',
      'GTFS_VALID_DATES_REQUIRE_FEED_CHECKSUM_AND_SERVICE_CALENDAR',
      'TRAINSET_IDENTITY_AND_FORMATION_NOT_VERIFIED'
    ]::text[],
    checked_at = now()
FROM (VALUES ('Tojo',1760),('Ogose',290)) v(line_key,templates)
WHERE a.line_key=v.line_key
  AND (SELECT count(*) FROM public.manual_timetable_templates m
       WHERE m.line_key=v.line_key
         AND m.source_path='gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:'||v.line_key)
      =v.templates;
UPDATE public.operation_family_rules
SET plan_scope = jsonb_set(
  plan_scope,'{trainTypes}','["TJ-Liner","TJ-LINER"]'::jsonb
)
WHERE network_key='Tojo' AND code_pattern='PLAN:OFFICIAL-TJLINER-50090'
  AND exact_vehicle_type='東武50090型';
DO $assert$
BEGIN
  IF (SELECT count(*) FROM public.published_timetable_coverage_audit
      WHERE line_key IN ('Tojo','Ogose')
        AND coverage_status='source-only-calendar-scoped')<>2
     OR NOT EXISTS (SELECT 1 FROM public.operation_family_rules
          WHERE network_key='Tojo' AND code_pattern='PLAN:OFFICIAL-TJLINER-50090'
          AND plan_scope->'trainTypes' @> '["TJ-Liner"]'::jsonb)
  THEN RAISE EXCEPTION 'Tojo/Ogose source-only coverage or TJ-Liner scope not installed'; END IF;
END
$assert$;
COMMIT;
