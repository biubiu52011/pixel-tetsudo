-- Official non-Shinkansen fleet evidence, strictly plan-only.
-- A route's rolling stock does not identify an individual train.
DO $backfill$
DECLARE base_source bigint;
DECLARE base_rule bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(20261030, 70067);
 SELECT coalesce(max(id),0) INTO base_source FROM public.evidence_sources;
 WITH sources(source_key,source_url,notes) AS (
 VALUES
 ('official-conventional-20261030-seibu-reservedtrain','https://www.seiburailway.jp/cs/faq/reservedtrain/','Official Seibu: Seibu Shinjuku Red Arrow 10000; Haijima Liner 40000. Service-specific planned family, not individual actual train.'),
 ('official-conventional-20261030-seibu-8500','https://www.seiburailway.jp/railway/encyclopedia/8500/','Official Seibu 8500-type Leo Liner was introduced on Yamaguchi Line; as of October 2026 fleet reference, not unique service identity.'),
 ('official-conventional-20261030-seibu-l00','https://www.seiburailway.jp/railway/encyclopedia/L00/','Official Seibu L00 model is a newly introduced Yamaguchi Line vehicle, 4 cars; mixed with 8500 at network level; no actual run/formation selection.'),
 ('official-conventional-20261030-jrkyushu-sonic','https://www.jrkyushu.co.jp/trains/sp/sonic/','Official JR Kyushu: Sonic limited express 883 and 885; source says both, so model identity is narrowed, not exact.'),
 ('official-conventional-20261030-jrwest-yakumo','https://www.jr-odekake.net/railroad/yakumo/','Official JR West: regular Yakumo limited express uses 273 series from 2024; model plan only, no proof of each service date/formation.'),
 ('official-conventional-20261030-jrwest-323','https://www.jr-odekake.net/railroad/service/train-woman.html','JR West confirms Osaka Loop / JR Yumesaki local trains can use 323 series; NOT proof all local services use only 323, so evidence-only, no blanket train assignment.')
 ), new_sources AS (
 SELECT s.*,row_number() over (order by s.source_key) AS rn
 FROM sources s WHERE NOT EXISTS (
  SELECT 1 FROM public.evidence_sources e WHERE e.source_key=s.source_key
 )
 )
 INSERT INTO public.evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
 SELECT base_source+rn,source_key,source_url,'official','C',notes
 FROM new_sources;

 SELECT coalesce(max(id),0) INTO base_rule FROM public.operation_family_rules;
 WITH rules(operator,network_key,code_pattern,model_candidates,train_types,candidate_labels,source_key,note) AS (
 VALUES
 ('Seibu','SeibuShinjuku','PLAN:OFFICIAL-SHINJUKU-REDARROW',ARRAY['西武10000系']::text[],ARRAY['LimitedExpress']::text[],NULL::text[],'official-conventional-20261030-seibu-reservedtrain','Seibu Red Arrow uses 10000 series; source-backed model-only plan; not formation or special livery.'),
 ('Seibu','Haijima','PLAN:OFFICIAL-HAIJIMA-LINER',ARRAY['西武40000系']::text[],ARRAY['HaijimaLiner']::text[],NULL::text[],'official-conventional-20261030-seibu-reservedtrain','Haijima Liner has 40000 series; model plan only; no carset or livery.'),
 ('Seibu','SeibuShinjuku','PLAN:OFFICIAL-SHINJUKU-HAIJIMA-LINER',ARRAY['西武40000系']::text[],ARRAY['HaijimaLiner']::text[],NULL::text[],'official-conventional-20261030-seibu-reservedtrain','Haijima Liner runs on Shinjuku line with 40000; planned model, not actual carset.'),
 ('Seibu','SeibuYamaguchi','PLAN:OFFICIAL-YAMAGUCHI-MIXED-FLEET',ARRAY['西武8500系','西武L00系']::text[],ARRAY['Local']::text[],NULL::text[],'official-conventional-20261030-seibu-l00','Yamaguchi fleet includes 8500 and new L00; 8500-only legacy source is not uniquely identifying actual vehicle.'),
 ('JR-Kyushu','Nippo','PLAN:OFFICIAL-NIPPO-SONIC',ARRAY['JR九州883系','JR九州885系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['ソニック']::text[],'official-conventional-20261030-jrkyushu-sonic','Only Sonic service on Nippo, not all limited express trains; multiple models.'),
 ('JR-Kyushu','KagoshimaMain','PLAN:OFFICIAL-KAGOSHIMA-SONIC',ARRAY['JR九州883系','JR九州885系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['ソニック']::text[],'official-conventional-20261030-jrkyushu-sonic','Only Sonic through-running services on Kagoshima Main, not whole line; multiple models.'),
 ('JR-West','SanyoMain','PLAN:OFFICIAL-SANYO-YAKUMO',ARRAY['JR西日本273系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['やくも']::text[],'official-conventional-20261030-jrwest-yakumo','Only a Yakumo service on Sanyo Main, not entire line; model reference, not physical formation.')
 ), new_rules AS (
 SELECT rules.*,e.id AS evidence_id,row_number() over (order by rules.operator,rules.network_key,rules.code_pattern) rn
 FROM rules JOIN public.evidence_sources e ON e.source_key=rules.source_key
 WHERE NOT EXISTS (
 SELECT 1 FROM public.operation_family_rules x WHERE
 x.operator=rules.operator AND x.network_key=rules.network_key
 AND x.code_pattern=rules.code_pattern AND x.effective_from=DATE '2026-10-30' AND x.calendar_type=''
 )
 )
 INSERT INTO public.operation_family_rules
 (id,operator,network_key,code_pattern,effective_from,effective_to,exact_vehicle_type,
 vehicle_candidates,calendar_type,source_id,notes,plan_scope)
 SELECT base_rule+rn,operator,network_key,code_pattern,
 DATE '2026-10-30',NULL,NULL,model_candidates,'',evidence_id,note,
 jsonb_build_object('lineIds',jsonb_build_array(network_key),
 'planOnly',true,'overridePlan',true,'trainTypes',to_jsonb(train_types)) ||
 CASE WHEN candidate_labels IS NULL THEN '{}'::jsonb
 ELSE jsonb_build_object('candidateLabelsAny',to_jsonb(candidate_labels)) END
 FROM new_rules;
END $backfill$;