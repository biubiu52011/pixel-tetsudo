-- Seibu Akitsu (Tokyo) and JR West Kure Akitsu (Hiroshima) are distinct.
-- Backfill canonical route metadata ONLY. Preserve all line-scoped historical
-- odpt.Station:JR-West.Kure.Akitsu template URNs and train numbers.
-- Idempotent and guarded; no train-run or service-date changes.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.line_stations
    WHERE line_id='Kure' AND station_index=8
      AND station_name IN ('Akitsu','Akitsu-Kure')
  ) THEN
    RAISE EXCEPTION 'Unexpected Kure station index 8; review route before migration';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_stations
    WHERE line_id='Ikebukuro' AND station_index=15 AND station_name='Akitsu'
  ) THEN
    RAISE EXCEPTION 'Seibu Akitsu identity changed; do not modify blind';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.stations
    WHERE id='Akitsu-Kure'
      AND (abs(latitude-34.3181105)>0.01 OR abs(longitude-132.8185988)>0.01)
  ) THEN
    RAISE EXCEPTION 'Akitsu-Kure existing coordinates conflict';
  END IF;
END
$migration$;

INSERT INTO public.stations(id,name,latitude,longitude)
VALUES('Akitsu-Kure','Akitsu (JR West Kure Line)',34.3181105,132.8185988)
ON CONFLICT (id) DO NOTHING;

UPDATE public.line_stations
SET station_name='Akitsu-Kure'
WHERE line_id='Kure' AND station_index=8 AND station_name='Akitsu';
