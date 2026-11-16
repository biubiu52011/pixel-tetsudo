-- PNG-first reference-only train-number intervals, edition 2611.
-- Derived from existing JR JS rules and existing scoped-JR PNG audit rows.
-- NO source URL, model, carset claim, or operating-calendar permission.
-- Do not use these rows to bypass existing production runtime guards.
ALTER TABLE public.published_train_png_number_ranges
 DROP CONSTRAINT published_train_png_number_ranges_requires_exact_roster_check;
ALTER TABLE public.published_train_png_number_ranges
 ADD CONSTRAINT published_train_png_number_ranges_requires_exact_roster_check
 CHECK (
  (
   segment_key NOT LIKE 'png_band/%'
   AND requires_exact_roster = TRUE
   AND vehicle_model IS NOT NULL AND source_url IS NOT NULL
  ) OR (
   segment_key LIKE 'png_band/%'
   AND requires_exact_roster = FALSE
   AND vehicle_model IS NULL AND source_url IS NULL
   AND actual_vehicle_confirmed = FALSE
  )
 );
COMMENT ON CONSTRAINT published_train_png_number_ranges_requires_exact_roster_check
 ON public.published_train_png_number_ranges IS
 'Legacy source/roster rows remain strict. png_band/% rows store only PNG-number reference ranges: not actual trains or date proof.';
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','BanetsuEast','png_band/BanetsuEast/0720-1756D',720,1756,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/0120-1999M',120,1999,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/8132-8637M',8132,8637,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Echigo','png_band/Echigo/9630-9630M',9630,9630,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0122-2839D',122,2839,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/3524-3526D',3524,3526,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/0424-1463D',424,1463,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/8471-8471D',8471,8471,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Hachinohe','png_band/Hachinohe/9445-9446D',9445,9446,'D',NULL,'../images/列车/JR東日本/JR東日本_キハE130系500番台.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0120-1123D',120,1123,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Karasuyama','png_band/Karasuyama/0321-0347M',321,347,'M',NULL,'../images/列车/JR東日本/JR東日本_EV-E301系.png',NULL,FALSE,FALSE),
  ('2611','Nambu','png_band/Nambu/0400-4999F',400,4999,'F',NULL,'../images/列车/JR東日本/JR東日本_E233系_8000番台.png',NULL,FALSE,FALSE),
  ('2611','NaritaAbikoBranch','png_band/NaritaAbikoBranch/0820-0899M',820,899,'M',NULL,'../images/列车/JR東日本/JR東日本_E231系_0番台.png',NULL,FALSE,FALSE),
  ('2611','RikutsuWest','png_band/RikutsuWest/0150-0165D',150,165,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutsuWest','png_band/RikutsuWest/3131-3132D',3131,3132,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0420-0484M',420,484,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0620-0622M',620,622,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0624-0630M',624,630,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0632-0643M',632,643,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0645-0645M',645,645,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0647-0647M',647,647,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0649-0649M',649,649,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0651-0661M',651,661,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_湘南色.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0832-0832M',832,832,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/0852-0852M',852,852,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1621-1621M',1621,1621,'M',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1837-1837E',1837,1837,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1841-1841E',1841,1841,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1843-1843E',1843,1843,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1847-1847E',1847,1847,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1925-1925E',1925,1925,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1927-1928E',1927,1928,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1937-1937E',1937,1937,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1940-1940E',1940,1940,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/1944-1944E',1944,1944,'E',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2825-2825Y',2825,2825,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2831-2831Y',2831,2831,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2835-2835Y',2835,2835,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2856-2856Y',2856,2856,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2858-2858Y',2858,2858,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Ryomo','png_band/Ryomo/2860-2860Y',2860,2860,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系3000番台.png',NULL,FALSE,FALSE),
  ('2611','Sagami','png_band/Sagami/0400-2599F',400,2599,'F',NULL,'../images/列车/JR東日本/JR東日本_E131系_500番台.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5500-5599D',5500,5599,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0823-0826M',823,826,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0828-0829M',828,829,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0832-0833M',832,833,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0836-0837M',836,837,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0839-0842M',839,842,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/0845-0846M',845,846,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1820-1820M',1820,1820,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1822-1822M',1822,1822,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1824-1824M',1824,1824,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1828-1832M',1828,1832,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1835-1883M',1835,1883,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1885-1885M',1885,1885,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1887-1891M',1887,1891,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1893-1893M',1893,1893,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/1895-1895M',1895,1895,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/2826-2826M',2826,2826,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/2833-2834M',2833,2834,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/3820-3820M',3820,3820,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/3827-3827M',3827,3827,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/3830-3831M',3830,3831,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/3834-3835M',3834,3835,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/3838-3838M',3838,3838,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/4821-4822M',4821,4822,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/4843-4844M',4843,4844,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/4847-4855M',4847,4855,'M',NULL,'../images/列车/JR東日本/JR東日本_E721系_仙台地区.png',NULL,FALSE,FALSE),
  ('2611','Senzan','png_band/Senzan/8821-8822D',8821,8822,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_SATONO_1号車.png',NULL,FALSE,FALSE),
  ('2611','Tazawako','png_band/Tazawako/0822-0828M',822,828,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Tazawako','png_band/Tazawako/0830-0835M',830,835,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Tazawako','png_band/Tazawako/0838-0851M',838,851,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Tazawako','png_band/Tazawako/0853-0857M',853,857,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Tazawako','png_band/Tazawako/0861-0861M',861,861,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Togane','png_band/Togane/5680-5983Y',5680,5983,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Tsurumi','png_band/Tsurumi/0400-2599B',400,2599,'B',NULL,'../images/列车/JR東日本/JR東日本_E131系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TsurumiOkawa','png_band/TsurumiOkawa/0400-2599B',400,2599,'B',NULL,'../images/列车/JR東日本/JR東日本_E131系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TsurumiUmiShibaura','png_band/TsurumiUmiShibaura/0400-2599B',400,2599,'B',NULL,'../images/列车/JR東日本/JR東日本_E131系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/0620-0699M',620,699,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_600番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/2823-2823M',2823,2823,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_600番台.png',NULL,FALSE,FALSE),
  ('2611','Yamada','png_band/Yamada/0631-9642D',631,9642,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0420-0420M',420,420,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0422-0422M',422,422,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0429-0429M',429,429,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0431-0431M',431,431,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0436-0436M',436,436,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0451-0451M',451,451,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/0455-0455M',455,455,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1420-1420M',1420,1420,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1424-1425M',1424,1425,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1432-1432M',1432,1432,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1437-1437M',1437,1437,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1443-1450M',1443,1450,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1454-1455M',1454,1455,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/1457-1457M',1457,1457,'M',NULL,'../images/列车/JR東日本/JR東日本_701系_5500番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/5425-5426M',5425,5426,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Yamagata','png_band/Yamagata/5429-5430M',5429,5430,'M',NULL,'../images/列车/JR東日本/JR東日本_E723系_5000番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix)
 DO NOTHING;
