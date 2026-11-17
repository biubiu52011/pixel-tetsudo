-- JR eleventh PNG-first reference-only bands (2611).
-- Reuse scoped existing JR-East JS number ranges for Keiyo-through Boso E233,
-- Odoriko E257, Kusatsu-Shima E257, and Joban E531/E657.
-- Keep original publishedNumbers, operatingDates, calendarType, railways,
-- numberIndex, trainTypes, formation and other guards as authoritative.
-- This table is a reference catalog, NOT blanket confirmation that all
-- trains in an interval are assigned these PNGs or real vehicles.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Sotobo','png_band/Sotobo/3680-5983Y',3680,5983,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Ito','png_band/Ito/3021-3031M',3021,3031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Tokaido','png_band/Tokaido/3021-3031M',3021,3031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Agatsuma','png_band/Agatsuma/3001-3004M',3001,3004,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Agatsuma','png_band/Agatsuma/4031-4034M',4031,4034,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Agatsuma','png_band/Agatsuma/9071-9071M',9071,9071,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Agatsuma','png_band/Agatsuma/9082-9083M',9082,9083,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/3001-3004M',3001,3004,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/4001-4009M',4001,4009,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Takasaki','png_band/Takasaki/4031-4034M',4031,4034,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','JobanMain','png_band/JobanMain/1252-1252M',1252,1252,'M',NULL,'../images/列车/JR東日本/JR東日本_E531系.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/1252-1252M',1252,1252,'M',NULL,'../images/列车/JR東日本/JR東日本_E531系.png',NULL,FALSE,FALSE),
  ('2611','JobanMain','png_band/JobanMain/0001-0030M',1,30,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','JobanMain','png_band/JobanMain/0051-0086M',51,86,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','JobanMain','png_band/JobanMain/9037-9037M',9037,9037,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','JobanMain','png_band/JobanMain/9086-9086M',9086,9086,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/0001-0030M',1,30,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/0051-0086M',51,86,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/9037-9037M',9037,9037,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/9086-9086M',9086,9086,'M',NULL,'../images/列车/JR東日本/JR東日本_E657系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
