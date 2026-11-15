-- Official Tobu Ogose branch station order (2026-11-16):
-- https://www.tobu.co.jp/railway/guide/line/ogose_line.html
-- Sakado, Ippommatsu, Nishi-Oya, Kawakaku, Bushu-Nagase,
-- Higashi-Moro, Bushu-Karasawa, Ogose.
-- Reorder only line_stations station_index, without altering station identities
-- or published timetable references.
BEGIN;
DO $fix$
DECLARE old_stops text[];
BEGIN
  SELECT array_agg(station_name::text ORDER BY station_index)
    INTO old_stops FROM public.line_stations WHERE line_id='Ogose';
  IF old_stops=ARRAY['Sakado','Ippommatsu','Nishi-Oya','Kawa_kaku',
    'Bushu-Karasawa','Bushu-Nagase','Higashi_Moro','Ogose']::text[] THEN
    UPDATE public.line_stations
    SET station_index=CASE station_name
      WHEN 'Bushu-Nagase' THEN 4
      WHEN 'Higashi_Moro' THEN 5
      WHEN 'Bushu-Karasawa' THEN 6
      ELSE station_index END
    WHERE line_id='Ogose'
      AND station_name IN ('Bushu-Nagase','Higashi_Moro','Bushu-Karasawa');
  ELSIF old_stops=ARRAY['Sakado','Ippommatsu','Nishi-Oya','Kawa_kaku',
    'Bushu-Nagase','Higashi_Moro','Bushu-Karasawa','Ogose']::text[] THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unexpected Ogose station list: %',old_stops;
  END IF;
END $fix$;
COMMIT;
