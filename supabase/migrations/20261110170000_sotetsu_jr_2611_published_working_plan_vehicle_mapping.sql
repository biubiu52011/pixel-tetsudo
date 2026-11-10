-- Sotetsu/JR four-stop November 2026 planned MODEL lookup.
-- Use existing canonical train_timetable_vehicle_mappings and evidence_sources.
-- Underlying timetable and date proof remain in their own established tables.
-- C-grade third-party 2026-03-14 operation diagrams are NOT live trainsets.
-- Do not turn plan evidence into physical identity or an official approval.
BEGIN;
SELECT pg_advisory_xact_lock(2611630);
WITH sources(cal,model,source_url,source_key) AS (VALUES
  ('weekday','E233','https://ameblo.jp/tc205-37/entry-12972145141.html','sotetsu-jr-working-20260314-weekday-e233'),
  ('holiday','E233','https://ameblo.jp/tc205-37/entry-12972146396.html','sotetsu-jr-working-20260314-holiday-e233'),
  ('weekday','Sotetsu12000','https://ameblo.jp/tc205-37/entry-12972143138.html','sotetsu-jr-working-20260314-weekday-sotetsu12000'),
  ('holiday','Sotetsu12000','https://ameblo.jp/tc205-37/entry-12972143555.html','sotetsu-jr-working-20260314-holiday-sotetsu12000')
), incoming AS (
  SELECT s.*,row_number()over(order by s.source_key) n FROM sources s
  WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources e WHERE e.source_key=s.source_key)
)
INSERT INTO public.evidence_sources
(id,source_key,source_url,source_type,evidence_grade,notes)
SELECT (SELECT coalesce(max(id),0) FROM public.evidence_sources)+n,
 source_key,source_url,'reference','C',
 '2026-03-14 third-party published working diagram: schedule model only; non-official, not a carset observation or guaranteed assignment.'
