-- JR fourth PNG -> train-number reference-band batch, November 2026.
-- All intervals derive from the min/max clusters of the EXISTING 2611 source scripts:
-- Hakushin, Hachiko non-electrified, Yamanote and Yokohama.
-- Interior gaps can contain unpublished numbers; source-specific official roster,
-- date, calendar, direction, train type and route checks MUST remain authoritative.
-- Ominato (no approved KiHa100 PNG) and Tadami (territory-dependent artwork)
-- are intentionally excluded. No PNG priority or physical carset claim.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Hakushin','png_band/Hakushin/0001-0014M',1,14,'M',NULL,'../images/列车/JR東日本/JR東日本_E653系（いなほ）.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0623-0681M',623,681,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/0920-0950M',920,950,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1620-1682M',1620,1682,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/1924-1951M',1924,1951,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/3921-3921M',3921,3921,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
  ('2611','Hakushin','png_band/Hakushin/8853-8854D',8853,8854,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_海里.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0220-0249D',220,249,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2223-2294D',2223,2294,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Yamanote','png_band/Yamanote/0301-2433G',301,2433,'G',NULL,'../images/列车/JR東日本/JR東日本_E235系_0番台.png',NULL,FALSE,FALSE),
  ('2611','Yokohama','png_band/Yokohama/0408-2446K',408,2446,'K',NULL,'../images/列车/JR東日本/JR東日本_E233系_6000番台.png',NULL,FALSE,FALSE),
  ('2611','Yokohama','png_band/Yokohama/3840-4747K',3840,4747,'K',NULL,'../images/列车/JR東日本/JR東日本_E233系_6000番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
