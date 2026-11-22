-- JR East official 2611: 3620M–3627M are conventional Rapid services.
-- Sources: https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html
-- https://timetables.jreast.co.jp/2611/timetable-v/258u2p.html
-- https://timetables.jreast.co.jp/2611/train/045/046541.html
-- In particular 3625M & 3627M were falsely categorized as Akita Shinkansen
-- by a broad "3xxxM" class. Their source row and service dates are not
-- changed or newly authorized here; this corrects only source classification.
BEGIN;
SELECT pg_advisory_xact_lock(2611362);
DO $preflight$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_source_scope
     WHERE edition='2611' AND line_key='OuMain'
       AND train_number ~ '^362[0-7]M$')<>14
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
     WHERE line_key='OuMain' AND train_number IN('3625M','3627M')
       AND segment_key='akita_shinkansen_shared')<>4
 THEN RAISE EXCEPTION 'OuMain 3620–3627 source rows changed; review first';
 END IF;
END $preflight$;
UPDATE public.published_oumain_2611_source_scope
SET segment_key='regional_electric_legacy',
    model_candidates=ARRAY['701系']::text[],
    service_type_override='Rapid'
WHERE edition='2611' AND line_key='OuMain'
  AND train_number ~ '^362[0-7]M$';
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_source_scope
     WHERE line_key='OuMain' AND train_number ~ '^362[0-7]M$'
       AND segment_key='regional_electric_legacy'
       AND service_type_override='Rapid')<>14
 OR EXISTS(SELECT 1 FROM public.published_oumain_2611_source_scope
   WHERE line_key='OuMain' AND train_number ~ '^362[0-7]M$'
    AND png_reference IS NOT NULL)
 THEN RAISE EXCEPTION 'OuMain 362x rapid correction mismatch'; END IF;
END $postflight$;
COMMIT;