FROM incoming
ON CONFLICT(source_key) DO NOTHING;
CREATE TEMP TABLE _sotetsu_jr_2611_working (
 calendar_type text NOT NULL,train_number text NOT NULL,
 model_key text NOT NULL,operation_code text NOT NULL,
 PRIMARY KEY(calendar_type,train_number)
) ON COMMIT DROP;
INSERT INTO _sotetsu_jr_2611_working VALUES
  ('holiday','120M','E233','71'),
  ('holiday','121M','Sotetsu12000','71'),
  ('holiday','122M','Sotetsu12000','71'),
  ('holiday','123M','Sotetsu12000','73'),
  ('holiday','124M','E233','61'),
  ('holiday','125M','E233','15'),
  ('holiday','126M','E233','63'),
  ('holiday','127M','E233','03'),
  ('holiday','128M','Sotetsu12000','71'),
  ('holiday','129M','Sotetsu12000','72'),
  ('holiday','130M','Sotetsu12000','70'),
  ('holiday','131M','E233','21'),
  ('holiday','132M','Sotetsu12000','72'),
  ('holiday','133M','E233','03'),
  ('holiday','134M','E233','03'),
  ('holiday','135M','Sotetsu12000','71'),
  ('holiday','136M','E233','15'),
  ('holiday','137M','Sotetsu12000','70'),
  ('holiday','138M','E233','03'),
  ('holiday','139M','E233','09'),
  ('holiday','140M','E233','47'),
  ('holiday','141M','E233','15'),
  ('holiday','142M','Sotetsu12000','70'),
  ('holiday','143M','E233','03'),
  ('holiday','144M','E233','09'),
  ('holiday','220M','Sotetsu12000','73'),
  ('holiday','221M','E233','71'),
  ('holiday','222M','E233','65'),
  ('holiday','223M','E233','09'),
  ('holiday','224M','E233','67'),
  ('holiday','225M','E233','59'),
  ('holiday','226M','E233','69'),
  ('holiday','227M','E233','21'),
  ('holiday','228M','E233','71'),
  ('holiday','229M','E233','47'),
  ('holiday','230M','E233','09'),
  ('holiday','231M','Sotetsu12000','71'),
  ('holiday','232M','E233','59'),
  ('holiday','233M','Sotetsu12000','70'),
  ('holiday','234M','E233','21'),
  ('holiday','235M','E233','09'),
  ('holiday','236M','Sotetsu12000','71'),
  ('holiday','237M','E233','03'),
  ('holiday','238M','Sotetsu12000','70'),
  ('holiday','239M','E233','59'),
  ('holiday','240M','E233','09'),
  ('holiday','241M','E233','15'),
  ('holiday','242M','E233','59'),
  ('holiday','243M','Sotetsu12000','71'),
  ('holiday','244M','Sotetsu12000','72'),
  ('holiday','245M','Sotetsu12000','70'),
  ('holiday','246M','Sotetsu12000','71'),
  ('holiday','247M','E233','09'),
  ('holiday','248M','Sotetsu12000','70'),
  ('holiday','249M','E233','59'),
  ('holiday','250M','E233','09'),
  ('holiday','251M','Sotetsu12000','72'),
  ('holiday','252M','E233','59'),
  ('holiday','253M','Sotetsu12000','71'),
  ('holiday','254M','Sotetsu12000','72'),
  ('holiday','255M','Sotetsu12000','70'),
  ('holiday','256M','E233','03'),
  ('holiday','257M','E233','09'),
  ('holiday','258M','Sotetsu12000','71'),
  ('holiday','259M','E233','59'),
  ('holiday','260M','Sotetsu12000','70'),
  ('holiday','261M','Sotetsu12000','72'),
  ('holiday','262M','E233','21'),
  ('holiday','263M','E233','21'),
  ('holiday','264M','E233','09'),
  ('holiday','265M','E233','09'),
  ('holiday','266M','E233','59'),
  ('holiday','267M','E233','59'),
  ('holiday','268M','E233','15'),
  ('holiday','269M','E233','15'),
  ('holiday','270M','Sotetsu12000','71'),
  ('holiday','271M','E233','03'),
  ('holiday','272M','Sotetsu12000','70'),
  ('holiday','273M','E233','47'),
  ('holiday','274M','Sotetsu12000','72'),
  ('holiday','275M','Sotetsu12000','71'),
  ('holiday','276M','E233','09'),
  ('holiday','277M','Sotetsu12000','70'),
  ('holiday','278M','E233','59'),
  ('holiday','279M','Sotetsu12000','72'),
  ('holiday','280M','E233','15'),
  ('holiday','281M','E233','59'),
  ('holiday','282M','E233','03'),
  ('holiday','283M','Sotetsu12000','73'),
  ('holiday','284M','Sotetsu12000','73'),
  ('holiday','285M','Sotetsu12000','70'),
  ('holiday','287M','E233','09'),
  ('weekday','120M','Sotetsu12000','72'),
  ('weekday','121M','E233','01'),
  ('weekday','122M','Sotetsu12000','71'),
  ('weekday','123M','Sotetsu12000','71'),
  ('weekday','124M','Sotetsu12000','73'),
  ('weekday','125M','E233','01'),
  ('weekday','126M','E233','61'),
  ('weekday','127M','Sotetsu12000','70'),
  ('weekday','128M','E233','63'),
  ('weekday','129M','E233','67'),
  ('weekday','130M','E233','67'),
  ('weekday','131M','Sotetsu12000','72'),
  ('weekday','132M','E233','69'),
  ('weekday','133M','E233','29'),
  ('weekday','134M','Sotetsu12000','72'),
  ('weekday','135M','E233','35'),
  ('weekday','136M','E233','01'),
  ('weekday','137M','E233','51'),
  ('weekday','138M','Sotetsu12000','70'),
  ('weekday','139M','Sotetsu12000','70'),
  ('weekday','140M','E233','29'),
  ('weekday','141M','E233','67'),
  ('weekday','142M','Sotetsu12000','70'),
  ('weekday','143M','E233','29'),
  ('weekday','144M','E233','67'),
  ('weekday','145M','E233','35'),
  ('weekday','146M','E233','29'),
  ('weekday','148M','Sotetsu12000','71'),
  ('weekday','150M','E233','29'),
  ('weekday','220M','E233','65'),
  ('weekday','221M','Sotetsu12000','72'),
  ('weekday','222M','E233','71'),
  ('weekday','223M','Sotetsu12000','71'),
  ('weekday','224M','Sotetsu12000','71'),
  ('weekday','225M','Sotetsu12000','73'),
  ('weekday','226M','Sotetsu12000','70'),
  ('weekday','227M','E233','57'),
  ('weekday','228M','E233','01'),
  ('weekday','229M','E233','29'),
  ('weekday','230M','E233','57'),
  ('weekday','231M','E233','45'),
  ('weekday','232M','E233','29'),
  ('weekday','233M','E233','51'),
  ('weekday','234M','E233','51'),
  ('weekday','235M','E233','35'),
  ('weekday','236M','E233','35'),
  ('weekday','237M','E233','67'),
  ('weekday','238M','Sotetsu12000','71'),
  ('weekday','239M','Sotetsu12000','70'),
  ('weekday','240M','Sotetsu12000','70'),
  ('weekday','241M','E233','57'),
  ('weekday','242M','E233','57'),
  ('weekday','243M','E233','29'),
  ('weekday','244M','E233','29'),
  ('weekday','245M','E233','51'),
  ('weekday','246M','E233','51'),
  ('weekday','247M','E233','35'),
  ('weekday','248M','Sotetsu12000','71'),
  ('weekday','249M','Sotetsu12000','71'),
  ('weekday','250M','Sotetsu12000','70'),
  ('weekday','251M','Sotetsu12000','70'),
  ('weekday','252M','E233','57'),
  ('weekday','253M','E233','57'),
  ('weekday','254M','E233','29'),
  ('weekday','255M','E233','29'),
  ('weekday','256M','E233','51'),
  ('weekday','257M','E233','51'),
  ('weekday','258M','Sotetsu12000','71'),
  ('weekday','259M','Sotetsu12000','71'),
  ('weekday','260M','E233','67'),
  ('weekday','261M','Sotetsu12000','70'),
  ('weekday','262M','Sotetsu12000','72'),
  ('weekday','263M','Sotetsu12000','72'),
  ('weekday','264M','E233','35'),
  ('weekday','265M','E233','29'),
  ('weekday','266M','E233','51'),
  ('weekday','267M','E233','51'),
  ('weekday','268M','E233','01'),
  ('weekday','269M','E233','01'),
  ('weekday','270M','Sotetsu12000','72'),
  ('weekday','271M','Sotetsu12000','71'),
  ('weekday','272M','E233','35'),
  ('weekday','273M','E233','01'),
  ('weekday','274M','E233','51'),
  ('weekday','275M','Sotetsu12000','72'),
  ('weekday','276M','E233','01'),
  ('weekday','277M','Sotetsu12000','71'),
  ('weekday','278M','Sotetsu12000','73'),
  ('weekday','279M','E233','51'),
  ('weekday','281M','E233','01'),
  ('weekday','283M','Sotetsu12000','73'),
  ('weekday','285M','E233','29');
