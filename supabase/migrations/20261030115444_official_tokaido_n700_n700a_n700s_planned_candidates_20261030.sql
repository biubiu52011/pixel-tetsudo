-- Official Smart-EX confirms the 16-car Tokaido Shinkansen
-- N700 / N700A / N700S family: operator-wide N700-only plan was too narrow.
-- This removes unjustified single PNG on 7,067 dated run rows; no exact carset.
UPDATE public.operation_family_rules
SET vehicle_candidates=ARRAY['N700系','N700A系','N700S系']::text[],
    source_id=(SELECT id FROM public.evidence_sources
      WHERE source_key='smart-ex-official-sanyo-multiple-n700-variants-20261030'),
    notes=coalesce(notes,'')||
      ' / 2026-10-30 Smart-EX official: Tokaido Nozomi/Hikari/Kodama include N700, N700A and N700S; no single planned vehicle PNG.'
WHERE operator='JR-Central'
  AND network_key='TokaidoShinkansen'
  AND code_pattern='PLAN:REMAIN-52'
  AND exact_vehicle_type IS NULL
  AND vehicle_candidates=ARRAY['JR東海N700系']::text[]
  AND EXISTS (SELECT 1 FROM public.evidence_sources
      WHERE source_key='smart-ex-official-sanyo-multiple-n700-variants-20261030');