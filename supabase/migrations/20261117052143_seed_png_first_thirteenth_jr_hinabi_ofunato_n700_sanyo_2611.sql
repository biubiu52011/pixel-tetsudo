-- JR thirteenth PNG-first reference-only train-number ranges (edition 2611).
-- Existing November 2026 JR source rules provide the boundaries for
-- Hinabi (Kamaishi/Kounan), Ofunato KiHa110, Tokaido Shinkansen N700,
-- and Sanyo Shinkansen 500/700. Preserve date/calendar, exact published
-- number, source railway, model and route eligibility checks in JS/SQL.
-- No priority, physical-carset confirmation, or blanket validation of gaps.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Kamaishi','png_band/Kamaishi/8621-8622D',8621,8622,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png',NULL,FALSE,FALSE),
  ('2611','Kounan','png_band/Kounan/9921-9922D',9921,9922,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png',NULL,FALSE,FALSE),
  ('2611','Ofunato','png_band/Ofunato/0321-0340D',321,340,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0001-0001A',1,1,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0004-0004A',4,4,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0007-0007A',7,7,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0010-0011A',10,11,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0013-0015A',13,15,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0023-0023A',23,23,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0027-0028A',27,28,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0031-0031A',31,31,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0034-0034A',34,34,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0040-0040A',40,40,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0046-0046A',46,46,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0050-0050A',50,50,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0054-0054A',54,54,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0062-0062A',62,62,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0074-0074A',74,74,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0634-0634A',634,634,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0646-0646A',646,646,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0656-0656A',656,656,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0658-0658A',658,658,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0660-0660A',660,660,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0666-0666A',666,666,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0668-0668A',668,668,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0701-0704A',701,704,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0706-0712A',706,712,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0714-0714A',714,714,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0716-0722A',716,722,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0731-0731A',731,731,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0828-0828A',828,828,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0840-0840A',840,840,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0850-0850A',850,850,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','TokaidoShinkansen','png_band/TokaidoShinkansen/0852-0852A',852,852,'A',NULL,'../images/列车/JR東海/JR東海_N700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0944-0944A',944,944,'A',NULL,'../images/列车/JR西日本/JR西日本_500系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0954-0954A',954,954,'A',NULL,'../images/列车/JR西日本/JR西日本_500系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0974-0974A',974,974,'A',NULL,'../images/列车/JR西日本/JR西日本_500系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0875-0876A',875,876,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0880-0880A',880,880,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0956-0956A',956,956,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0958-0958A',958,958,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0966-0966A',966,966,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE),
  ('2611','SanyoShinkansen','png_band/SanyoShinkansen/0976-0976A',976,976,'A',NULL,'../images/列车/JR西日本/JR西日本_700系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
