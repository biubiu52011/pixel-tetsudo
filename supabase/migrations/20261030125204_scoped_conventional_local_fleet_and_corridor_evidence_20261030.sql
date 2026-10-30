-- Route-level fleet evidence with explicit non-exclusive / section-only scope.
-- Do not insert any actual train, operational timetable or vehicle artwork mapping.
DO $add$
DECLARE bs bigint; br bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(20261030,70101);
 SELECT COALESCE(max(id),0) INTO bs FROM public.evidence_sources;
 WITH source_data(source_key,source_url,notes) AS (
 VALUES
 ('official-conventional-jrwest-323-local-20261030',
  'https://www.westjr.co.jp/press/article/2019/05/page_14241.html',
  'JR West 2019 official full 323 fleet deployment for OsakaLoop and Yumesaki. 2024 platform-gap notice identifies 323 mainly Local; service reference only, not all departures. Additional https://www.westjr.co.jp/press/article/items/240314_00_press_dansa.pdf'),
 ('official-conventional-jrwest-223-225-rapid-20261030',
  'https://www.westjr.co.jp/press/article/2020/02/page_15645.html',
  'JR West: JR Kyoto/Kobe rapid and special rapid use 223 and 225 series. Corridor fleet presence, not exclusive current per-train allocation.'),
 ('official-conventional-jrkyushu-813-817-corridor-20261030',
  'https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2025/11/27/20251127_Autonomous_driving_section_expansion_press.pdf',
  '2025-11-27 official: 813 and 817 target fleets for GOA2.0 in KagoshimaMain Mojiko-Arao and Nippo Kokura-Usa, planned 2025-12-01. Region-specific fleet presence, not statement of all trains, not actual ATO application for individual runs.'),
 ('official-conventional-jrkyushu-chikuhi-303-305-20261030',
  'https://www.jrkyushu.co.jp/common/inc/news/newtopics/__icsFiles/afieldfile/2021/03/11/210311ipadwokatsuyou.pdf',
  'JR Kyushu official 2021 303 and 305 cars on some Chikuhi/Karatsu trains Meinohama-Nishikaratsu. Historical fleet presence; no evidence of a particular 2026 timetable or carset.'),
 ('official-conventional-jrkyushu-chikuhi-103-20261030',
  'https://www.jrkyushu.co.jp/news/__icsFiles/afieldfile/2026/10/14/20261014_karatsu_kunchi_chikuhisen_103kei_headmark.pdf',
  'JR Kyushu 2026-10-14 official announcement: Chikuhi 103 series five formations, headmarks from Oct19 to around Nov5, Chikuzen-Maebaru-Karatsu; 唐津線 Karatsu-Nishikaratsu. No exact daily service/carset or specific headmark image confirmed.')
 ), pending AS (
 SELECT s.*,ROW_NUMBER() OVER(ORDER BY source_key) rn FROM source_data s
 WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources e WHERE e.source_key=s.source_key)
 )
 INSERT INTO public.evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
 SELECT bs+rn,source_key,source_url,'official','C',notes FROM pending;

 SELECT COALESCE(max(id),0) INTO br FROM public.operation_family_rules;
 WITH plans(operator,network_key,code_pattern,candidates,train_types,segment_scope,source_key,note) AS (
 VALUES
 ('JR-West','OsakaLoop','PLAN:OFFICIAL-OSAKALOOP-LOCAL-323-REFERENCE',
   ARRAY['JR西日本323系']::text[], ARRAY['Local']::text[], '{}'::jsonb,
   'official-conventional-jrwest-323-local-20261030',
   '323 OsakaLoop local service fleet presence; non-exclusive representative only, not guaranteed each train. No exact PNG.'),
 ('JR-West','TokaidoKansai','PLAN:OFFICIAL-KANSAI-RAPID-223-225-REFERENCE',
   ARRAY['JR西日本223系','JR西日本225系']::text[], ARRAY['Rapid']::text[], '{"corridor":"JR Kyoto / JR Kobe; do not extend beyond verified stations"}'::jsonb,
   'official-conventional-jrwest-223-225-rapid-20261030',
   'Regional express 223/225 series partial candidates only, no unique car or current train.'),
 ('JR-Kyushu','KagoshimaMain','CORRIDOR:OFFICIAL-KAGOSHIMA-813-817-MOJIKO-ARAO',
   ARRAY['JR九州813系','JR九州817系']::text[], ARRAY['Local','Rapid']::text[],
   '{"fromStation":"Mojiko","toStation":"Arao","needsSegmentVerification":true}'::jsonb,
   'official-conventional-jrkyushu-813-817-corridor-20261030',
   'GOA2.0 targeted rolling stock on Mojiko-Arao only. Do not link to line-wide timetables; region evidence.'),
 ('JR-Kyushu','Nippo','CORRIDOR:OFFICIAL-NIPPO-813-817-KOKURA-USA',
   ARRAY['JR九州813系','JR九州817系']::text[], ARRAY['Local','Rapid']::text[],
   '{"fromStation":"Kokura","toStation":"Usa","needsSegmentVerification":true}'::jsonb,
   'official-conventional-jrkyushu-813-817-corridor-20261030',
   'GOA2.0 targeted rolling stock on Kokura-Usa only. No train-level dispatch evidence.'),
 ('JR-Kyushu','Chikuhi','CORRIDOR:OFFICIAL-CHIKUHI-303-305-MEINOHAMA-NISHIKARATSU',
   ARRAY['JR九州303系','JR九州305系']::text[], ARRAY['Local','Rapid']::text[],
   '{"fromStation":"Meinohama","toStation":"Nishi-Karatsu","needsSegmentVerification":true,"publishedYear":2021}'::jsonb,
   'official-conventional-jrkyushu-chikuhi-303-305-20261030',
   'Published 2021 historical stock on some trains; 2026 carset not verified.'),
 ('JR-Kyushu','Chikuhi','CORRIDOR:OFFICIAL-CHIKUHI-103-CHIKUZENMAEBARU-KARATSU',
   ARRAY['JR九州103系']::text[], ARRAY['Local','Rapid']::text[],
   '{"fromStation":"Chikuzen-Maebaru","toStation":"Karatsu","needsSegmentVerification":true,"publishedYear":2026}'::jsonb,
   'official-conventional-jrkyushu-chikuhi-103-20261030',
   '2026 announcement 103 stock/headmark in Chikuzen-Maebaru-Karatsu section, not exact service assignment or PNG.')
 ), pending AS (
 SELECT p.*,e.id source_id,ROW_NUMBER() OVER(ORDER BY p.operator,p.network_key,p.code_pattern) rn
 FROM plans p JOIN public.evidence_sources e ON e.source_key=p.source_key
 WHERE NOT EXISTS (
 SELECT 1 FROM public.operation_family_rules r WHERE r.operator=p.operator
 AND r.network_key=p.network_key AND r.code_pattern=p.code_pattern
 AND r.effective_from=DATE '2026-10-30' AND r.calendar_type=''
 )
 )
 INSERT INTO public.operation_family_rules
 (id,operator,network_key,code_pattern,effective_from,effective_to,
  exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope)
 SELECT br+rn,operator,network_key,code_pattern,DATE '2026-10-30',NULL,
   NULL,candidates,'',source_id,note,
   jsonb_build_object('lineIds',jsonb_build_array(network_key),
                      'planOnly',true,'trainTypes',to_jsonb(train_types),
                      'fleetCompleteness','partial',
                      'evidenceScope',CASE WHEN code_pattern LIKE 'CORRIDOR:%'
                         THEN 'segment_inventory_not_timetable_plan'
                         ELSE 'route_fleet_presence_not_each_train' END)
   ||segment_scope
 FROM pending;
