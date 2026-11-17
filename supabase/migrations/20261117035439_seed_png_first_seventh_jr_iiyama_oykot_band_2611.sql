-- JR seventh PNG-first reference-only number band (2611).
-- Iiyama 8140D / 8141D: dedicated おいこっと service; 2611 index
-- verifies actual operating date, calendar, direction, train type and number.
-- Scope is a service-specific gallery illustration, NOT physical carset ID.
-- Reject 8124D/8133D 越乃Shu*Kura and all ordinary 0120-1123D.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Iiyama','png_band/Iiyama/8140-8141D',8140,8141,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系_おいこっと.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
