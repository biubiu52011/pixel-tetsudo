-- JR48: Agatsuma & Takasaki E257-5500; original JS-0046/0051 contains only 4031M and 4034M.
-- Remove the unsupported 4032M/4033M bridge from both lines; retain service/model/date guards in JS.
-- Pure PNG reference data is NOT a vehicle assignment or livery confirmation.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E257系_5500番台.png' AND asset_status='available' AND file_format_status='native_png')
 THEN RAISE EXCEPTION 'JR48: canonical PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_5500番台.png'
       AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
       AND ((line_key='Agatsuma' AND segment_key='png_band/Agatsuma/4031-4034M' AND min_number=4031 AND max_number=4034)
         OR (line_key='Takasaki' AND segment_key='png_band/Takasaki/4031-4034M' AND min_number=4031 AND max_number=4034)))<>2
 THEN RAISE EXCEPTION 'JR48: original two wide PNG rows changed'; END IF;
 IF EXISTS(WITH proposed(line_key,min_number,max_number) AS
       (VALUES ('Agatsuma',4031,4031),('Agatsuma',4034,4034),('Takasaki',4031,4031),('Takasaki',4034,4034))
       SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
       ON r.edition='2611' AND r.line_key=p.line_key AND r.suffix='M'
       AND r.segment_key LIKE 'png_band/%' AND r.png_reference<>'../images/列车/JR東日本/JR東日本_E257系_5500番台.png'
       AND p.min_number<=r.max_number AND r.min_number<=p.max_number)
 THEN RAISE EXCEPTION 'JR48: other PNG number conflict'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_5500番台.png'
 AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
 AND ((line_key='Agatsuma' AND segment_key='png_band/Agatsuma/4031-4034M' AND min_number=4031 AND max_number=4034)
   OR (line_key='Takasaki' AND segment_key='png_band/Takasaki/4031-4034M' AND min_number=4031 AND max_number=4034));
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Agatsuma','png_band/Agatsuma/4031-4031M',4031,4031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
 ('2611','Agatsuma','png_band/Agatsuma/4034-4034M',4034,4034,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
 ('2611','Takasaki','png_band/Takasaki/4031-4031M',4031,4031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
 ('2611','Takasaki','png_band/Takasaki/4034-4034M',4034,4034,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges
           WHERE edition='2611' AND segment_key IN ('png_band/Agatsuma/4031-4034M','png_band/Takasaki/4031-4034M'))
 THEN RAISE EXCEPTION 'JR48: two unsupported broad rows remain'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND segment_key IN ('png_band/Agatsuma/4031-4031M','png_band/Agatsuma/4034-4034M',
           'png_band/Takasaki/4031-4031M','png_band/Takasaki/4034-4034M')
       AND png_reference='../images/列车/JR東日本/JR東日本_E257系_5500番台.png' AND min_number=max_number
       AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4
 THEN RAISE EXCEPTION 'JR48: four exact references missing'; END IF;
END;
$verify$;
COMMIT;
