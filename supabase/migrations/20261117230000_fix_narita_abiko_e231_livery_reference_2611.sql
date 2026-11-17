-- Forward-only fix for a reference-only PNG number band. No physical carset proof.
-- Preserve original SQL seed history; the browser's existing dated number roster
-- remains authoritative for actual train display.
UPDATE public.published_train_png_number_ranges
SET png_reference='../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png'
WHERE edition='2611'
  AND line_key='NaritaAbikoBranch'
  AND segment_key='png_band/NaritaAbikoBranch/0820-0899M'
  AND min_number=820 AND max_number=899 AND suffix='M'
  AND png_reference='../images/列车/JR東日本/JR東日本_E231系_0番台.png'
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
