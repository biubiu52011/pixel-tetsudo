-- JR third PNG train-number band batch; no invented ranges or priority.
-- Existing 2611 line-specific JS verifies date, direction, calendar, train type and line section.
-- Ishinomaki 9621D/9624D seasonal services excluded: no eligible PNG in this batch.
-- Kitakami replacement bus and damaged section are NOT authorized by this reference table.
-- Reference bands do not prove actual physical vehicle formation or authorize a display.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Oga','png_band/Oga/1120-1120M',1120,1120,'M',NULL,'../images/列车/JR東日本/JR東日本_EV-E801系.png',NULL,FALSE,FALSE),
  ('2611','Oga','png_band/Oga/1122-1149M',1122,1149,'M',NULL,'../images/列车/JR東日本/JR東日本_EV-E801系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/0640-0640D',640,640,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/1623-1623D',1623,1623,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/1625-1626D',1625,1626,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/1628-1640D',1628,1640,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/1642-1649D',1642,1649,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/2622-2622D',2622,2622,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/2926-2927D',2926,2927,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/2930-2931D',2930,2931,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/2936-2938D',2936,2938,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5620-5620D',5620,5620,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5624-5624D',5624,5624,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5627-5627D',5627,5627,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5651-5651D',5651,5651,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5530-5530D',5530,5530,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Ishinomaki','png_band/Ishinomaki/5543-5543D',5543,5543,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Kitakami','png_band/Kitakami/0722-0722D',722,722,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Kitakami','png_band/Kitakami/0724-0725D',724,725,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Kitakami','png_band/Kitakami/0735-0736D',735,736,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
