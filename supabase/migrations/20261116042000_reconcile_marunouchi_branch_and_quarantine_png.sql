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

-- Entries quarantined by data/timetables/vehicle-garage-png-map.js must not
-- remain 'available' through alternate database-only rendering paths.
-- Retain original path/vehicle metadata and the review explanation.
UPDATE public.vehicle_image_assets
   SET asset_status='review',
       review_note=concat_ws(' | ', nullif(review_note,''),
         '2026-11-16 GitHub VehicleGaragePngMap quarantine: duplicate bytes / conflicting identity; do not authorize as train PNG without independent artwork review')
 WHERE asset_status='available' AND image_path IN (
  'images/列车/JR東日本/JR東日本_12系客車_SLばんえつ物語_展望車.png',
  'images/列车/JR東日本/JR東日本_E127系_0番台_新潟色.png',
  'images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-510形.png',
  'images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-520形.png',
  'images/列车/相模鉄道/相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png',
  'images/列车/相模鉄道/相模鉄道_21000系.png'
 );
-- Record 405 points to an absent file; a different subseries artwork is not
-- an automatic replacement.
UPDATE public.vehicle_image_assets
   SET asset_status='review',
       review_note=concat_ws(' | ',nullif(review_note,''),
         '2026-11-16 GitHub main: referenced image path is absent; verify correct 8000 series artwork before re-enabling')
 WHERE asset_status='available'
   AND image_path='images/列车/伊豆急行/伊豆急行_8000系.png';
COMMIT;
