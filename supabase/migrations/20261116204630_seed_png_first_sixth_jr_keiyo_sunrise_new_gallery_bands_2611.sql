-- Sixth PNG-first reference-only batch (edition 2611).
-- Prioritize previously uncovered gallery PNGs, not repeated coverage.
-- Keiyo 0680Y / 1883Y: existing ODPT Keiyo manual timetable rows
-- designate E233 5000 family. Sunrise 5031M / 5032M: existing
-- TokaidoMain manual source rows designate 285 family.
-- This does NOT validate exact dated train operation, operating consist,
-- actual car assignment or permit bypassing any JS/SQL source guard.
-- Omitted: special Ome variant already overlaps generic JR source rule;
-- Sotobo/Togane modified E233 lacks an approved vehicle_image_assets row.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Keiyo','png_band/Keiyo/0680-0680Y',680,680,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','Keiyo','png_band/Keiyo/1883-1883Y',1883,1883,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系_5000番台.png',NULL,FALSE,FALSE),
  ('2611','TokaidoMain','png_band/TokaidoMain/5031-5032M',5031,5032,'M',NULL,'../images/列车/JR西日本/JR西日本_285系_サンライズエクスプレス.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