DO $preflight$
DECLARE invalid_count integer;
BEGIN
  IF (SELECT count(*) FROM _sotetsu_jr_2611_working)<>184 OR
     (SELECT count(*) FROM _sotetsu_jr_2611_working
       WHERE calendar_type='weekday' AND model_key='Sotetsu12000')<>34 OR
     (SELECT count(*) FROM _sotetsu_jr_2611_working
       WHERE calendar_type='holiday' AND model_key='Sotetsu12000')<>36 OR
     (SELECT count(*) FROM _sotetsu_jr_2611_working
       WHERE calendar_type='weekday' AND model_key='E233')<>58 OR
     (SELECT count(*) FROM _sotetsu_jr_2611_working
       WHERE calendar_type='holiday' AND model_key='E233')<>56
  THEN RAISE EXCEPTION 'SOTETSU_JR_2611_WORKING_ROSTER_COUNT_DRIFT'; END IF;
  SELECT count(*) INTO invalid_count
  FROM _sotetsu_jr_2611_working w
  LEFT JOIN public.manual_timetable_templates t
   ON t.line_key='SotetsuJRDirect' AND t.train_number=w.train_number
   AND t.calendar_urn='odpt.Calendar:'||
     (CASE WHEN w.calendar_type='weekday' THEN 'Weekday' ELSE 'SaturdayHoliday' END)
  LEFT JOIN public.train_timetable_members m ON m.source_template_id=t.id
  LEFT JOIN public.published_sotetsu_jr_2611_clock_proof cp ON cp.source_template_id=t.id
  LEFT JOIN public.published_sotetsu_jr_2611_fleet_roster fr ON fr.source_template_id=t.id
  WHERE t.id IS NULL OR m.timetable_id IS NULL OR cp.source_template_id IS NULL
    OR fr.source_template_id IS NULL OR cp.train_number<>w.train_number
    OR fr.train_number<>w.train_number OR cp.calendar_urn<>t.calendar_urn
    OR fr.calendar_urn<>t.calendar_urn OR
    w.model_key NOT IN ('Sotetsu12000','E233') OR
    w.operation_code !~ '^[0-9]{2}$' OR
    (w.model_key='Sotetsu12000' AND w.operation_code NOT IN ('70','71','72','73'))
    OR (w.model_key='E233' AND w.operation_code::integer % 2=0);
  IF invalid_count<>0 THEN
    RAISE EXCEPTION 'SOTETSU_JR_2611_WORKING_SOURCE_IDENTITY_CONFLICT (%)',invalid_count;
  END IF;
  IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='SotetsuJRDirect')<>184 THEN
    RAISE EXCEPTION 'SOTETSU_JR_2611_SOURCE_184_CHANGED';
  END IF;
