-- JR Kyushu official fleet/type evidence, scoped to NishiKyushuShinkansen.
-- Source: JR Kyushu's vehicle equipment page, corroborated by the October 2026
-- published 2101G かもめ101 official station timetable.
-- This is a PLAN-only model family, never an observed carset or a valid PNG path.
DO $migration$
DECLARE source_ref bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(20261030, 70051);
  SELECT id INTO source_ref FROM public.evidence_sources
    WHERE source_key = 'jr-kyushu-official-nishi-kyushu-n700s-20261030';
  IF source_ref IS NULL THEN
    INSERT INTO public.evidence_sources
      (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT COALESCE(MAX(id),0)+1,
       'jr-kyushu-official-nishi-kyushu-n700s-20261030',
       'https://www.jrkyushu.co.jp/train/kids/guardian/train_equipment/',
       'official','C',
       'JR Kyushu lists N700S six-car fleet for Nishi Kyushu Shinkansen; 2026-10-29 published timetable confirms train 2101G/かもめ101 as N700S. Scope: planned family, NOT actual formation, not an image mapping. Source corroboration: https://www.jrkyushu-timetable.jp/sp/2611/0019/00193701.html?d=20261029&t=1122701'
    FROM public.evidence_sources
    RETURNING id INTO source_ref;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.operation_family_rules WHERE
      operator='JR-Kyushu' AND network_key='NishiKyushuShinkansen'
      AND code_pattern='PLAN:NISHIKYUSHU-KAMOME-N700S'
      AND effective_from=DATE '2026-10-24' AND calendar_type=''
  ) THEN
    INSERT INTO public.operation_family_rules
      (id,operator,network_key,code_pattern,effective_from,effective_to,
       exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope)
    SELECT COALESCE(MAX(id),0)+1, 'JR-Kyushu','NishiKyushuShinkansen',
       'PLAN:NISHIKYUSHU-KAMOME-N700S',DATE '2026-10-24',
       NULL,NULL,ARRAY['JR九州N700S系']::text[],'',source_ref,
       'Official published N700S six-car type on this line; model-only plan. No PNG available in native library; do not substitute N700 or 800. No proof of daily carset.',
       '{"lineIds":["NishiKyushuShinkansen"],"planOnly":true,"trainTypes":["Shinkansen"],"overridePlan":true}'::jsonb
    FROM public.operation_family_rules;
  END IF;
END
$migration$;
