-- JR East / JR West 2611 published 9 Sakura A numbers, two existing
-- Kyushu+Sanyo Weekday source segments each = 18 source-only templates.
-- Official planned N700-series family already proven for all 18; do
-- NOT infer physical roster/owner/subseries, or assign a foreign PNG.
-- Sakura742/772 source Kyushu segment starts at Kumamoto as published.
BEGIN;
DO $sakura2611$
DECLARE
  r record;
  seg record;
  matched_id bigint;
  evidence_count integer:=0;
BEGIN
  FOR r IN SELECT * FROM (VALUES
  ('さくら408','408A',703,9429,'Kagoshima-Chuo','20:07','21:50','21:52','Hiroshima','23:01','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
  ('さくら742','742A',680,9406,'Kumamoto','07:42','08:21','08:23','Shin-Osaka','10:59','https://timetable.jr-odekake.net/train-timetable/317261?date=20261123'),
  ('さくら746','746A',684,9410,'Kagoshima-Chuo','08:36','10:21','10:23','Shin-Osaka','12:59','https://timetable.jr-odekake.net/train-timetable/317281?date=20261110'),
  ('さくら754','754A',689,9415,'Kagoshima-Chuo','11:47','13:21','13:23','Shin-Osaka','15:59','https://timetable.jr-odekake.net/train-timetable/317321?date=20261106'),
  ('さくら762','762A',693,9419,'Kagoshima-Chuo','14:39','16:21','16:23','Shin-Osaka','18:59','https://timetable.jr-odekake.net/train-timetable/317361?date=20261123'),
  ('さくら764','764A',694,9420,'Kagoshima-Chuo','15:09','16:43','16:45','Shin-Osaka','19:21','https://timetable.jr-odekake.net/train-timetable/317371?date=20261114'),
  ('さくら768','768A',696,9422,'Kagoshima-Chuo','16:09','17:43','17:45','Shin-Osaka','20:21','https://timetable.jr-odekake.net/train-timetable/317391?date=20261107'),
  ('さくら770','770A',698,9424,'Kagoshima-Chuo','17:01','18:43','18:45','Shin-Osaka','21:26','https://timetable.jr-odekake.net/train-timetable/317401?date=20261105'),
  ('さくら772','772A',701,9427,'Kumamoto','19:38','20:16','20:18','Shin-Osaka','22:53','https://timetable.jr-odekake.net/train-timetable/317411?date=20261107')
  ) AS v(service_name,full_number,kyushu_id,sanyo_id,
    kyushu_first_station,kyushu_first_departure,kyushu_last_arrival,
    sanyo_first_departure,sanyo_last_station,sanyo_last_arrival,official_url)
  LOOP
    FOR seg IN
      SELECT r.kyushu_id AS source_id,'KyushuShinkansen' AS line_key,
        'JR-Kyushu' AS owner,r.kyushu_first_station AS origin,
        r.kyushu_first_departure AS dep,
        'Hakata' AS destination,r.kyushu_last_arrival AS arr
      UNION ALL
      SELECT r.sanyo_id,'SanyoShinkansen','JR-West',
        'Hakata',r.sanyo_first_departure,
        r.sanyo_last_station,r.sanyo_last_arrival
    LOOP
      SELECT m.id INTO STRICT matched_id
      FROM public.manual_timetable_templates m
      JOIN public.train_timetable_members tm
        ON tm.source_template_id=m.id AND tm.member_role='primary'
      JOIN public.train_timetables tt
        ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
      JOIN public.train_timetable_vehicle_mappings vm
        ON vm.timetable_id=tm.timetable_id
         AND vm.source_template_id=m.id
         AND vm.mapping_level='official_service_vehicle_plan'
         AND vm.vehicle_type='N700系'
         AND vm.actual_vehicle_confirmed=false
      WHERE m.id=seg.source_id
        AND m.line_key=seg.line_key
        AND m.railway_urn='odpt.Railway:'||seg.owner||'.'||seg.line_key
        AND m.calendar_urn='odpt.Calendar:Weekday'
        AND m.direction_urn='odpt.RailDirection:Inbound'
        AND m.train_number=r.service_name
        AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
          WHERE s.template_id=m.id AND s.departure_station_urn=seg.origin
            AND s.departure_clock=seg.dep)
        AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops s
          WHERE s.template_id=m.id AND s.arrival_station_urn=seg.destination
            AND s.arrival_clock=seg.arr);

      INSERT INTO public.published_train_number_evidence
        (edition,line_key,calendar_urn,direction_urn,train_number,
        source_template_id,official_source_url,verification_scope)
      SELECT '2611',seg.line_key,'odpt.Calendar:Weekday',
        'odpt.RailDirection:Inbound',r.full_number,matched_id,
        r.official_url,'train_number_only'
      WHERE NOT EXISTS(SELECT 1 FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.source_template_id=matched_id);

      IF (SELECT count(*) FROM public.published_train_number_evidence e
        WHERE e.edition='2611' AND e.source_template_id=matched_id
          AND e.line_key=seg.line_key
          AND e.calendar_urn='odpt.Calendar:Weekday'
          AND e.direction_urn='odpt.RailDirection:Inbound'
          AND e.train_number=r.full_number
          AND e.official_source_url=r.official_url
          AND e.verification_scope='train_number_only')<>1
      THEN RAISE EXCEPTION 'Sakura numbered proof mismatch: % %',r.service_name,seg.line_key; END IF;
      evidence_count:=evidence_count+1;
    END LOOP;
  END LOOP;
  IF evidence_count<>18 THEN RAISE EXCEPTION 'Sakura 2611 expected 18 records, got %',evidence_count; END IF;
END $sakura2611$;
COMMIT;