-- Keio racecourse: reuse 108 existing ordinary weekday paired plans.
-- All 108 number/departure/arrival triples match the current independent
-- timetable at https://tabinomemo.jp/train/timetable/keio/5 .
-- Ordinary departure cross-check: operator August 2026 edition and
-- https://transit.yahoo.co.jp/timetable/22941/3051 .
-- Date applicability: published weekday timetable + JRA Tokyo race meeting
-- ending November 30 (https://www.jra.go.jp/facilities/race/tokyo/);
-- allow ordinary weekdays Dec 1–25 only, explicitly bounded before the
-- year-end timetable period. This is planned-calendar applicability,
-- not proof of actual operation, nor operator confirmation of train numbers.
-- On Nov 30 the date-specific operating table corroborates only the 44
-- outside-window legacy triples reused here; the 102 special plans own
-- the 08:00–17:59 window. The two 6832 collisions remain excluded.
DO $guard$
DECLARE
 v_ids constant bigint[] := ARRAY[129118,129119,129120,129121,129122,129123,129124,129125,129126,129127,129128,129129,129130,129131,129174,129175,129176,129177,129178,129179,129180,129181,129182,129183,129184,129185,129186,129187,129188,129189,129190,129191,129192,129193,129194,129195,129196,129197,129198,129199,129200,129201,129202,129203,129204,129205,129206,129207,129208,129209,129210,129211,129212,129213,129146,129147,129148,129149,129150,129151,129152,129153,129154,129155,129156,129157,129158,129159,129251,129252,129253,129254,129255,129256,129257,129258,129259,129324,129325,129260,129261,129262,129263,129264,129265,129266,129267,129268,129269,129270,129271,129272,129273,129274,129275,129276,129277,129278,129279,129280,129281,129282,129283,129284,129285,129286,129287,129288];
 v_normal date[];
 v_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('keio-keibajo-20261130-p0'));
 SELECT array_agg(d::date ORDER BY d) INTO v_normal FROM generate_series(DATE '2026-12-01',DATE '2026-12-25',INTERVAL '1 day') d WHERE extract(isodow from d) BETWEEN 1 AND 5;
 IF cardinality(v_normal)<>19 THEN RAISE EXCEPTION 'Unexpected ordinary calendar'; END IF;
 IF (SELECT count(*) FROM public.manual_timetable_templates m WHERE m.id=ANY(v_ids) AND m.line_key='KeioKeibajo' AND m.calendar_urn='odpt.Calendar:Weekday' AND m.operating_dates IS NULL)<>108 THEN RAISE EXCEPTION 'Legacy source roster changed'; END IF;
 IF (SELECT count(*) FROM public.manual_timetable_templates m JOIN public.manual_timetable_template_stops s ON s.template_id=m.id AND s.departure_clock IS NOT NULL WHERE m.id=ANY(v_ids) AND (s.departure_clock<'08:00' OR s.departure_clock>='18:00'))<>44 THEN RAISE EXCEPTION 'Outside-window count changed'; END IF;
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KeioKeibajo' AND operating_dates @> ARRAY[DATE '2026-11-30'])<>102 THEN RAISE EXCEPTION 'Special-day scope changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.manual_timetable_templates WHERE line_key='KeioKeibajo' AND operating_dates && v_normal) THEN RAISE EXCEPTION 'Existing December date-specific plan; reconcile first'; END IF;
 UPDATE public.manual_timetable_templates m SET operating_dates=CASE WHEN EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s WHERE s.template_id=m.id AND s.departure_clock IS NOT NULL AND (s.departure_clock<'08:00' OR s.departure_clock>='18:00')) THEN ARRAY[DATE '2026-11-30']||v_normal ELSE v_normal END WHERE m.id=ANY(v_ids);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>108 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KeioKeibajo' AND operating_dates @> ARRAY[DATE '2026-11-30'])<>146 OR EXISTS(SELECT 1 FROM unnest(v_normal) d WHERE (SELECT count(*) FROM public.manual_timetable_templates m WHERE m.line_key='KeioKeibajo' AND m.operating_dates @> ARRAY[d])<>108) THEN RAISE EXCEPTION 'Date scope validation failed'; END IF;
 UPDATE public.published_timetable_coverage_audit SET issues=issues||ARRAY['20261130_OUTSIDE_WINDOW_44_EXISTING_TRIPLES_DATE_CORROBORATED_TOTAL_146_TWO_CONFLICTS_REMAIN','20261201_25_19_ORDINARY_WEEKDAYS_108_SOURCE_TRIPLES_CROSSCHECKED_PLANNED_CALENDAR_ONLY','NORMAL_HOLIDAY_AND_RACING_HOLIDAY_SCOPES_STILL_UNVERIFIED'],checked_at=now() WHERE line_key='KeioKeibajo' AND coverage_status='revision_review';
 IF NOT FOUND THEN RAISE EXCEPTION 'Coverage audit changed'; END IF;
END $guard$;