END $preflight$;
WITH candidates AS (
 SELECT m.timetable_id,t.id source_template_id,
 CASE WHEN w.model_key='Sotetsu12000' THEN '相鉄12000系'
      ELSE 'E233系7000番台' END vehicle_type,
 es.id source_id,
 'fan-2026-03-14-working:'||w.calendar_type||':'||w.model_key||':'||
   w.operation_code source_path
 FROM _sotetsu_jr_2611_working w
 JOIN public.manual_timetable_templates t
   ON t.line_key='SotetsuJRDirect' AND t.train_number=w.train_number
   AND t.calendar_urn='odpt.Calendar:'||
     (CASE WHEN w.calendar_type='weekday' THEN 'Weekday' ELSE 'SaturdayHoliday' END)
 JOIN public.train_timetable_members m ON m.source_template_id=t.id
 JOIN public.evidence_sources es ON es.source_key='sotetsu-jr-working-20260314-'||
   w.calendar_type||'-'||lower(w.model_key)
 WHERE es.source_type='reference' AND es.evidence_grade='C'
)
INSERT INTO public.train_timetable_vehicle_mappings
 (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
SELECT timetable_id,source_template_id,vehicle_type,
  'source_single_type_candidate',source_id,source_path,false FROM candidates
ON CONFLICT(timetable_id) DO NOTHING;
DO $postcheck$
DECLARE ok_count integer;
BEGIN
 SELECT count(*) INTO ok_count FROM public.manual_timetable_templates t
 JOIN public.train_timetable_members m ON m.source_template_id=t.id
 JOIN public.train_timetable_vehicle_mappings vm ON vm.timetable_id=m.timetable_id
 JOIN public.evidence_sources e ON e.id=vm.source_id
 WHERE t.line_key='SotetsuJRDirect' AND vm.source_template_id=t.id
 AND vm.mapping_level='source_single_type_candidate'
 AND vm.actual_vehicle_confirmed=false
 AND vm.vehicle_type IN ('相鉄12000系','E233系7000番台')
 AND vm.source_path LIKE 'fan-2026-03-14-working:%'
 AND e.source_type='reference' AND e.evidence_grade='C';
 IF ok_count<>184 THEN
   RAISE EXCEPTION 'SOTETSU_JR_2611_VEHICLE_184_MAPPING_INCOMPLETE (%)',ok_count;
 END IF;
END $postcheck$;
COMMIT;
