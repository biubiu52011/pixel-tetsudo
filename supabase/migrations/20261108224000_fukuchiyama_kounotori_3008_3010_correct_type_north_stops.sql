-- JR-West November 2026 Fukushima/Fukuchiyama Kounotori 8/10 corrective
-- source sample, Fukuchiyama--Osaka corridor ONLY (not Shin-Osaka leg).
-- Public 3008M (こうのとり8号): official https://timetable.jr-odekake.net/train-timetable/91081?date=20261103
-- Public 3010M (こうのとり10号): official https://timetable.jr-odekake.net/train-timetable/91111?date=20261103
-- The 2026-10 historical importer classified both as LOCAL and omitted all
-- north-of-Sanda stops. Reuse the 4 EXISTING canonical source/template IDs;
-- do not invent new schedules, stock assignments, physical positions or PNGs.
-- The north part is a small verified daily timetable sample, not a complete
-- train diagram. From Osaka to Shin-Osaka is OUTSIDE this line representation.
BEGIN;
SELECT pg_advisory_xact_lock(26110834);

DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
     WHERE id IN(68244,68245,68251,68252)
       AND line_key='Fukuchiyama'
       AND train_type_urn='odpt.TrainType:JR-West.Local'
       AND direction_urn='odpt.RailDirection:Inbound'
       AND source_path='data/timetables/Fukuchiyama-manual.js'
       AND operating_dates IS NULL)<>4
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
     WHERE source_template_id IN(68244,68245,68251,68252)
       AND train_type_urn='odpt.TrainType:JR-West.Local'
       AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[]
       AND source_stop_count=4
       AND source_stop_keys=ARRAY['Sanda-Hyogo','Takarazuka','Amagasaki','Osaka']::text[])<>4
 OR (SELECT count(*) FROM public.manual_timetable_template_stops
     WHERE template_id IN(68244,68245,68251,68252))<>16
 OR (SELECT count(*) FROM public.train_timetable_members
     WHERE source_template_id IN(68244,68245,68251,68252) AND last_stop_sequence=3)<>4
 THEN RAISE EXCEPTION 'Fukuchiyama 3008/3010 source drift; audit before correction';
 END IF;
END $guard$;

-- Permit the scoped JR-West LimitedExpress family without turning
-- historical local/rapid trains into 287/289 family candidates.
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 DROP CONSTRAINT published_jrwest_fukuchiyama_2611_source_f_train_type_urn_check;
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 DROP CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check;

-- Shift only the four already imported southern stops to leave room for the
-- actual north-of-Sanda calls; no timestamps in those four rows change.
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence+10
WHERE template_id IN(68244,68245,68251,68252) AND stop_sequence BETWEEN 0 AND 3;
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence-CASE WHEN template_id IN (68244,68245)
   THEN 5 ELSE 7 END
WHERE template_id IN(68244,68245,68251,68252) AND stop_sequence BETWEEN 10 AND 13;

WITH north_stop(no,seq,station,arr,dep) AS (
 VALUES
 ('3008M',0,'Fukuchiyama',NULL,'08:40'),
 ('3008M',1,'Kuroi-Tamba','08:55','08:55'),
 ('3008M',2,'Kaibara-Hyogo','09:02','09:03'),
 ('3008M',3,'Tanigawa','09:09','09:09'),
 ('3008M',4,'Shinoyamaguchi','09:27','09:27'),
 ('3010M',0,'Fukuchiyama',NULL,'09:50'),
 ('3010M',1,'Kaibara-Hyogo','10:09','10:10'),
 ('3010M',2,'Shinoyamaguchi','10:30','10:31')
)
INSERT INTO public.manual_timetable_template_stops(
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT m.id, n.seq,
 CASE WHEN n.arr IS NULL THEN NULL ELSE
  'odpt.Station:JR-West.Fukuchiyama.'||n.station END,
 CASE WHEN n.dep IS NULL THEN NULL ELSE
  'odpt.Station:JR-West.Fukuchiyama.'||n.station END,
 n.arr,n.dep
FROM public.manual_timetable_templates m
JOIN north_stop n ON regexp_replace(m.train_number,'H$','')=n.no
WHERE m.id IN(68244,68245,68251,68252);

UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
 destination_urns=ARRAY['odpt.Station:JR-West.TokaidoKansai.ShinOsaka']::text[],
 operating_dates=ARRAY(SELECT day::date FROM generate_series(
   '2026-11-01'::date,'2026-11-30'::date,'1 day'::interval) AS day)
WHERE id IN(68244,68245,68251,68252);

UPDATE public.train_timetable_members
SET last_stop_sequence=CASE WHEN source_template_id IN(68244,68245) THEN 8 ELSE 6 END
WHERE source_template_id IN(68244,68245,68251,68252) AND last_stop_sequence=3;

WITH recalculated AS (
 SELECT m.id,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) as keys,
  count(*)::integer as n,
  count(*) FILTER(WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::integer as timed
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.id IN(68244,68245,68251,68252) GROUP BY m.id
)
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet p
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
 source_stop_keys=r.keys,source_stop_count=r.n,source_timed_stop_count=r.timed,
 candidate_models=ARRAY['287系','289系']::text[],
 fleet_reference_url='https://www.jr-odekake.net/railroad/train/kounotori/'
FROM recalculated r WHERE p.source_template_id=r.id;

-- Restore strong constraints, with an explicit four-source exception only.
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 ADD CONSTRAINT published_jrwest_fukuchiyama_2611_source_f_train_type_urn_check
 CHECK (train_type_urn IN('odpt.TrainType:JR-West.Local',
       'odpt.TrainType:JR-West.Rapid','odpt.TrainType:JR-West.SectionRapid',
       'odpt.TrainType:JR-West.LimitedExpress'));
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 ADD CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check
 CHECK (
   (source_template_id IN(68244,68245,68251,68252)
    AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
    AND candidate_models=ARRAY['287系','289系']::text[])
  OR
   (source_template_id NOT IN(68244,68245,68251,68252)
    AND train_type_urn<>'odpt.TrainType:JR-West.LimitedExpress'
    AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[])
 );

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68244,68245,68251,68252)
     AND candidate_models=ARRAY['287系','289系']::text[]
     AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress')<>4
 OR (SELECT count(*) FROM public.train_timetable_stops WHERE source_template_id IN(68244,68245))<>18
 OR (SELECT count(*) FROM public.train_timetable_stops WHERE source_template_id IN(68251,68252))<>14
 OR (SELECT count(*) FROM public.train_timetable_members
     WHERE source_template_id IN(68244,68245) AND last_stop_sequence=8)<>2
 OR (SELECT count(*) FROM public.train_timetable_members
     WHERE source_template_id IN(68251,68252) AND last_stop_sequence=6)<>2
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
     WHERE authorizes_png OR actual_vehicle_confirmed OR number_date_verified)>0
 THEN RAISE EXCEPTION 'Fukuchiyama 3008/3010 Kounotori reconciliation failed';
 END IF;
END $verify$;
COMMIT;
