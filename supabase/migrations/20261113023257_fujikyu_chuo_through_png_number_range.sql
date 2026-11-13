-- Fujikyu 2611 through-service reference range.
-- 1455M/1456M are the only M-numbered Fujikyu rows that join to the same
-- calendar, direction and number in the ChuoMain SQL timetable. This is a
-- representative E233 PNG plan, not a dated formation or realtime vehicle.

INSERT INTO public.published_train_png_number_ranges(
  edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed
)
VALUES
  ('2611','Fujikyu','fujikyu_chuo_through_e233',1455,1456,'M',
   'E233系0番台',
   '../images/列车/JR東日本/JR東日本_E233系_0番台.png',
   'sql:manual_timetable_templates:Fujikyu-ChuoMain:1455M-1456M',
   true,false)
ON CONFLICT DO NOTHING;
