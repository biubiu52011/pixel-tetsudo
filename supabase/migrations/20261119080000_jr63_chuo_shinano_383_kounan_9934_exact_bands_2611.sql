-- JR63: reference-only intervals derived from existing 2611 exact roster SQL.
-- ChuoCentral Shinano 383: eight existing individually published train numbers;
-- six consecutive 1001M-1006M and two separated 1011M/1026M.
-- Kounan KiHa110 maintenance 9934D: one existing historical service reference.
-- Do not infer train stock, daily services, new trips, or fill missing numbers.
BEGIN;
DO $preflight$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='ChuoCentral'
 AND segment_key='2611_shinano_exact_planned_number_reference'
 AND min_number=max_number AND suffix='M' AND vehicle_model='383系'
 AND requires_exact_roster=TRUE AND actual_vehicle_confirmed=FALSE
 AND png_reference='../images/列车/JR東海/JR東海_383系.png'
 AND min_number IN (1001,1002,1003,1004,1005,1006,1011,1026)
 AND source_url IS NOT NULL) <> 8
 THEN RAISE EXCEPTION 'JR63: ChuoCentral eight official roster rows changed'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='ChuoCentral'
 AND segment_key='2611_shinano_exact_planned_number_reference'
 AND png_reference='../images/列车/JR東海/JR東海_383系.png') <> 8
 THEN RAISE EXCEPTION 'JR63: ChuoCentral original roster contains unexpected rows'; END IF;
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Kounan' AND segment_key='maintenance'
 AND min_number=9934 AND max_number=9934 AND suffix='D' AND
 vehicle_model='キハ110系' AND source_url IS NOT NULL
 AND requires_exact_roster=TRUE AND actual_vehicle_confirmed=FALSE
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png') <> 1
 THEN RAISE EXCEPTION 'JR63: Kounan 9934D source roster changed'; END IF;
 IF (SELECT COUNT(*) FROM public.vehicle_image_assets
 WHERE ((image_path='images/列车/JR東海/JR東海_383系.png'
 AND operator='JR-Central' AND vehicle_type='383系')
 OR (image_path='images/列车/JR東日本/JR東日本_キハ110系.png'
 AND operator='JR-East' AND vehicle_type='キハ110系'))
 AND file_format_status='native_png' AND asset_status='available') <> 2
 THEN RAISE EXCEPTION 'JR63: source PNG asset registration changed'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges x
 JOIN (VALUES
 ('ChuoCentral',1001,1006,'M'),
 ('ChuoCentral',1011,1011,'M'),
 ('ChuoCentral',1026,1026,'M'),
 ('Kounan',9934,9934,'D')
 ) t(line_key,lo,hi,suffix) ON x.line_key=t.line_key AND x.suffix=t.suffix
 WHERE x.edition='2611' AND x.segment_key LIKE 'png_band/%'
 AND x.min_number<=t.hi AND x.max_number>=t.lo
 ) THEN RAISE EXCEPTION 'JR63: target pure-number bands already overlap'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','ChuoCentral','png_band/ChuoCentral/1001-1006M',1001,1006,'M',NULL,'../images/列车/JR東海/JR東海_383系.png',NULL,FALSE,FALSE),
('2611','ChuoCentral','png_band/ChuoCentral/1011-1011M',1011,1011,'M',NULL,'../images/列车/JR東海/JR東海_383系.png',NULL,FALSE,FALSE),
('2611','ChuoCentral','png_band/ChuoCentral/1026-1026M',1026,1026,'M',NULL,'../images/列车/JR東海/JR東海_383系.png',NULL,FALSE,FALSE),
('2611','Kounan','png_band/Kounan/9934-9934D',9934,9934,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN
 ('png_band/ChuoCentral/1001-1006M',
  'png_band/ChuoCentral/1011-1011M',
  'png_band/ChuoCentral/1026-1026M',
  'png_band/Kounan/9934-9934D')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 4
 THEN RAISE EXCEPTION 'JR63: not all four new pure-number records persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR63: ambiguous pure-number bands'; END IF;
END;
$verify$;
COMMIT;
