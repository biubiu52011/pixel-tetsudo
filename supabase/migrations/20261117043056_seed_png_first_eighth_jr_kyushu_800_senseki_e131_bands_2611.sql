-- JR eighth PNG-first reference-only bands (2611).
-- JR-Kyushu 800-series: existing holiday-verified exact roster compacted into 16 bands;
-- JR-East Senseki E131-800: pre-existing 2026-11 JS S-number scoped rule.
-- Preserve original line/date/calendar/train-type/number/identity guards. Not a real carset assertion.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0300-0301A',300,301,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0304-0306A',304,306,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0308-0308A',308,308,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0310-0310A',310,310,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0312-0320A',312,320,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0322-0332A',322,332,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0334-0337A',334,337,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0339-0339A',339,339,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0341-0341A',341,341,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0343-0343A',343,343,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0345-0345A',345,345,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0403-0403A',403,403,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0405-0407A',405,407,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0409-0409A',409,409,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/0411-0411A',411,411,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','KyushuShinkansen','png_band/KyushuShinkansen/7420-7420A',7420,7420,'A',NULL,'../images/列车/JR九州/JR九州_800系.png',NULL,FALSE,FALSE),
  ('2611','Senseki','png_band/Senseki/0400-2599S',400,2599,'S',NULL,'../images/列车/JR東日本/JR東日本_E131系_800番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
