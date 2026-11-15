-- 2026-11-16: evidence-bound repair of Marunouchi branch and PNG quarantine.
-- Does NOT promote gallery art to a vehicle assignment or enable any missing route API.
-- Nakano-Shimbashi coordinate: MapFan Tokyo Metro station point:
-- https://mapfan.com/spots/S3C44%2CJ%2CSXREW (WGS84 approximate station point).
-- Canonical line order: Nakano-Sakaue > Nakano-Shimbashi > Nakano-fujimicho > Honancho.
BEGIN;
LOCK TABLE public.line_stations IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO public.stations (id, name, latitude, longitude)
SELECT 'Nakano-Shimbashi','Nakano-Shimbashi',35.6924868,139.6741765
WHERE NOT EXISTS (SELECT 1 FROM public.stations WHERE id='Nakano-Shimbashi');

DO $audit$
DECLARE current_stops text[];
BEGIN
  SELECT array_agg(station_name::text ORDER BY station_index)
    INTO current_stops FROM public.line_stations WHERE line_id='MarunouchiBranch';
  IF current_stops=ARRAY['Nakano-Sakaue','Nishi-Shinjuku-Gochome','Honancho']::text[] THEN
    DELETE FROM public.line_stations
      WHERE line_id='MarunouchiBranch' AND station_name='Nishi-Shinjuku-Gochome';
    UPDATE public.line_stations SET station_index=3
      WHERE line_id='MarunouchiBranch' AND station_name='Honancho';
    INSERT INTO public.line_stations (id,line_id,station_name,station_index)
    SELECT (SELECT coalesce(max(id),0) FROM public.line_stations)
             + row_number() OVER (ORDER BY v.idx),
           'MarunouchiBranch', v.station_name, v.idx
    FROM (VALUES ('Nakano-Shimbashi',1),('Nakano-fujimicho',2)) AS v(station_name,idx);
  ELSIF current_stops=ARRAY['Nakano-Sakaue','Nakano-Shimbashi','Nakano-fujimicho','Honancho']::text[] THEN
    NULL; -- already reconciled
  ELSE
    RAISE EXCEPTION 'Unexpected MarunouchiBranch SQL station order: %',current_stops;
  END IF;
END $audit$;

-- This repository has an immutable reviewed-identity baseline trigger on
-- vehicle_image_assets. Do NOT change protected asset_status, image_path,
-- vehicle_type, operator, or baseline rows to bypass it.
-- Instead quarantine automatic model artwork resolution via appearance_class:
-- public.train_timetable_vehicle_artwork only accepts standard_or_fixed_livery.
-- The underlying reviewed file identity stays intact for manual re-inspection.
UPDATE public.vehicle_image_assets
   SET appearance_class='requires_review',
       review_note=CASE
         WHEN coalesce(review_note,'') LIKE '%2026-11-16: GitHub PNG quarantine%'
           THEN review_note
         ELSE concat_ws(' | ',nullif(review_note,''),
           '2026-11-16: GitHub PNG quarantine, byte-identical art with conflicting model labels; reject automatic train assignment until artwork reviewed')
       END
 WHERE image_path IN (
  'images/列车/JR東日本/JR東日本_12系客車_SLばんえつ物語_展望車.png',
  'images/列车/JR東日本/JR東日本_E127系_0番台_新潟色.png',
  'images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-510形.png',
  'images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-520形.png',
  'images/列车/相模鉄道/相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png',
  'images/列车/相模鉄道/相模鉄道_21000系.png'
 );
UPDATE public.vehicle_image_assets
   SET appearance_class='requires_review',
       review_note=CASE
         WHEN coalesce(review_note,'') LIKE '%2026-11-16: missing GitHub artwork%'
           THEN review_note
         ELSE concat_ws(' | ',nullif(review_note,''),
           '2026-11-16: missing GitHub artwork; the specific 8000-series PNG path does not exist in main; do not silently replace with a subseries')
       END
 WHERE image_path='images/列车/伊豆急行/伊豆急行_8000系.png';
COMMIT;
