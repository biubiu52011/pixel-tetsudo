-- 2026-11-14: Extend the existing MF operation-owner/vehicle-family plan to Tojo.
-- This is an evidence-scoped CANDIDATE classification, NOT proof that any
-- particular train, formation or carset operates on a given service date.
-- Exact public train-number -> working-code mappings remain in
-- train_operation_mappings and must not be inferred from a suffix alone.
-- Do NOT write published_train_png_number_ranges for these mixed fleets.
BEGIN;
-- Historic manually assigned IDs left this owned sequence behind MAX(id).
-- Realign monotonically before inserting; do not decrease an advanced sequence.
SELECT setval('public.operation_family_rules_id_seq',
  GREATEST((SELECT COALESCE(MAX(id),1) FROM public.operation_family_rules),
           (SELECT last_value FROM public.operation_family_rules_id_seq)),true);

-- Reuse the 2026-03-14 Metro/Fukutoshin working-family source (457), copying
-- source/effective dates and model candidates instead of inventing new fleet data.
WITH through_rules (source_line,source_pattern,target_pattern,operation_band) AS (
  VALUES
    ('Yurakucho','PLAN:MF-TOBU','PLAN:TOJO-WAKOSHI-TOBU-10','01T-23T odd'),
    ('Yurakucho','PLAN:MF-METRO-10','PLAN:TOJO-WAKOSHI-METRO-10','21S-99S odd'),
    ('Fukutoshin','PLAN:MF-METRO-8','PLAN:TOJO-WAKOSHI-METRO-8','01S-19S odd'),
    ('Fukutoshin','PLAN:MF-TOKYU-8','PLAN:TOJO-WAKOSHI-TOKYU-8','01K-35K odd'),
    ('Fukutoshin','PLAN:MF-TOKYU-10','PLAN:TOJO-WAKOSHI-TOKYU-10','51K-65K odd')
)
INSERT INTO public.operation_family_rules (
  operator,network_key,code_pattern,effective_from,effective_to,
  exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope
)
SELECT r.operator,'Tojo',v.target_pattern,r.effective_from,r.effective_to,
       NULL,r.vehicle_candidates,r.calendar_type,r.source_id,
       'Wakoshi handover: existing 2026 MF working-family candidates; odd-number operation scope. Requires a published Tojo itinerary including Wakoshi. No actual physical formation, no exact train-to-operation crosswalk, no auto PNG.',
       jsonb_build_object('lineIds',jsonb_build_array('Tojo'),
                          'planOnly',true,'overridePlan',true,
                          'operationPatterns',jsonb_build_array(v.operation_band),
                          'anyStationNames',jsonb_build_array('Wakoshi'))
FROM through_rules v
JOIN public.operation_family_rules r
  ON r.network_key=v.source_line AND r.code_pattern=v.source_pattern
WHERE NOT EXISTS (
  SELECT 1 FROM public.operation_family_rules old
  WHERE old.network_key='Tojo' AND old.code_pattern=v.target_pattern
);

-- Route-only candidates are intentionally separate from through-run working
-- numbers. A 90000-series ground-route candidate must NOT be promoted into
-- a confirmed subway through-run vehicle.
WITH fleet_rules (code_pattern,effective_from,vehicle_candidates,scope,notes) AS (
  VALUES (
    'PLAN:TOJO-GROUND-10CAR',DATE '2026-09-26',
    ARRAY['東武9000型','東武9050型','東武10000型','東武10030型',
          '東武30000系','東武50000型','東武50070型','東武50090型',
          '東武90000系']::text[],
    jsonb_build_object(
      'lineIds',jsonb_build_array('Tojo'),'planOnly',true,
      'allStationOperators',jsonb_build_array('Tobu'),
      'anyStationNames',jsonb_build_array('Ikebukuro','Narimasu','Wakoshi',
        'Shiki','Kawagoe','Kawagoeshi','Shinrin-Koen','Musashi-Ranzan')),
    'Main-section fleet candidates only; not a unique train type or formation. 90000 series entered service 2026-09-26; subway through-run start NOT established.'
  ),(
    'PLAN:TOJO-WEST-4CAR',DATE '2026-01-01',
    ARRAY['東武8000型']::text[],
    jsonb_build_object(
      'lineIds',jsonb_build_array('Tojo'),'planOnly',true,
      'anyStationNames',jsonb_build_array(
        'Tobu-Takezawa','Minami-Yorii','Obusuma','Hachigata','Tamayodo')),
    'Ogawamachi-Yorii 4-car 8000 fleet illustration, never an actual trainset ID.'
  ),(
    'PLAN:OGOSE-4CAR',DATE '2026-01-01',
    ARRAY['東武8000型']::text[],
    jsonb_build_object('lineIds',jsonb_build_array('Ogose'),'planOnly',true),
    'Ogose line 4-car 8000 fleet illustration, never an actual trainset ID.'
  )
)
INSERT INTO public.operation_family_rules (
  operator,network_key,code_pattern,effective_from,
  exact_vehicle_type,vehicle_candidates,source_id,notes,plan_scope
)
SELECT 'Tobu',CASE WHEN fr.code_pattern='PLAN:OGOSE-4CAR' THEN 'Ogose' ELSE 'Tojo' END,
       fr.code_pattern,fr.effective_from,NULL,fr.vehicle_candidates,4755,
       fr.notes,fr.scope
FROM fleet_rules fr
WHERE NOT EXISTS (
  SELECT 1 FROM public.operation_family_rules old
  WHERE old.network_key=CASE WHEN fr.code_pattern='PLAN:OGOSE-4CAR' THEN 'Ogose' ELSE 'Tojo' END
    AND old.code_pattern=fr.code_pattern
);
-- Normalize Tobu vehicle aliases to the gallery's canonical 型 labels.
-- The original MF 2026 source retained 系 labels; only our Tojo projection
-- is normalized. Still a fleet candidate, not a dated observed formation.
UPDATE public.operation_family_rules
SET vehicle_candidates=ARRAY['東武50070型','東武9000型','東武9050型']::text[]
WHERE network_key='Tojo' AND code_pattern='PLAN:TOJO-WAKOSHI-TOBU-10';
COMMIT;
