-- JA 2026-11 official stop-plan pilot: three verifiable weekday trains only.
-- Existing manual timetable / canonical tables; no new schema, no vehicle claims.
-- Exact source URL per train; partial line coverage, not a full timetable edition.
DO $saikyo$
DECLARE
  item jsonb;
  st jsonb;
  v_dates date[];
  v_id bigint;
BEGIN
  SELECT array_agg(d::date ORDER BY d) INTO v_dates
  FROM generate_series(date '2026-11-01', date '2026-11-30', interval '1 day') g(d)
  WHERE extract(isodow from d) BETWEEN 1 AND 5
    AND d::date NOT IN (date '2026-11-03',date '2026-11-23');

  FOR item IN SELECT value FROM jsonb_array_elements('[{"id":2611090068301,"line_key":"SaikyoKawagoe","calendar_urn":"odpt.Calendar:Weekday","train_number":"683S","railway_urn":"odpt.Railway:JR-East.SaikyoKawagoe","direction_urn":"odpt.RailDirection:Outbound","train_type_urn":"odpt.TrainType:JR-East.CommuterRapid","destination_urns":["odpt.Station:JR-East.SaikyoKawagoe.Kawagoe"],"source_path":"official-sampled:jreast:2611:SaikyoKawagoe:683S","source_revision_date":"2026-11-01","source_url":"https://timetables.jreast.co.jp/2611/train/060/060161.html","stops":[{"sequence":0,"station":"Osaki","arrival":null,"departure":"06:51"},{"sequence":1,"station":"Ebisu","arrival":null,"departure":"06:56"},{"sequence":2,"station":"Shibuya","arrival":null,"departure":"06:58"},{"sequence":3,"station":"Shinjuku","arrival":null,"departure":"07:04"},{"sequence":4,"station":"Ikebukuro","arrival":null,"departure":"07:09"},{"sequence":5,"station":"Itabashi","arrival":null,"departure":"07:12"},{"sequence":6,"station":"Jujo","arrival":null,"departure":"07:14"},{"sequence":7,"station":"Akabane","arrival":null,"departure":"07:18"},{"sequence":8,"station":"Musashi-Urawa","arrival":null,"departure":"07:27"},{"sequence":9,"station":"Omiya","arrival":null,"departure":"07:34"},{"sequence":10,"station":"Nisshin","arrival":null,"departure":"07:39"},{"sequence":11,"station":"Nishi-Omiya","arrival":null,"departure":"07:43"},{"sequence":12,"station":"Sashiogi","arrival":null,"departure":"07:51"},{"sequence":13,"station":"Minami-Furuya","arrival":null,"departure":"07:58"},{"sequence":14,"station":"Kawagoe","arrival":"08:03","departure":null}]},{"id":2611090075901,"line_key":"SaikyoKawagoe","calendar_urn":"odpt.Calendar:Weekday","train_number":"759K","railway_urn":"odpt.Railway:JR-East.SaikyoKawagoe","direction_urn":"odpt.RailDirection:Outbound","train_type_urn":"odpt.TrainType:JR-East.Local","destination_urns":["odpt.Station:JR-East.SaikyoKawagoe.Omiya"],"source_path":"official-sampled:jreast:2611:SaikyoKawagoe:759K","source_revision_date":"2026-11-01","source_url":"https://timetables.jreast.co.jp/2611/train/080/081391.html","stops":[{"sequence":0,"station":"Osaki","arrival":null,"departure":"07:07"},{"sequence":1,"station":"Ebisu","arrival":null,"departure":"07:11"},{"sequence":2,"station":"Shibuya","arrival":null,"departure":"07:13"},{"sequence":3,"station":"Shinjuku","arrival":null,"departure":"07:18"},{"sequence":4,"station":"Ikebukuro","arrival":null,"departure":"07:24"},{"sequence":5,"station":"Itabashi","arrival":null,"departure":"07:27"},{"sequence":6,"station":"Jujo","arrival":null,"departure":"07:29"},{"sequence":7,"station":"Akabane","arrival":null,"departure":"07:33"},{"sequence":8,"station":"Kita-Akabane","arrival":null,"departure":"07:35"},{"sequence":9,"station":"Ukimafunado","arrival":null,"departure":"07:37"},{"sequence":10,"station":"Toda-Koen","arrival":null,"departure":"07:40"},{"sequence":11,"station":"Toda","arrival":null,"departure":"07:42"},{"sequence":12,"station":"Kita-Toda","arrival":null,"departure":"07:44"},{"sequence":13,"station":"Musashi-Urawa","arrival":null,"departure":"07:47"},{"sequence":14,"station":"Naka-Urawa","arrival":null,"departure":"07:49"},{"sequence":15,"station":"Minami-Yono","arrival":null,"departure":"07:52"},{"sequence":16,"station":"Yono-Hommachi","arrival":null,"departure":"07:54"},{"sequence":17,"station":"Kita-Yono","arrival":null,"departure":"07:56"},{"sequence":18,"station":"Omiya","arrival":"07:59","departure":null}]},{"id":2611090051001,"line_key":"SaikyoKawagoe","calendar_urn":"odpt.Calendar:Weekday","train_number":"510S","railway_urn":"odpt.Railway:JR-East.SaikyoKawagoe","direction_urn":"odpt.RailDirection:Inbound","train_type_urn":"odpt.TrainType:JR-East.CommuterRapid","destination_urns":["odpt.Station:TWR.Rinkai.ShinKiba"],"source_path":"official-sampled:jreast:2611:SaikyoKawagoe:510S","source_revision_date":"2026-11-01","source_url":"https://timetables.jreast.co.jp/2611/train/060/060281.html","stops":[{"sequence":0,"station":"Kawagoe","arrival":null,"departure":"05:49"},{"sequence":1,"station":"Minami-Furuya","arrival":null,"departure":"05:57"},{"sequence":2,"station":"Sashiogi","arrival":null,"departure":"06:01"},{"sequence":3,"station":"Nishi-Omiya","arrival":null,"departure":"06:04"},{"sequence":4,"station":"Nisshin","arrival":null,"departure":"06:07"},{"sequence":5,"station":"Omiya","arrival":null,"departure":"06:14"},{"sequence":6,"station":"Musashi-Urawa","arrival":null,"departure":"06:20"},{"sequence":7,"station":"Akabane","arrival":null,"departure":"06:29"},{"sequence":8,"station":"Jujo","arrival":null,"departure":"06:31"},{"sequence":9,"station":"Itabashi","arrival":null,"departure":"06:34"},{"sequence":10,"station":"Ikebukuro","arrival":null,"departure":"06:37"},{"sequence":11,"station":"Shinjuku","arrival":null,"departure":"06:43"},{"sequence":12,"station":"Shibuya","arrival":null,"departure":"06:47"},{"sequence":13,"station":"Ebisu","arrival":null,"departure":"06:50"},{"sequence":14,"station":"Osaki","arrival":null,"departure":"06:55"}]}]'::jsonb) LOOP
    v_id:=(item->>'id')::bigint;
    IF EXISTS (
      SELECT 1 FROM public.manual_timetable_templates
      WHERE id=v_id AND (source_path<>(item->>'source_path') OR train_number<>(item->>'train_number'))
    ) THEN RAISE EXCEPTION 'JA_SAMPLE_SOURCE_ID_CONFLICT %',v_id; END IF;
    INSERT INTO public.manual_timetable_templates
    (id,line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,
     source_path,source_revision_date,operating_dates,vehicle_type_label)
    OVERRIDING SYSTEM VALUE
    VALUES(v_id,item->>'line_key',item->>'calendar_urn',item->>'train_number',
      item->>'railway_urn',item->>'direction_urn',item->>'train_type_urn',
      ARRAY(SELECT jsonb_array_elements_text(item->'destination_urns')),
      item->>'source_path',(item->>'source_revision_date')::date,v_dates,NULL)
    ON CONFLICT (id) DO NOTHING;
    FOR st IN SELECT value FROM jsonb_array_elements(item->'stops') LOOP
      INSERT INTO public.manual_timetable_template_stops
      (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      VALUES(v_id,(st->>'sequence')::int,
        CASE WHEN st->>'arrival' IS NOT NULL AND st->>'arrival'<>'null' THEN
          'odpt.Station:JR-East.SaikyoKawagoe.'||(st->>'station') ELSE NULL END,
        CASE WHEN st->>'departure' IS NOT NULL AND st->>'departure'<>'null' THEN
          'odpt.Station:JR-East.SaikyoKawagoe.'||(st->>'station') ELSE NULL END,
        NULLIF(st->>'arrival','null'),NULLIF(st->>'departure','null'))
      ON CONFLICT (template_id,stop_sequence) DO NOTHING;
    END LOOP;
    IF (SELECT COUNT(*) FROM public.manual_timetable_template_stops WHERE template_id=v_id)
       <>jsonb_array_length(item->'stops')
    THEN RAISE EXCEPTION 'JA_SAMPLE_STOP_COUNT_CONFLICT %',v_id; END IF;
  END LOOP;
  PERFORM public.sync_canonical_train_timetables('SaikyoKawagoe','odpt.Calendar:Weekday');
  IF (SELECT count(*) FROM public.train_timetable_source_resolution
      WHERE source_template_id IN (2611090068301,2611090075901,2611090051001))<>3
    THEN RAISE EXCEPTION 'JA_SAMPLE_CANONICAL_RESOLUTION_INCOMPLETE'; END IF;
END
$saikyo$;
