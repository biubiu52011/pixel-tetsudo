-- JR East 265 labels 8821D/8822D SATONO as Rapid (the old
-- manual source incorrectly tagged them Local). Keep old fact for audit.
-- https://timetables.jreast.co.jp/2611/timetable-v/265d1.html
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_senzan_2611_import_type_audit (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 original_train_type_urn text NOT NULL,
 official_train_type_urn text NOT NULL,
 official_source_url text NOT NULL
);
ALTER TABLE public.published_senzan_2611_import_type_audit ENABLE ROW LEVEL SECURITY;
INSERT INTO public.published_senzan_2611_import_type_audit
 SELECT id,train_type_urn,'odpt.TrainType:JR-East.Rapid',
  'https://timetables.jreast.co.jp/2611/timetable-v/265d1.html'
 FROM public.manual_timetable_templates
 WHERE line_key='Senzan' AND train_number IN('8821D','8822D')
   AND train_type_urn='odpt.TrainType:JR-East.Local'
 ON CONFLICT(source_template_id) DO NOTHING;
UPDATE public.manual_timetable_templates SET
 train_type_urn='odpt.TrainType:JR-East.Rapid'
 WHERE line_key='Senzan' AND train_number IN('8821D','8822D');
UPDATE public.published_senzan_2611_fleet_scope SET
 source_type_urn='odpt.TrainType:JR-East.Rapid'
 WHERE fleet_role='satono_dated';
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.published_senzan_2611_import_type_audit)<>4
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE
  line_key='Senzan' AND train_number IN('8821D','8822D') AND
  train_type_urn='odpt.TrainType:JR-East.Rapid')<>4
 THEN RAISE EXCEPTION 'SATONO rapid source-type correction failed'; END IF;
END $check$;
COMMIT;
