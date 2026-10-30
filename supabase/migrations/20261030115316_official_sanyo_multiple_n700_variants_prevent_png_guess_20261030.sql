-- Official JR group reservation service: Nozomi, Hikari and Kodama
-- cannot be restricted to a single N700 variant. 16-car services include
-- N700/N700A/N700S; eight-car Sanyo services and old vehicle types remain
-- separate candidates. This migration only expands PLAN alternatives.
DO $west$
DECLARE ref bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(20261030,70053);
 SELECT id INTO ref FROM public.evidence_sources
 WHERE source_key='smart-ex-official-sanyo-multiple-n700-variants-20261030';
 IF ref IS NULL THEN
  INSERT INTO public.evidence_sources
  (id,source_key,source_url,source_type,evidence_grade,notes)
  SELECT coalesce(max(id),0)+1,
     'smart-ex-official-sanyo-multiple-n700-variants-20261030',
     'https://smart-ex.jp/en/beginner/equipment/n700/',
     'official','C',
     'Official JR booking equipment page: 16-car Nozomi/Hikari/Kodama may use N700, N700A, N700S. 8-car services may use N700, and other Kodama/Hikari rolling stock remains possible. Planned candidate family only; no exact train or carset.'
  FROM public.evidence_sources RETURNING id INTO ref;
 END IF;
 UPDATE public.operation_family_rules SET
   vehicle_candidates=ARRAY['N700系','N700A系','N700S系']::text[],
   source_id=ref,
   notes=coalesce(notes,'')||' / 2026-10-30 Smart-EX verified multiple N700/N700A/N700S variants; no single-model PNG for のぞみ.'
 WHERE operator='JR-West' AND network_key='SanyoShinkansen'
   AND code_pattern='PLAN:REMAIN-57' AND exact_vehicle_type IS NULL
   AND vehicle_candidates=ARRAY['JR西日本N700系']::text[];

 UPDATE public.operation_family_rules SET
   vehicle_candidates=ARRAY['JR西日本500系','JR西日本N700系7000番台','JR西日本700系7000番台','N700A系','N700S系']::text[],
   source_id=ref,
   notes=coalesce(notes,'')||' / 2026-10-30 Smart-EX: 16-car Kodama also may use N700A/N700S; no single-model PNG.'
 WHERE operator='JR-West' AND network_key='SanyoShinkansen'
   AND code_pattern='PLAN:REMAIN-58' AND exact_vehicle_type IS NULL
   AND vehicle_candidates=ARRAY['JR西日本500系','JR西日本N700系7000番台','JR西日本700系7000番台']::text[];

 UPDATE public.operation_family_rules SET
   vehicle_candidates=ARRAY['JR西日本N700系','JR西日本700系7000番台','N700A系','N700S系']::text[],
   source_id=ref,
   notes=coalesce(notes,'')||' / 2026-10-30 Smart-EX: Hikari may also use N700A/N700S in 16-car trains; no single-model PNG.'
 WHERE operator='JR-West' AND network_key='SanyoShinkansen'
   AND code_pattern='PLAN:SANYO-HIKARI-RAILSTAR'
   AND exact_vehicle_type IS NULL
   AND vehicle_candidates=ARRAY['JR西日本N700系','JR西日本700系7000番台']::text[];
END
$west$;