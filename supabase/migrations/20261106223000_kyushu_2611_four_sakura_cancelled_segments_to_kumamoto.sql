-- JR Kyushu 2026-11 official partial cancellations effective
-- 2026-10-23. 742A / 772A now begin at Kumamoto (Kagoshima
-- segment cancelled); 769A / 771A now end at Kumamoto.
-- Source templates imported a March full-length itinerary. Correct
-- their canonical stop boundary and destination to avoid plotting
-- trains on an officially cancelled segment. Retain existing
-- planned N700-family mapping; never infer carset or assign PNG.
BEGIN;
SELECT pg_advisory_xact_lock(2611,771);
DO $kyushu_2611_partial_cancellations$
DECLARE r record; id_ bigint; tt_ bigint; n int; original_length int; 
  old_route text; new_route text;
  terminal_urn text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (128973,'さくら742','742A','Inbound',2,4,'Kagoshima-Chuo@06:56|Sendai@07:08|Kumamoto@07:42|Kurume@08:04|Shin-Tosu@08:09|Hakata@08:23','Kumamoto@07:42|Kurume@08:04|Shin-Tosu@08:09|Hakata@08:21','https://www.jrkyushu-timetable.jp/sp/2611/0035/00357901.html?d=20261103&t=2828304'),
  (129025,'さくら769','769A','Outbound',0,5,'Hakata@21:01|Shin-Tosu@21:14|Kurume@21:19|Chikugo-Funagoya@21:26|Kumamoto@21:43|Shin-Yatsushiro@21:55|Shin-Minamata@22:09|Izumi@22:16|Sendai@22:28|Kagoshima-Chuo@22:39','Hakata@21:01|Shin-Tosu@21:14|Kurume@21:19|Chikugo-Funagoya@21:26|Kumamoto@21:42','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348701.html?d=20261101&t=2828300'),
  (129019,'さくら771','771A','Outbound',0,4,'Hakata@22:01|Shin-Tosu@22:14|Kurume@22:19|Kumamoto@22:40|Sendai@23:14|Kagoshima-Chuo@23:25','Hakata@22:01|Shin-Tosu@22:14|Kurume@22:19|Kumamoto@22:39','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348801.html?d=20261102&t=2828300'),
  (129034,'さくら772','772A','Inbound',5,4,'Kagoshima-Chuo@18:41|Sendai@18:53|Izumi@19:05|Shin-Minamata@19:12|Shin-Yatsushiro@19:26|Kumamoto@19:38|Kurume@19:59|Shin-Tosu@20:03|Hakata@20:18','Kumamoto@19:38|Kurume@19:59|Shin-Tosu@20:03|Hakata@20:16','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359401.html?d=20261104&t=0829100')
 ) AS v(source_id,service_name,official_number,direction,prefix_cut,retained_count,expected_legacy_route,expected_official_route,official_url)
 LOOP
  SELECT m.id,mem.timetable_id INTO STRICT id_,tt_
  FROM manual_timetable_templates m
  JOIN train_timetable_members mem ON mem.source_template_id=m.id
      AND mem.member_role='primary' AND mem.first_stop_sequence=0 AND mem.stop_offset=0 AND mem.merge_first_stop=false
  JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
     AND t.primary_train_number=m.train_number
  JOIN train_timetable_vehicle_mappings vm ON vm.timetable_id=mem.timetable_id
     AND vm.source_template_id=m.id AND vm.vehicle_type='N700系'
     AND vm.mapping_level='official_service_vehicle_plan' AND vm.actual_vehicle_confirmed=false
  JOIN evidence_sources es ON es.id=vm.source_id
     AND es.source_type='official' AND es.evidence_grade IN ('A','B')
  WHERE m.id=r.source_id AND m.line_key='KyushuShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND m.direction_urn='odpt.RailDirection:'||r.direction
    AND m.train_number=r.service_name
    AND m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'
    AND mem.last_stop_sequence=(SELECT max(s.stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id)
    AND (SELECT count(*) FROM train_timetable_members memb WHERE memb.timetable_id=mem.timetable_id)=1;
  original_length := (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=id_);
  old_route:=(SELECT string_agg(regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),'^.*[.]','')
       ||'@'||coalesce(s.departure_clock,s.arrival_clock),'|' ORDER BY s.stop_sequence)
       FROM manual_timetable_template_stops s WHERE s.template_id=id_);
  IF old_route<>r.expected_legacy_route OR
    (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_)<>original_length
    THEN RAISE EXCEPTION 'Partial cancellation legacy source/view mismatch for %',r.service_name; END IF;
  IF EXISTS(SELECT 1 FROM published_train_number_evidence e
     WHERE e.edition='2611' AND e.source_template_id=id_)
    THEN RAISE EXCEPTION 'Service already has Nov official number %',r.service_name; END IF;
  IF r.direction='Inbound' THEN
    IF r.prefix_cut NOT IN (2,5) OR r.retained_count<>original_length-r.prefix_cut
      OR (SELECT destination_urns FROM manual_timetable_templates WHERE id=id_)<>
         ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata']::text[]
      THEN RAISE EXCEPTION 'Inbound boundary mismatch %',r.service_name; END IF;
    DELETE FROM manual_timetable_template_stops s
      WHERE s.template_id=id_ AND s.stop_sequence < r.prefix_cut;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>r.prefix_cut THEN RAISE EXCEPTION 'Inbound canceled-prefix deletion mismatch %',r.service_name; END IF;
    UPDATE manual_timetable_template_stops s SET stop_sequence=s.stop_sequence+100
      WHERE s.template_id=id_ AND s.stop_sequence>=r.prefix_cut;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>r.retained_count THEN RAISE EXCEPTION 'Inbound temporary index shift mismatch %',r.service_name; END IF;
    UPDATE manual_timetable_template_stops s SET stop_sequence=s.stop_sequence-100-r.prefix_cut
      WHERE s.template_id=id_ AND s.stop_sequence>=100+r.prefix_cut;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>r.retained_count THEN RAISE EXCEPTION 'Inbound final index shift mismatch %',r.service_name; END IF;
    UPDATE manual_timetable_template_stops s SET arrival_clock=
        CASE WHEN r.official_number='742A' THEN '08:21' ELSE '20:16' END
      WHERE s.template_id=id_ AND s.stop_sequence=r.retained_count-1
      AND s.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata'
      AND s.arrival_clock=CASE WHEN r.official_number='742A' THEN '08:23' ELSE '20:18' END
      AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Inbound actual Hakata arrival correction mismatch %',r.service_name; END IF;
  ELSE
    IF r.prefix_cut<>0 OR r.retained_count NOT IN(4,5) OR
       (SELECT destination_urns FROM manual_timetable_templates WHERE id=id_)<>
        ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo']::text[]
      THEN RAISE EXCEPTION 'Outbound initial terminal mismatch %',r.service_name; END IF;
    DELETE FROM manual_timetable_template_stops s
     WHERE s.template_id=id_ AND s.stop_sequence>=r.retained_count;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>original_length-r.retained_count
      THEN RAISE EXCEPTION 'Outbound cancelled suffix mismatch %',r.service_name; END IF;
    UPDATE manual_timetable_template_stops s
       SET arrival_station_urn=s.departure_station_urn,
           arrival_clock=CASE WHEN r.official_number='769A' THEN '21:42' ELSE '22:39' END,
           departure_station_urn=NULL,departure_clock=NULL
     WHERE s.template_id=id_ AND s.stop_sequence=r.retained_count-1
       AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
       AND s.departure_clock=CASE WHEN r.official_number='769A' THEN '21:43' ELSE '22:40' END
       AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Outbound Kumamoto actual arrival mismatch %',r.service_name; END IF;
    UPDATE manual_timetable_templates m SET destination_urns=
       ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto']::text[]
    WHERE m.id=id_ AND m.destination_urns=
       ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo']::text[];
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION 'Outbound destination metadata mismatch %',r.service_name; END IF;
  END IF;
  UPDATE train_timetable_members mem SET last_stop_sequence=r.retained_count-1
    WHERE mem.source_template_id=id_ AND mem.timetable_id=tt_
       AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=original_length-1;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Existing source-only member stop boundary mismatch %',r.service_name; END IF;

  new_route:=(SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')
     ||'@'||coalesce(z.departure_clock,z.arrival_clock),'|' ORDER BY z.stop_sequence)
     FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_);
  IF new_route<>r.expected_official_route OR
    (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_)<>r.retained_count
    OR (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=id_)<>r.retained_count
    THEN RAISE EXCEPTION 'Updated official source/view itinerary mismatch %: %',r.service_name,new_route; END IF;
  INSERT INTO published_train_number_evidence
   (edition,line_key,calendar_urn,direction_urn,train_number,
    source_template_id,official_source_url,verification_scope)
  VALUES('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
      'odpt.RailDirection:'||r.direction,r.official_number,id_,r.official_url,'train_number_only')
  ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611'
    AND e.source_template_id=id_ AND e.train_number=r.official_number
    AND e.official_source_url=r.official_url AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND e.direction_urn='odpt.RailDirection:'||r.direction)<>1
    THEN RAISE EXCEPTION 'Official November number write mismatch %',r.service_name; END IF;
 END LOOP;
END $kyushu_2611_partial_cancellations$;
COMMIT;