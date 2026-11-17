-- JR ninth PNG-first reference-only number bands (2611).
-- Reuse existing JR-East number ranges: Nambu Branch E127-0, Joban Rapid E231-0,
-- Joban Local E233-2000, Mito E531. This migration adds reference bands only.
-- Existing source railway, dates, calendar, train type, index, exact roster
-- and vehicle/formation guards remain authoritative; no blanket service approval.
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','NambuBranch','png_band/NambuBranch/0400-2299H',400,2299,'H',NULL,'../images/列车/JR東日本/JR東日本_E127系_0番台_南武支線.png',NULL,FALSE,FALSE),
  ('2611','Joban','png_band/Joban/0430-2495H',430,2495,'H',NULL,'../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png',NULL,FALSE,FALSE),
  ('2611','JobanLocal','png_band/JobanLocal/0400-2599K',400,2599,'K',NULL,'../images/列车/JR東日本/JR東日本_E233系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Mito','png_band/Mito/0721-2785M',721,2785,'M',NULL,'../images/列车/JR東日本/JR東日本_E531系_水戸線.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;
