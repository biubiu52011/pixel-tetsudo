-- Seibu Ikebukuro Line: complete Hanno -> Agano topology and correct Hanno
-- station point. Canonical station/line metadata remains in data/core JSON.
-- Safe to re-run; this does NOT validate/alter any historical timetable.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.line_stations WHERE line_id='Ikebukuro';
  IF n NOT IN (26,31) THEN
    RAISE EXCEPTION 'Unexpected Ikebukuro station count: %; review before backfill', n;
  END IF;
END $$;

UPDATE public.stations
   SET latitude=35.85101, longitude=139.31906
 WHERE id='Hanno'
   AND latitude BETWEEN 35.84 AND 35.86
   AND longitude BETWEEN 139.42 AND 139.43;

INSERT INTO public.stations (id,name,latitude,longitude)
VALUES
 ('Koma-Seibu','Koma (Seibu)',35.8819,139.3043),
 ('Musashi-Yokote','Musashi-Yokote',35.8855,139.2808),
 ('Higashi-Agano','Higashi-Agano',35.8925,139.2604)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.line_stations (line_id,station_name,station_index)
SELECT 'Ikebukuro',v.station_name,v.station_index
FROM (VALUES
 ('Higashi-Hanno',26),
 ('Koma-Seibu',27),
 ('Musashi-Yokote',28),
 ('Higashi-Agano',29),
 ('Agano',30)
) AS v(station_name,station_index)
WHERE NOT EXISTS (
 SELECT 1 FROM public.line_stations existing
 WHERE existing.line_id='Ikebukuro'
   AND (existing.station_name=v.station_name OR existing.station_index=v.station_index)
);
-- Deliberately retain undated_not_current_verified for all old schedules.
