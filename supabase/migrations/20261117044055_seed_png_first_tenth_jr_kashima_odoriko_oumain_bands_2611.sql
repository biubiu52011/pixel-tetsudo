-- JR tenth PNG-first reference-only bands (2611).
-- Reuse existing Kashima E131-0 and OuMain E751 SQL bands, and
-- tightly scoped Tokaido 4024M / Ito 3001-3002M JR-East JS guards.
-- These are only reference PNG ranges. Original train number/date/line,
-- train type, service source and carset/roster guards remain mandatory.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Kashima','png_band/Kashima/0523-0551M',523,551,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_0番台.png',NULL,FALSE,FALSE),
  ('2611','Kashima','png_band/Kashima/3521-3547M',3521,3547,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_0番台.png',NULL,FALSE,FALSE),
  ('2611','Tokaido','png_band/Tokaido/4024-4024M',4024,4024,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2500番台.png',NULL,FALSE,FALSE),
  ('2611','Ito','png_band/Ito/3001-3002M',3001,3002,'M',NULL,'../images/列车/JR東日本/JR東日本_E261系_サフィール踊り子.png',NULL,FALSE,FALSE),
  ('2611','OuMain','png_band/OuMain/2021-2022M',2021,2022,'M',NULL,'../images/列车/JR東日本/JR東日本_E751系.png',NULL,FALSE,FALSE),
  ('2611','OuMain','png_band/OuMain/2041-2044M',2041,2044,'M',NULL,'../images/列车/JR東日本/JR東日本_E751系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
