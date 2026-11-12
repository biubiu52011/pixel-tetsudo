-- Fujikyu 2611 SQL special-service number -> representative PNG ranges.
--
-- The imported manual timetable keeps the source label, e.g.
-- "701 フジサン特急 1号 Fujisan Express 1".  These rows authorize only
-- the clean published service number and a representative 8000-series image.
-- They do NOT identify the actual day's formation, vehicle number, or face A/B.
-- Ordinary services such as train 45 are intentionally absent.
-- Official service-number/model source:
-- https://www.fujikyu-railway.jp/train/fujisan_express.php

BEGIN;

INSERT INTO public.published_train_png_number_ranges(
  edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed
)
VALUES
  ('2611','Fujikyu','fujisan_express_8000',701,705,'',
   '富士急行8000系（フジサン特急・顔A）',
   '../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',
   'https://www.fujikyu-railway.jp/train/fujisan_express.php',true,false),
  ('2611','Fujikyu','fujisan_express_8000',793,794,'',
   '富士急行8000系（フジサン特急・顔A）',
   '../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',
   'https://www.fujikyu-railway.jp/train/fujisan_express.php',true,false)
ON CONFLICT DO NOTHING;

COMMIT;
