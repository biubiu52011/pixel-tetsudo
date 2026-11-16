-- JR fifth PNG-to-public-train-number bands (November 2026).
-- Existing source scripts own applicable date, calendar, direction, route,
-- train type and exact eligible service checks. These ranges are references
-- only and cannot prove a physical vehicle or bypass legacy guards.
-- Source indices: JR East Keihin, Regional (Kururi), RikutoEast and Chiba.
-- Keihin K suffix excluded (mixed Yokohama services); Kururi cancelled
-- 29xxD bus legs excluded; RikutoEast special and ordinary artwork separated.
-- Unverified E257-5000 and cross-model inferred services excluded.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','KeihinTohoku','png_band/KeihinTohoku/0401-2438A',401,2438,'A',NULL,'../images/列车/JR東日本/JR東日本_E233系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','KeihinTohoku','png_band/KeihinTohoku/0411-2450B',411,2450,'B',NULL,'../images/列车/JR東日本/JR東日本_E233系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','KeihinTohoku','png_band/KeihinTohoku/0460-2481C',460,2481,'C',NULL,'../images/列车/JR東日本/JR東日本_E233系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Kururi','png_band/Kururi/0920-0953D',920,953,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/1720-1747D',1720,1747,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/2725-2725D',2725,2725,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/4725-4734D',4725,4734,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/5720-5735D',5720,5735,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/9721-9726D',9721,9726,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png',NULL,FALSE,FALSE),
  ('2611','Narita','png_band/Narita/2520-2545M',2520,2545,'M',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Narita','png_band/Narita/2627-5364F',2627,5364,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Narita','png_band/Narita/2001-2054M',2001,2054,'M',NULL,'../images/列车/JR東日本/JR東日本_E259系.png',NULL,FALSE,FALSE),
  ('2611','NaritaAirportBranch','png_band/NaritaAirportBranch/2627-5364F',2627,5364,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','NaritaAirportBranch','png_band/NaritaAirportBranch/2001-2054M',2001,2054,'M',NULL,'../images/列车/JR東日本/JR東日本_E259系.png',NULL,FALSE,FALSE),
  ('2611','SobuMain','png_band/SobuMain/2627-5364F',2627,5364,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','SobuMain','png_band/SobuMain/2001-2054M',2001,2054,'M',NULL,'../images/列车/JR東日本/JR東日本_E259系.png',NULL,FALSE,FALSE),
  ('2611','SobuRapid','png_band/SobuRapid/0409-2480F',409,2480,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','SobuRapid','png_band/SobuRapid/2001-2054M',2001,2054,'M',NULL,'../images/列车/JR東日本/JR東日本_E259系.png',NULL,FALSE,FALSE),
  ('2611','Yokosuka','png_band/Yokosuka/0408-2356S',408,2356,'S',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Yokosuka','png_band/Yokosuka/0823-1728H',823,1728,'H',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Yokosuka','png_band/Yokosuka/2001-2249M',2001,2249,'M',NULL,'../images/列车/JR東日本/JR東日本_E259系.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/3573-5190F',3573,5190,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/1051-1071M',1051,1071,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_500番台.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/2577-5106F',2577,5106,'F',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Uchibo','png_band/Uchibo/1001-1007M',1001,1007,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_500番台.png',NULL,FALSE,FALSE),
  ('2611','Kashima','png_band/Kashima/2520-2545M',2520,2545,'M',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Keiyo','png_band/Keiyo/1001-1071M',1001,1071,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_500番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
