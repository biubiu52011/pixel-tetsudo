-- Correct service-specific Kyushu Shinkansen planned fleets using JR Kyushu's
-- official baggage/seat equipment reference: N700 for みずほ・さくら・つばめ;
-- 800 for さくら・つばめ. These are alternatives, not identified carsets.
DO $mixed$
DECLARE ref bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(20261030,70052);
 SELECT id INTO ref FROM public.evidence_sources
  WHERE source_key='jr-kyushu-official-n700-800-mixed-service-20261030';
 IF ref IS NULL THEN
  INSERT INTO public.evidence_sources
    (id,source_key,source_url,source_type,evidence_grade,notes)
  SELECT coalesce(max(id),0)+1,
    'jr-kyushu-official-n700-800-mixed-service-20261030',
    'https://www.jrkyushu.co.jp/railway/ticket/rule/tokudai_baggage/',
    'official','C',
    'JR Kyushu official equipment rules list N700 for みずほ/さくら/つばめ and 800 for さくら/つばめ. Plan family only; no daily actual formation, N700S or PNG identity inferred.'
  FROM public.evidence_sources RETURNING id INTO ref;
 END IF;
 -- The old さくら/みずほ rule omitted the 800 model that can operate さくら.
 -- Keep the existing rule and source for みずほ ONLY, add separate mixed rules.
 UPDATE public.operation_family_rules
 SET plan_scope=jsonb_set(plan_scope,'{candidateLabelsAny}','["みずほ"]'::jsonb),
     notes=coalesce(notes,'')||' / 2026-10-30 official JR Kyushu correction: さくら includes 800; restricted this rule to みずほ.'
 WHERE operator='JR-Kyushu' AND network_key='KyushuShinkansen'
   AND code_pattern='PLAN:REMAIN-60'
   AND plan_scope->'candidateLabelsAny'='["さくら","みずほ"]'::jsonb
   AND exact_vehicle_type IS NULL;
 IF NOT EXISTS (SELECT 1 FROM public.operation_family_rules WHERE operator='JR-Kyushu'
  AND network_key='KyushuShinkansen'
  AND code_pattern='PLAN:KYUSHU-SAKURA-MIXED-FLEET'
  AND effective_from=DATE '2026-10-30' AND calendar_type='') THEN
  INSERT INTO public.operation_family_rules
   (id,operator,network_key,code_pattern,effective_from,effective_to,
    exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope)
  SELECT coalesce(max(id),0)+1,'JR-Kyushu','KyushuShinkansen',
    'PLAN:KYUSHU-SAKURA-MIXED-FLEET',DATE '2026-10-30',
    NULL,NULL,ARRAY['JR西日本N700系7000番台','JR九州N700系8000番台','JR九州800系']::text[],
    '',ref,
    'JR Kyushu official: さくら may use N700 and 800. Preserve fleet alternatives; no definite model/series, carset or PNG.',
    '{"lineIds":["KyushuShinkansen"],"planOnly":true,"trainTypes":["Shinkansen"],"candidateLabelsAny":["さくら"],"overridePlan":true}'::jsonb
  FROM public.operation_family_rules;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.operation_family_rules WHERE operator='JR-Kyushu'
  AND network_key='KyushuShinkansen'
  AND code_pattern='PLAN:KYUSHU-TSUBAME-MIXED-FLEET'
  AND effective_from=DATE '2026-10-30' AND calendar_type='') THEN
  INSERT INTO public.operation_family_rules
   (id,operator,network_key,code_pattern,effective_from,effective_to,
    exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope)
  SELECT coalesce(max(id),0)+1,'JR-Kyushu','KyushuShinkansen',
    'PLAN:KYUSHU-TSUBAME-MIXED-FLEET',DATE '2026-10-30',
    NULL,NULL,ARRAY['JR九州N700系8000番台','JR九州800系']::text[],
    '',ref,
    'JR Kyushu official: つばめ may use N700 and 800. No daily identified model/formation or PNG.',
    '{"lineIds":["KyushuShinkansen"],"planOnly":true,"trainTypes":["Shinkansen"],"candidateLabelsAny":["つばめ"],"overridePlan":true}'::jsonb
  FROM public.operation_family_rules;
 END IF;
END
$mixed$;