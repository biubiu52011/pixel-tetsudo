-- 2611 November 2026 JR-West official detail: eight scheduled N700S Nozomi
-- through trains. One service has two source-only SQL segments:
-- JR-West Sanyo and JR-Central Tokaido.
-- Data owner diagnosis: Sanyo segment final Shin-Osaka arrival_clock
-- erroneously copied the same train's *next departure* (2 minutes later).
-- Repair the eight source-table cells; derived views update automatically.
-- Then attach verified
-- published full number and planned N700S model to BOTH source members.
-- There is no native N700S generic asset. No PNG claim; no actual carset.
BEGIN;
SELECT pg_advisory_xact_lock(2611,700);
DO $n700s_through_2611$
DECLARE
  r record;
  seg record;
  v_tt bigint;
  v_evidence_id bigint;
  v_expected_line text;
  v_expected_owner text;
  v_origin text;
  v_first text;
  v_dest text;
  v_last text;
  v_verified int:=0;
  v_repaired int:=0;
  v_written int:=0;
BEGIN
  FOR r IN SELECT * FROM (VALUES
  ('のぞみ10','10A',9376,9202,'Hakata','08:00','10:30','10:28','12:57','https://timetable.jr-odekake.net/train-timetable/1701?date=20261101'),
  ('のぞみ34','34A',9347,9212,'Hakata','13:36','16:06','16:04','18:33','https://timetable.jr-odekake.net/train-timetable/69801?date=20261121'),
  ('のぞみ40','40A',9352,9214,'Hakata','15:00','17:30','17:28','19:57','https://timetable.jr-odekake.net/train-timetable/69831?date=20261101'),
  ('のぞみ46','46A',9356,9217,'Hakata','16:00','18:30','18:28','20:57','https://timetable.jr-odekake.net/train-timetable/69721?date=20261120'),
  ('のぞみ50','50A',9357,9219,'Hakata','16:36','19:06','19:04','21:33','https://timetable.jr-odekake.net/train-timetable/69661?date=20261111'),
  ('のぞみ54','54A',9360,9221,'Hakata','17:15','19:45','19:43','22:15','https://timetable.jr-odekake.net/train-timetable/76211?date=20261105'),
  ('のぞみ62','62A',9365,9223,'Hakata','18:36','21:06','21:04','23:32','https://timetable.jr-odekake.net/train-timetable/86331?date=20261111'),
  ('のぞみ74','74A',9374,9224,'Hiroshima','06:00','07:30','07:28','09:57','https://timetable.jr-odekake.net/train-timetable/230701?date=20261121')
  ) AS x(service_name,full_number,sanyo_id,tokaido_id,sanyo_origin,sanyo_departure,
       incorrect_sanyo_arrival,official_sanyo_arrival,tokyo_arrival,official_url)
  LOOP
    -- First verify full-scope source records BEFORE changing any time cell.
    IF NOT EXISTS(
      SELECT 1 FROM manual_timetable_templates m
      WHERE m.id=r.sanyo_id AND m.line_key='SanyoShinkansen'
        AND m.railway_urn='odpt.Railway:JR-West.SanyoShinkansen'
        AND m.train_number=r.service_name
        AND m.calendar_urn='odpt.Calendar:Weekday'
        AND m.direction_urn='odpt.RailDirection:Inbound'
        AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
          AND s.departure_station_urn='odpt.Station:JR-West.SanyoShinkansen.'||r.sanyo_origin
          AND s.departure_clock=r.sanyo_departure)
        AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
          AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
          AND s.arrival_clock=r.incorrect_sanyo_arrival AND s.departure_clock IS NULL)
    ) THEN RAISE EXCEPTION 'Sanyo source preflight mismatch %',r.service_name; END IF;
    IF NOT EXISTS(
      SELECT 1 FROM manual_timetable_templates m
      WHERE m.id=r.tokaido_id AND m.line_key='TokaidoShinkansen'
        AND m.railway_urn='odpt.Railway:JR-Central.TokaidoShinkansen'
        AND m.train_number=r.service_name
        AND m.calendar_urn='odpt.Calendar:Weekday'
        AND m.direction_urn='odpt.RailDirection:Inbound'
        AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
          AND s.departure_station_urn='odpt.Station:JR-Central.TokaidoShinkansen.Shin-Osaka'
          AND s.departure_clock=r.incorrect_sanyo_arrival AND s.arrival_clock IS NULL)
        AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
          AND s.arrival_station_urn='odpt.Station:JR-Central.TokaidoShinkansen.Tokyo'
          AND s.arrival_clock=r.tokyo_arrival)
    ) THEN RAISE EXCEPTION 'Tokaido source preflight mismatch %',r.service_name; END IF;
    IF EXISTS(SELECT 1 FROM published_train_number_evidence e
       WHERE e.edition='2611' AND e.source_template_id IN (r.sanyo_id,r.tokaido_id))
    THEN RAISE EXCEPTION 'Already numbered, prevent overwrite %',r.service_name; END IF;
    IF EXISTS(SELECT 1 FROM train_timetable_vehicle_mappings v
       WHERE v.source_template_id IN (r.sanyo_id,r.tokaido_id))
    THEN RAISE EXCEPTION 'Existing vehicle plan, prevent overwrite %',r.service_name; END IF;
    IF (SELECT count(*) FROM manual_timetable_template_stops s
       WHERE s.template_id=r.sanyo_id
       AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
       AND s.arrival_clock=r.incorrect_sanyo_arrival AND s.departure_clock IS NULL)<>1
    OR (SELECT count(*) FROM train_timetable_stops s
       WHERE s.source_template_id=r.sanyo_id
       AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
       AND s.arrival_clock=r.incorrect_sanyo_arrival AND s.departure_clock IS NULL)<>1
    OR (SELECT count(*) FROM published_timetable_plan_stops s
       WHERE s.template_id=r.sanyo_id
       AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
       AND s.arrival_clock=r.incorrect_sanyo_arrival AND s.departure_clock IS NULL)<>1
    THEN RAISE EXCEPTION 'Three owner stop layers not aligned %',r.service_name; END IF;

    -- Only manual_timetable_template_stops is writable; the other two are views.
    UPDATE manual_timetable_template_stops SET arrival_clock=r.official_sanyo_arrival
      WHERE template_id=r.sanyo_id AND
      arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
      AND arrival_clock=r.incorrect_sanyo_arrival AND departure_clock IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'manual repair missing %',r.service_name; END IF;
    IF (SELECT count(*) FROM train_timetable_stops s
      WHERE s.source_template_id=r.sanyo_id
      AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
      AND s.arrival_clock=r.official_sanyo_arrival)<>1
      OR (SELECT count(*) FROM published_timetable_plan_stops s
      WHERE s.template_id=r.sanyo_id
      AND s.arrival_station_urn='odpt.Station:JR-West.SanyoShinkansen.Shin-Osaka'
      AND s.arrival_clock=r.official_sanyo_arrival)<>1
    THEN RAISE EXCEPTION 'Derived view propagation mismatch %',r.service_name; END IF;
    v_repaired:=v_repaired+1;

    SELECT id INTO v_evidence_id FROM evidence_sources
    WHERE source_key='jr-west-2611-shinkansen-nozomi-'||lower(r.full_number)||'-n700s-planned';
    IF v_evidence_id IS NULL THEN
      INSERT INTO evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
      VALUES ((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
       'jr-west-2611-shinkansen-nozomi-'||lower(r.full_number)||'-n700s-planned',
       r.official_url,'official','A',
       'JR West November 2026 published through-train full number '||r.full_number||
       '; timetable labels scheduled N700S-series equipment; not a physical trainset guarantee')
      RETURNING id INTO v_evidence_id;
    END IF;
    IF (SELECT count(*) FROM evidence_sources e WHERE e.id=v_evidence_id
       AND e.source_url=r.official_url AND e.source_type='official'
       AND e.evidence_grade='A')<>1
    THEN RAISE EXCEPTION 'Official source conflict %',r.full_number; END IF;
    FOR seg IN SELECT r.sanyo_id source_id,'SanyoShinkansen' line_key
      UNION ALL SELECT r.tokaido_id,'TokaidoShinkansen'
    LOOP
      SELECT mem.timetable_id INTO STRICT v_tt FROM train_timetable_members mem
      JOIN train_timetables tt ON tt.id=mem.timetable_id
        AND tt.group_evidence='source_only'
        AND tt.calendar_urn='odpt.Calendar:Weekday'
      WHERE mem.source_template_id=seg.source_id AND mem.member_role='primary';

      INSERT INTO published_train_number_evidence
        (edition,line_key,calendar_urn,direction_urn,train_number,
         source_template_id,official_source_url,verification_scope)
      VALUES('2611',seg.line_key,'odpt.Calendar:Weekday',
        'odpt.RailDirection:Inbound',r.full_number,seg.source_id,
         r.official_url,'train_number_only')
      ON CONFLICT DO NOTHING;
      IF (SELECT count(*) FROM published_train_number_evidence e
         WHERE e.edition='2611' AND e.line_key=seg.line_key
          AND e.calendar_urn='odpt.Calendar:Weekday'
          AND e.direction_urn='odpt.RailDirection:Inbound'
          AND e.train_number=r.full_number AND e.source_template_id=seg.source_id
          AND e.official_source_url=r.official_url
          AND e.verification_scope='train_number_only')<>1
      THEN RAISE EXCEPTION 'Number write mismatch % %',r.full_number,seg.line_key; END IF;

      INSERT INTO train_timetable_vehicle_mappings
        (timetable_id,source_template_id,vehicle_type,mapping_level,
          source_id,source_path,actual_vehicle_confirmed)
      VALUES (v_tt,seg.source_id,'N700S系','official_service_vehicle_plan',
        v_evidence_id,'official-2611:'||r.official_url,false)
      ON CONFLICT (timetable_id) DO NOTHING;
      IF (SELECT count(*) FROM train_timetable_vehicle_mappings v
        WHERE v.timetable_id=v_tt AND v.source_template_id=seg.source_id
          AND v.vehicle_type='N700S系' AND v.mapping_level='official_service_vehicle_plan'
          AND v.source_id=v_evidence_id AND v.actual_vehicle_confirmed=false)<>1
      THEN RAISE EXCEPTION 'Plan write mismatch % %',r.full_number,seg.line_key; END IF;
      v_written:=v_written+1;
    END LOOP;
    v_verified:=v_verified+1;
  END LOOP;
  IF v_verified<>8 OR v_repaired<>8 OR v_written<>16
  THEN RAISE EXCEPTION 'Expected 8 services/8 corrections/16 segments, got %/%/%',v_verified,v_repaired,v_written; END IF;
END $n700s_through_2611$;
COMMIT;