END $add$;

-- Existing public mappings unchanged; preserve private audit's column contract.
-- Fleet references on generic service classes must NEVER be described as complete
-- dispatch assignments or scheduled actual carsets.
CREATE OR REPLACE VIEW rail_audit.official_conventional_timetable_plans
WITH (security_invoker = true) AS
SELECT DISTINCT t.id AS timetable_id,l.line_key,t.calendar_urn,t.primary_train_number,
 t.timetable_validity,f.operator,f.code_pattern,
 f.vehicle_candidates AS planned_vehicle_candidates,
 f.source_id AS official_model_source_id,e.source_url AS official_model_source_url,
 f.effective_from AS plan_evidence_valid_from,
 CASE WHEN f.plan_scope->>'fleetCompleteness'='partial'
      THEN 'PARTIAL_FLEET_REFERENCE_UNDATED'
      ELSE 'PLANNED_FLEET_UNVERIFIED_TIMETABLE'
 END::text AS plan_status,
 false AS actual_vehicle_confirmed,NULL::text AS exact_png_path
FROM public.train_timetables t
JOIN public.train_timetable_lines l ON l.timetable_id=t.id
JOIN public.train_timetable_stops st ON st.timetable_id=t.id AND st.stop_sequence=1
JOIN public.operation_family_rules f ON f.network_key=l.line_key
 AND f.code_pattern LIKE 'PLAN:OFFICIAL-%'
 AND f.plan_scope @> '{"planOnly":true}'::jsonb
 AND (f.plan_scope->'lineIds') ? l.line_key
 AND (f.plan_scope->'trainTypes') ?
   regexp_replace(st.train_type_urn,'^.*[.]','','g')
 AND (NOT f.plan_scope ? 'candidateLabelsAny'
      OR (f.plan_scope->'candidateLabelsAny') ?
      regexp_replace(t.primary_train_number,'[0-9０-９]+号?$','','g'))
JOIN public.evidence_sources e ON e.id=f.source_id
WHERE t.timetable_validity='undated_not_current_verified'
 AND cardinality(f.vehicle_candidates)>0;

-- Keep segment-only citations separate: no joins to individual timetables.
CREATE OR REPLACE VIEW rail_audit.official_conventional_corridor_fleet_inventory
WITH (security_invoker = true) AS
SELECT f.operator,f.network_key AS line_key,f.code_pattern,
 f.vehicle_candidates AS evidenced_fleet,
 f.plan_scope->>'fromStation' AS from_station,
 f.plan_scope->>'toStation' AS to_station,
 f.plan_scope->>'evidenceScope' AS evidence_scope,
 e.source_url,f.notes,
 false AS dispatch_confirmed,NULL::text AS exact_png_path
FROM public.operation_family_rules f
JOIN public.evidence_sources e ON e.id=f.source_id
WHERE f.code_pattern LIKE 'CORRIDOR:OFFICIAL-%'
 AND f.plan_scope @> '{"needsSegmentVerification":true}'::jsonb;

REVOKE ALL ON rail_audit.official_conventional_timetable_plans FROM PUBLIC,anon,authenticated;
REVOKE ALL ON rail_audit.official_conventional_corridor_fleet_inventory FROM PUBLIC,anon,authenticated;