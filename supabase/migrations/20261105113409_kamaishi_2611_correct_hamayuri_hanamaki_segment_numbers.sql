-- JR East 2611 Kamaishi->Tohoku Main same-service renumbering:
-- 5559D Morioka->Hanamaki becomes 3659D Hanamaki->Kamaishi.
-- 3662D Kamaishi->Hanamaki becomes 5562D Hanamaki->Morioka.
-- Do NOT treat Tohoku section numbers as independently operating over
-- Kamaishi. Keep original historical SQL source segments for future joins.
-- https://timetables.jreast.co.jp/2611/train/150/154661.html
-- https://timetables.jreast.co.jp/2611/train/150/154751.html
BEGIN;
DELETE FROM public.published_train_number_evidence
 WHERE edition='2611' AND line_key='Kamaishi'
 AND train_number IN ('5559D','5562D');
DELETE FROM public.published_kamaishi_2611_number_roster
 WHERE edition='2611' AND line_key='Kamaishi'
 AND train_number IN ('5559D','5562D');
DELETE FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Kamaishi'
 AND min_number=5559 AND max_number=5562 AND suffix='D';
COMMENT ON TABLE public.published_kamaishi_2611_number_roster IS
 '2026-11 Kamaishi segment numbers only. 5559D and 5562D are Tohoku Main connection segment numbers; 3659D and 3662D are the Kamaishi segments. Never actual carset.';
COMMIT;