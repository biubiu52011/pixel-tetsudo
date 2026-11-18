-- JR56: JR West KiHa189 "Hamakaze" exact Bantan-line train number references.
-- Official JR West 2026-11-14 Hamakaze 1 train timetable: 1D
-- https://timetable.jr-odekake.net/train-timetable/238642?date=20261114
-- Official JR West 2026-11-04 Hamakaze 2 train timetable: 2D
-- https://timetable.jr-odekake.net/train-timetable/238671?date=20261104
-- Operator Bantan corridor timetable (Osaka/Himeji--Wadayama, 2026-11-07):
-- https://timetable.jr-odekake.net/line-timetable/2442?arv_node=&day=7&dep_node=&hour=&index=&min=&month=11&year=2026
-- JR West 2025 fleet report formally associates Hamakaze with KiHa189:
-- https://www.westjr.co.jp/company/info/issue/data/pdf/data2025_15.pdf
--
-- SOURCE-ONLY: the exact 1D and 2D are official schedule numbers, not proof
-- that a particular 2026-11-18 train actually ran with this specific image.
-- Both endpoints independently documented, so ONE compact interval 0001-0002D.
-- Do NOT infer 0D/3D or propagate to SanyoMain, SaninMain or TokaidoKansai.
-- PNG remains review/requires_review; no front-end automatic image selection.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/JR西日本/JR西日本_キハ189系.png'
      AND operator='JR-West' AND vehicle_type='キハ189系'
      AND asset_scope='review' AND asset_status='review'
      AND file_format_status IS NULL AND appearance_class='requires_review'
      AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'JR56: unapproved KiHa189 gallery identity was changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='Bantan' AND suffix='D'
      AND (1 BETWEEN min_number AND max_number OR 2 BETWEEN min_number AND max_number)
 ) THEN RAISE EXCEPTION 'JR56: Bantan 1D/2D already has an assigned image'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Bantan','png_band/Bantan/0001-0002D',1,2,'D',
 NULL,'../images/列车/JR西日本/JR西日本_キハ189系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
      WHERE edition='2611' AND line_key='Bantan' AND suffix='D'
        AND segment_key='png_band/Bantan/0001-0002D'
        AND min_number=1 AND max_number=2
        AND png_reference='../images/列车/JR西日本/JR西日本_キハ189系.png'
        AND vehicle_model IS NULL AND source_url IS NULL
        AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR56: exact Hamakaze Bantan numbers not verified'; END IF;
END;
$verify$;
COMMIT;
