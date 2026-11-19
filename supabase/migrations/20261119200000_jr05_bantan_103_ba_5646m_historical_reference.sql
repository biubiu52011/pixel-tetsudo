-- JR-05 | JR West Bantan line: one historically photographed 103-series train number.
-- 2026-04-26 photo report documents Bantan 103 series operating 5646M,
-- but does not prove any BA-G1/G2/G3 formation/PNG variant:
-- https://tetuban31.blog.fc2.com/blog-entry-3392.html
-- 2026-10-11 independent sighting lists 5646M as BH3+BH6, confirming
-- the same number may use paired 2-car sets, not a stable formation identity:
-- https://search.yahoo.co.jp/realtime/search?ei=UTF-8&p=103%E7%B3%BB+%E5%8A%A0%E5%8F%A4%E5%B7%9D%E7%B7%9A&rkf=1
-- JR-West official 2026-11 timetable confirms 5646M (up Bantan, 2026-11):
-- https://timetable.jr-odekake.net/line-timetable/2443?arv_node=&day=5&dep_node=&hour=&index=&min=&month=11&year=2026
-- The generic asset BA.png is review/requires_review, PNG format unknown.
-- DO NOT promote its asset status or permit train graphics to auto-select it.
-- DO NOT allocate same 5646M to BA-G1, BA-G2, BA-G3 variants.
-- This row is historical number-to-series reference ONLY; it does not
-- certify JR-West 2026-11 actual train stock, individual day, set identity,
-- photograph-to-image fidelity or appropriate runtime display.
-- No range expansion to other 5600M numbers; preserve existing JS guards.
BEGIN;
DO $before$
DECLARE n_asset INTEGER; n_occupied INTEGER;
BEGIN
 SELECT COUNT(*) INTO n_asset FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR西日本/JR西日本_103系_播但線_BA.png'
 AND operator='JR-West' AND asset_status='review'
 AND asset_scope='review' AND appearance_class='requires_review'
 AND vehicle_type='103系' AND file_format_status IS NULL;
 IF n_asset<>1 THEN RAISE EXCEPTION 'JR05: expected one quarantined Bantan 103 BA illustration'; END IF;
 SELECT COUNT(*) INTO n_occupied FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Bantan' AND suffix='M'
 AND min_number<=5646 AND max_number>=5646;
 IF n_occupied<>0 THEN RAISE EXCEPTION 'JR05: Bantan 5646M has existing reference'; END IF;
END
$before$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Bantan','png_band/Bantan/5646-5646M',5646,5646,'M',NULL,
 '../images/列车/JR西日本/JR西日本_103系_播但線_BA.png',NULL,FALSE,FALSE);
DO $after$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Bantan'
 AND segment_key='png_band/Bantan/5646-5646M'
 AND min_number=5646 AND max_number=5646 AND suffix='M'
 AND png_reference='../images/列车/JR西日本/JR西日本_103系_播但線_BA.png' AND vehicle_model IS NULL
 AND source_url IS NULL AND NOT requires_exact_roster AND NOT actual_vehicle_confirmed)<>1
 THEN RAISE EXCEPTION 'JR05: documented reference singleton missing'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges a
  JOIN public.published_train_png_number_ranges b
  ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
  AND a.min_number<=b.max_number AND b.min_number<=a.max_number
  AND a.png_reference<>b.png_reference
  WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
  AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR05: same line/suffix/number mapped to competing PNGs'; END IF;
END
$after$;
COMMIT;
