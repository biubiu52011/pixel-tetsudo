-- Fujikyu 2611 ordinary-train number -> representative PNG range.
-- The GTFS timetable has a complete 1-52 local number set on both calendars.
-- This row authorizes the mapped standard 6000-series artwork for that
-- published number range; it does not claim the actual day's formation.

INSERT INTO public.published_train_png_number_ranges(
  edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed
)
VALUES
  ('2611','Fujikyu','fujikyu_local_6000',1,52,'',
   '富士急行6000系（標準色）',
   '../images/列车/富士急行/富士急行_6000系_標準色.png',
   'https://www.fujikyu-railway.jp/station/timetable.php',false,false)
ON CONFLICT DO NOTHING;
