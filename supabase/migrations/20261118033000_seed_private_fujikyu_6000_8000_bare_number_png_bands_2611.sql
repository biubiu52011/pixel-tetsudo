-- Private railway batch 10: Fujikyu original exact bare train numbers.
-- js-0002 6000 standard reference 1-52, js-0003 8000 Fujisan Express face A 701-705,793-794.
-- Both PNG images remain REVIEW; retain existing compatible-plan, service dates and illustration-only guards.
-- Not proof of trainset identity, actual livery, or that a front-end face A can be chosen without evidence.
DO $fujikyu_private_review_preflight$
BEGIN
 IF (SELECT count(*) FROM public.vehicle_image_assets WHERE image_path IN (
  'images/列车/富士急行/富士急行_6000系_標準色.png',
  'images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png')
 AND operator='FujisanrokuElectricRailway' AND asset_status='review'
 AND asset_scope='review' AND appearance_class='requires_review'
 AND file_format_status='native_png') <> 2 THEN
  RAISE EXCEPTION 'Fujikyu 6000/8000 PNG review registry drift';
 END IF;
 IF EXISTS (
  WITH proposed(line_key,min_number,max_number,suffix,png_reference) AS (VALUES
    ('Fujikyu',1,52,'','../images/列车/富士急行/富士急行_6000系_標準色.png'),
    ('Fujikyu',701,705,'','../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png'),
    ('Fujikyu',793,794,'','../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png')
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
    ON r.edition='2611' AND r.segment_key LIKE 'png_band/%'
    AND p.line_key=r.line_key AND p.suffix=r.suffix
    AND p.min_number<=r.max_number AND p.max_number>=r.min_number
    AND p.png_reference<>r.png_reference
 ) THEN RAISE EXCEPTION 'Fujikyu exact reference overlaps another PNG'; END IF;
END
$fujikyu_private_review_preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Fujikyu','png_band/Fujikyu/0001-0052',1,52,'',NULL,'../images/列车/富士急行/富士急行_6000系_標準色.png',NULL,FALSE,FALSE),
  ('2611','Fujikyu','png_band/Fujikyu/0701-0705',701,705,'',NULL,'../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',NULL,FALSE,FALSE),
  ('2611','Fujikyu','png_band/Fujikyu/0793-0794',793,794,'',NULL,'../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $fujikyu_private_review_verify$
DECLARE actual integer;
BEGIN
 SELECT count(*) INTO actual FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Fujikyu' AND segment_key LIKE 'png_band/Fujikyu/%'
 AND suffix='' AND png_reference IN (
  '../images/列车/富士急行/富士急行_6000系_標準色.png',
  '../images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF actual<>3 THEN RAISE EXCEPTION 'Fujikyu expected 3 exact no-gap bands, got %',actual; END IF;
END
$fujikyu_private_review_verify$;
