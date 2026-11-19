-- JR-02 | JR East Boso-area converted E233, one historically documented 1235M.
-- 2026-10-13/14 actual E233-0 Makuhari C1 assignment to 1235M
-- https://4gousya.net/forums/post/134125
-- https://2nd-train.net/topics/article/79153/
-- 2026-11 timetable confirms Sotobo 1235M exists (not the rolling stock):
-- https://timetables.jreast.co.jp/2611/timetable-v/220d2p.html
-- Additional independent 2026-10 sightings identify C3/C9 on the SAME
-- service number on DIFFERENT dates: the number is not a physical carset.
-- The PNG asset is review-only and MUST REMAIN so; exact image appearance,
-- present-date stock, service calendar, and train composition are not proven.
-- U101 583-color 3M on 2026-07-18 was considered but is excluded because
-- Hakushin 3M already belongs to a different E653-series reference PNG.
-- Do not infer any 1234/1236 or other unseen numbers. Original line/model/date
-- runtime guards remain authoritative. This is a non-authoritative reference.
BEGIN;
DO $jr02_pre$
DECLARE asset_count integer; overlap_count integer;
BEGIN
 SELECT COUNT(*) INTO asset_count FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png'
 AND operator='JR-East' AND asset_status='review'
 AND asset_scope='review' AND appearance_class='requires_review'
 AND vehicle_type='E233系' AND file_format_status IS NULL;
 IF asset_count<>1 THEN
   RAISE EXCEPTION 'JR02: Boso-area E233 PNG review registration has changed';
 END IF;
 SELECT COUNT(*) INTO overlap_count FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Sotobo' AND suffix='M'
 AND segment_key LIKE 'png_band/%'
 AND min_number<=1235 AND max_number>=1235;
 IF overlap_count<>0 THEN
   RAISE EXCEPTION 'JR02: Sotobo 1235M already has a pure PNG reference';
 END IF;
END
$jr02_pre$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Sotobo','png_band/Sotobo/1235-1235M',1235,1235,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png',NULL,FALSE,FALSE);
DO $jr02_post$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Sotobo'
 AND segment_key='png_band/Sotobo/1235-1235M'
 AND min_number=1235 AND max_number=1235 AND suffix='M'
 AND vehicle_model IS NULL AND png_reference='../images/列车/JR東日本/JR東日本_E233系_房総地区_改造車.png'
 AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR02: historical reference singleton missing or invalid';
 END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR02: multiple PNGs share a pure number interval'; END IF;
END
$jr02_post$;
COMMIT;
