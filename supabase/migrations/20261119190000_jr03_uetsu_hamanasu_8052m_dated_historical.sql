-- JR-03 | documented 2026-08-14 historical Inaho 52 / 8052M only.
-- JR-East 2611 public train-number page:
-- https://timetables.jreast.co.jp/2611/train/110/112631.html
-- JR-East 2611 255u1 references seasonal 8052M; its future calendar may be
-- January 2027 rather than November 2026. DO NOT treat the 2611 page as
-- evidence that 8052M runs in November.
-- Dated independent sighting: on 2026-08-14 U-107 (ハマナス色) carried
-- Inaho 52 8052M, documented on 羽越本線 at 村上の鉄橋:
-- https://search.yahoo.co.jp/realtime/search/E653%E7%B3%BB/?ei=UTF-8&mtype=image&p=E653%E7%B3%BB
-- This is a historical number-to-artwork *reference*, NOT a date-gated
-- carset, and does not license 8052M on other dates or any 8xxxM interval.
-- Existing JREastUetsuNumberIndex202611 has strict official regular
-- number, station, train type and calendar matching and DOES NOT
-- include 8052M. Do not change its match or release a real-time livery.
-- Inaho 1-14M already has JR-East.Hakushin generic E653 artwork;
-- no competing scope for those same Hakushin numbers is inserted.
BEGIN;
DO $verify$
DECLARE asset_rows integer; matching_band integer; unknown_line integer;
BEGIN
 SELECT COUNT(*) INTO asset_rows FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E653系_1000番台_ハマナス色.png' AND operator='JR-East'
 AND asset_status='available' AND asset_scope='theme'
 AND appearance_class='standard_or_fixed_livery'
 AND vehicle_type='E653系' AND file_format_status='native_png';
 IF asset_rows<>1 THEN RAISE EXCEPTION 'JR-03: Hamanasu asset changed'; END IF;
 SELECT COUNT(*) INTO matching_band FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Uetsu' AND suffix='M'
 AND segment_key LIKE 'png_band/%' AND min_number<=8052 AND max_number>=8052;
 IF matching_band<>0 THEN RAISE EXCEPTION 'JR-03: Uetsu 8052M already assigned'; END IF;
 -- Prove same number is not being reassigned over the existing generic
 -- Hakushin scoped artwork by NEVER creating a Hakushin row here.
 SELECT COUNT(*) INTO unknown_line FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Hakushin'
 AND suffix='M' AND min_number<=8052 AND max_number>=8052
 AND segment_key LIKE 'png_band/%';
 IF unknown_line<>0 THEN RAISE EXCEPTION 'JR-03: seasonal Hakushin overlap already exists; audit first'; END IF;
END
$verify$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Uetsu','png_band/Uetsu/8052-8052M',8052,8052,'M',NULL,
 '../images/列车/JR東日本/JR東日本_E653系_1000番台_ハマナス色.png',NULL,FALSE,FALSE);
DO $post$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Uetsu'
 AND segment_key='png_band/Uetsu/8052-8052M' AND min_number=8052 AND max_number=8052
 AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E653系_1000番台_ハマナス色.png' AND vehicle_model IS NULL
 AND source_url IS NULL AND NOT requires_exact_roster AND NOT actual_vehicle_confirmed)<>1
 THEN RAISE EXCEPTION 'JR-03: exact dated historical reference insert invalid'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611'
 AND a.segment_key LIKE 'png_band/%' AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR-03: cross-PNG pure reference overlap'; END IF;
END
$post$;
COMMIT;
