-- JR-West official two-number through working at Nishiwakishi.
-- https://timetable.jr-odekake.net/train-timetable/64861?date=20261128
-- https://timetable.jr-odekake.net/train-timetable/65371?date=20261023
BEGIN;
SELECT pg_advisory_xact_lock(26110912);
DO $split$
DECLARE src record; oldno text; nextno text; b int; aclock text; dclock text;
newsource bigint; newcanonical bigint; continuation text;
BEGIN
 -- This migration was applied to production before the repository migration
 -- history was synchronized. A second application must verify and no-op.
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='KakogawaLine'
       AND train_number IN ('2329S','1338S')
       AND source_path='official-202611:jrwest-kakogawa-renumbered-nishiwaki')=4
    AND (SELECT count(*) FROM public.manual_timetable_templates
       WHERE line_key='KakogawaLine')=90
    AND NOT EXISTS(SELECT 1 FROM public.manual_timetable_templates t
       JOIN public.train_timetable_members m ON m.source_template_id=t.id
       WHERE t.line_key='KakogawaLine'
         AND m.last_stop_sequence<>(SELECT max(stop_sequence)
          FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id))
 THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN (4479,4480,4524,4525)
    AND line_key='KakogawaLine' AND train_number IN ('1335S','1335SH','2326S','2326SH'))<>4
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates
    WHERE line_key='KakogawaLine' AND train_number IN ('2329S','1338S'))
 THEN RAISE EXCEPTION 'Kakogawa source baseline drift'; END IF;
 FOR src IN SELECT * FROM public.manual_timetable_templates
     WHERE line_key='KakogawaLine' AND id IN (4479,4480,4524,4525) ORDER BY id
 LOOP
   oldno := CASE WHEN src.train_number LIKE '1335%' THEN '1335S' ELSE '2326S' END;
   nextno := CASE WHEN oldno='1335S' THEN '2329S' ELSE '1338S' END;
   b := CASE WHEN oldno='1335S' THEN 12 ELSE 8 END;
   aclock := CASE WHEN oldno='1335S' THEN '13:30' ELSE '12:37' END;
   dclock := CASE WHEN oldno='1335S' THEN '13:41' ELSE '12:45' END;
   continuation := 'JR-West:KakogawaLine:202611:'||src.calendar_urn||':'||oldno||'+'||nextno;
   IF (SELECT count(*) FROM public.manual_timetable_template_stops s WHERE s.template_id=src.id)<>21
   OR NOT EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s
      WHERE s.template_id=src.id AND s.stop_sequence=b
        AND s.arrival_station_urn='odpt.Station:JR-West.KakogawaLine.Nishiwaki-Shi'
        AND s.departure_station_urn='odpt.Station:JR-West.KakogawaLine.Nishiwaki-Shi'
        AND s.arrival_clock=aclock AND s.departure_clock=dclock)
   OR NOT EXISTS(SELECT 1 FROM public.train_timetable_members m
      JOIN public.train_timetables c ON c.id=m.timetable_id
      WHERE m.source_template_id=src.id AND m.last_stop_sequence=20
        AND c.canonical_key='source:'||src.id AND c.group_evidence='source_only')
   THEN RAISE EXCEPTION 'Kakogawa % stop/canonical mismatch',src.id; END IF;
   INSERT INTO public.manual_timetable_templates
     (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
      destination_urns,source_path,source_occurrence,physical_service_key)
   VALUES(src.line_key,src.calendar_urn,nextno,src.railway_urn,src.direction_urn,
      src.train_type_urn,src.destination_urns,
      'official-202611:jrwest-kakogawa-renumbered-nishiwaki',0,continuation)
   RETURNING id INTO newsource;
   INSERT INTO public.manual_timetable_template_stops
     (template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
   SELECT newsource,s.stop_sequence-b,
      CASE WHEN s.stop_sequence=b THEN NULL ELSE s.arrival_station_urn END,
      s.departure_station_urn,
      CASE WHEN s.stop_sequence=b THEN NULL ELSE s.arrival_clock END,
      s.departure_clock
   FROM public.manual_timetable_template_stops s
   WHERE s.template_id=src.id AND s.stop_sequence>=b ORDER BY s.stop_sequence;
   DELETE FROM public.manual_timetable_template_stops
     WHERE template_id=src.id AND stop_sequence>b;
   UPDATE public.manual_timetable_template_stops
      SET departure_station_urn=NULL,departure_clock=NULL
      WHERE template_id=src.id AND stop_sequence=b;
   UPDATE public.manual_timetable_templates
     SET train_number=oldno,physical_service_key=continuation,
       destination_urns=ARRAY['odpt.Station:JR-West.KakogawaLine.Nishiwaki-Shi']::text[]
     WHERE id=src.id;
   UPDATE public.train_timetable_members SET last_stop_sequence=b
     WHERE source_template_id=src.id;
   UPDATE public.train_timetables SET primary_train_number=oldno
     WHERE lead_source_template_id=src.id;
   INSERT INTO public.train_timetables
     (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
      group_evidence,timetable_validity)
   VALUES('source:'||newsource,src.calendar_urn,nextno,newsource,
      'source_only','undated_not_current_verified') RETURNING id INTO newcanonical;
   INSERT INTO public.train_timetable_members
     (source_template_id,timetable_id,segment_order,member_role,
      first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
   VALUES(newsource,newcanonical,0,'primary',0,20-b,0,false);
 END LOOP;
 IF (SELECT count(*) FROM public.manual_timetable_templates
   WHERE line_key='KakogawaLine')<>90
 OR (SELECT count(*) FROM public.manual_timetable_templates
   WHERE line_key='KakogawaLine' AND train_number IN ('2329S','1338S'))<>4
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates t
   JOIN public.train_timetable_members m ON m.source_template_id=t.id
   WHERE t.line_key='KakogawaLine' AND m.last_stop_sequence<>(SELECT max(stop_sequence)
       FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id))
 THEN RAISE EXCEPTION 'Kakogawa split postcondition failed'; END IF;
END $split$;
COMMIT;
