-- Source-derived JR November 2026 reference-only number bands.
-- The source scripts remain the authority for date, direction, station, type,
-- operator and PNG eligibility. This SQL does NOT authorize a train picture.
-- Excludes mixed-fleet Shinonoi Local, Ominato (no approved PNG),
-- and Suigun 9821D/9822D (Kazekko uses a different unapproved image).
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Shinonoi','png_band/Shinonoi/1001-1026M',1001,1026,'M',NULL,'../images/列车/JR東海/JR東海_383系.png',NULL,FALSE,FALSE),
  ('2611','Shinonoi','png_band/Shinonoi/2530-2530M',2530,2530,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','Shinonoi','png_band/Shinonoi/2535-2535M',2535,2535,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','Shinonoi','png_band/Shinonoi/2537-2537M',2537,2537,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','Shinonoi','png_band/Shinonoi/3526-3526M',3526,3526,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0320-0325D',320,325,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0327-0330D',327,330,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0332-0339D',332,339,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0341-0341D',341,341,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0820-0848D',820,848,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/0920-0949D',920,949,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/8325-8326D',8325,8326,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/9324-9324D',9324,9324,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/9329-9329D',9329,9329,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Suigun','png_band/Suigun/9841-9841D',9841,9841,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','SuigunBranch','png_band/SuigunBranch/0920-0949D',920,949,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系0番台.png',NULL,FALSE,FALSE),
  ('2611','Tsugaru','png_band/Tsugaru/0322-0322M',322,322,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_秋田地区.png',NULL,FALSE,FALSE),
  ('2611','Tsugaru','png_band/Tsugaru/0324-0339M',324,339,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_秋田地区.png',NULL,FALSE,FALSE),
  ('2611','Tsugaru','png_band/Tsugaru/0341-0341M',341,341,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_秋田地区.png',NULL,FALSE,FALSE),
  ('2611','Yonezawa','png_band/Yonezawa/7142-7159D',7142,7159,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
