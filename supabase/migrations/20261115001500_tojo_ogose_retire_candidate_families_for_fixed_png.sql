-- 2026-11-15: The Tojo/Ogose map now uses a single explicit PNG
-- illustration per service/working from tob u-tojo-through-fleet-202611.js
-- (TobuTojoFixedPng202611). Do not keep multi-model candidate families
-- alive in the database for the same service scope. No actual formations
-- are invented by this change.
BEGIN;
UPDATE public.operation_family_rules
SET vehicle_candidates=ARRAY[]::text[],
    exact_vehicle_type=NULL,
    effective_to=DATE '2026-11-14',
    notes=concat_ws(' | ',nullif(notes,''),
      'SUPERSEDED_20261115_BY_SCOPED_FIXED_PNG_ILLUSTRATIONS_NOT_ACTUAL_VEHICLE_ID')
WHERE ((network_key='Tojo' AND code_pattern IN (
    'PLAN:TOJO-WAKOSHI-TOBU-10','PLAN:TOJO-WAKOSHI-METRO-10',
    'PLAN:TOJO-WAKOSHI-METRO-8','PLAN:TOJO-WAKOSHI-TOKYU-8',
    'PLAN:TOJO-WAKOSHI-TOKYU-10','PLAN:TOJO-GROUND-10CAR',
    'PLAN:TOJO-WEST-4CAR','PLAN:OFFICIAL-TJLINER-50090'
  )) OR (network_key='Ogose' AND code_pattern='PLAN:OGOSE-4CAR'))
  AND (effective_to IS NULL OR effective_to>DATE '2026-11-14');

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.operation_family_rules
      WHERE (network_key='Tojo' AND code_pattern IN (
        'PLAN:TOJO-WAKOSHI-TOBU-10','PLAN:TOJO-WAKOSHI-METRO-10',
        'PLAN:TOJO-WAKOSHI-METRO-8','PLAN:TOJO-WAKOSHI-TOKYU-8',
        'PLAN:TOJO-WAKOSHI-TOKYU-10','PLAN:TOJO-GROUND-10CAR',
        'PLAN:TOJO-WEST-4CAR','PLAN:OFFICIAL-TJLINER-50090'
      )) OR (network_key='Ogose' AND code_pattern='PLAN:OGOSE-4CAR'))<>9
  THEN RAISE EXCEPTION 'Tojo fixed PNG predecessor rule count drift'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.operation_family_rules
    WHERE ((network_key='Tojo' AND code_pattern LIKE 'PLAN:TOJO-%')
           OR (network_key='Ogose' AND code_pattern='PLAN:OGOSE-4CAR')
           OR (network_key='Tojo' AND code_pattern='PLAN:OFFICIAL-TJLINER-50090'))
      AND (coalesce(array_length(vehicle_candidates,1),0)<>0
           OR exact_vehicle_type IS NOT NULL
           OR effective_to>=DATE '2026-11-15'
           OR effective_to IS NULL)
  ) THEN RAISE EXCEPTION 'Tojo/Ogose old multi-model rules remain active'; END IF;
  IF (SELECT count(*) FROM public.vehicle_image_assets
      WHERE asset_status='available' AND asset_scope='generic'
        AND ( (operator='Tobu' AND (vehicle_type,image_path) IN (
              ('8000型','images/列车/東武鉄道/東武鉄道_8000型.png'),
              ('50000型','images/列车/東武鉄道/東武鉄道_50000型.png'),
              ('50070型','images/列车/東武鉄道/東武鉄道_50070型.png'),
              ('50090型','images/列车/東武鉄道/東武鉄道_50090型.png')))
          OR (operator='TokyoMetro' AND vehicle_type='17000系'
              AND image_path='images/列车/東京メトロ/東京メトロ_17000系.png')
          OR (operator='Tokyu' AND vehicle_type='5050系'
              AND image_path='images/列车/東急電鉄/東急電鉄_5050系.png')
        )
  )<>6 THEN RAISE EXCEPTION 'Not all six fixed PNGs are gallery approved'; END IF;
END
$verify$;
COMMIT;
