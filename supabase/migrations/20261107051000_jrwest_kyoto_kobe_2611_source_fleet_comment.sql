-- The original 2611 candidate roster is 58 source-only, NOT 56.
-- Reconcile the applied production table comment with the corrected
-- historical migration text. No structure/permissions/data changes.
COMMENT ON TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet IS
'58 historical source-only Kyoto/Kobe 207/321 local and 223/225 rapid fleet candidate rows. Composite train source keys are NOT 2026-11 official public numbers; no verified physical carset or automatic PNG authorization. No Hanwa-only 223/225 gallery reuse.';