-- JR-East 2611 Senzan published numbers and dated fleet *references*.
-- References 265u1/u2/265d1/d2 + JR East E721 line page +
-- https://media.jreast.co.jp/articles/6686 (2026 SATONO dates).
BEGIN;
SELECT pg_advisory_xact_lock(2611265);
CREATE TABLE IF NOT EXISTS public.published_senzan_2611_fleet_scope (
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Senzan'),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_number text NOT NULL,
 source_type_urn text NOT NULL,
 published_type_urn text NOT NULL,
 fleet_role text NOT NULL CHECK(fleet_role IN('regular_e721','satono_dated')),
 candidate_models text[] NOT NULL,
 illustration_model text NOT NULL,
 source_url text NOT NULL,
 operating_dates text[] NOT NULL DEFAULT '{}',
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed)
);
ALTER TABLE public.published_senzan_2611_fleet_scope ENABLE ROW LEVEL SECURITY;
WITH official_direction(direction_urn,numbers) AS (VALUES
 ('odpt.RailDirection:Inbound','1820M,1822M,1824M,1828M,1830M,1832M,1836M,1838M,1840M,1842M,1844M,1846M,1848M,1850M,1852M,1854M,1856M,1858M,1860M,1862M,1864M,1866M,1868M,1870M,1872M,1874M,1876M,1878M,1880M,1882M,1888M,1890M,2826M,2834M,3820M,3830M,3834M,3838M,4822M,4844M,4848M,4850M,4852M,4854M,824M,826M,828M,832M,836M,840M,842M,846M'),
 ('odpt.RailDirection:Outbound','1829M,1831M,1835M,1837M,1839M,1841M,1843M,1845M,1847M,1849M,1851M,1853M,1855M,1857M,1859M,1861M,1863M,1865M,1867M,1869M,1871M,1873M,1875M,1877M,1879M,1881M,1883M,1885M,1887M,1889M,1891M,1893M,1895M,2833M,3827M,3831M,3835M,4821M,4843M,4847M,4849M,4851M,4853M,4855M,823M,825M,829M,833M,837M,839M,841M,845M')
), regular AS (
 SELECT direction_urn,trim(x) train_number
 FROM official_direction
 CROSS JOIN LATERAL unnest(string_to_array(numbers,',')) AS x
), source AS (
 SELECT m.*,right(m.train_number,1)='D' AS satono
 FROM public.manual_timetable_templates m
 WHERE m.line_key='Senzan'
 AND m.railway_urn='odpt.Railway:JR-East.Senzan'
 AND (
   (right(m.train_number,1)='M' AND EXISTS (
       SELECT 1 FROM regular r WHERE r.train_number=m.train_number AND r.direction_urn=m.direction_urn
    ) AND m.train_type_urn='odpt.TrainType:JR-East.'||
       CASE WHEN m.train_number IN ('3820M','3830M','3834M','3838M',
           '3827M','3831M','3835M') THEN 'Rapid' ELSE 'Local' END)
   OR (m.train_number IN('8821D','8822D') AND
       m.direction_urn='odpt.RailDirection:'||
         CASE WHEN m.train_number='8821D' THEN 'Outbound' ELSE 'Inbound' END
       AND m.train_type_urn='odpt.TrainType:JR-East.Local')
 )
)
INSERT INTO public.published_senzan_2611_fleet_scope(
 edition,line_key,source_template_id,calendar_urn,direction_urn,
 train_number,source_type_urn,published_type_urn,fleet_role,
 candidate_models,illustration_model,source_url,operating_dates)
SELECT '2611','Senzan',id,calendar_urn,direction_urn,
 train_number,train_type_urn,
 CASE WHEN satono THEN 'odpt.TrainType:JR-East.Rapid' ELSE train_type_urn END,
 CASE WHEN satono THEN 'satono_dated' ELSE 'regular_e721' END,
 CASE WHEN satono THEN ARRAY['HB-E300系（SATONO）']::text[]
      ELSE ARRAY['E721系']::text[] END,
 CASE WHEN satono THEN 'HB-E300系（SATONO）' ELSE 'E721系' END,
 CASE WHEN satono THEN 'https://media.jreast.co.jp/articles/6686'
  ELSE 'https://timetables.jreast.co.jp/2611/timetable-v/265'||
      CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
      CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html' END,
 CASE WHEN satono THEN ARRAY['2026-11-01','2026-11-02','2026-11-03','2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-13','2026-11-14','2026-11-15','2026-11-16','2026-11-21','2026-11-22','2026-11-23','2026-11-24','2026-11-27','2026-11-28','2026-11-29','2026-11-30']::text[]
      ELSE ARRAY[]::text[] END
FROM source
ON CONFLICT(source_template_id) DO UPDATE SET
 calendar_urn=EXCLUDED.calendar_urn,direction_urn=EXCLUDED.direction_urn,
 train_number=EXCLUDED.train_number,source_type_urn=EXCLUDED.source_type_urn,
 published_type_urn=EXCLUDED.published_type_urn,fleet_role=EXCLUDED.fleet_role,
 candidate_models=EXCLUDED.candidate_models,illustration_model=EXCLUDED.illustration_model,
 source_url=EXCLUDED.source_url,operating_dates=EXCLUDED.operating_dates;
UPDATE public.manual_timetable_templates m
SET vehicle_type_label=CASE WHEN s.fleet_role='satono_dated'
 THEN 'HB-E300系（SATONO）' ELSE 'E721系' END
FROM public.published_senzan_2611_fleet_scope s
WHERE m.id=s.source_template_id AND m.line_key='Senzan';
-- December 5/6/12/13 Omoide is NOT a November 2611 service.
UPDATE public.manual_timetable_templates SET vehicle_type_label=NULL
WHERE line_key='Senzan' AND train_number IN ('9821D','9822D');
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Senzan')<>214
 OR (SELECT count(*) FROM public.published_senzan_2611_fleet_scope)<>212
 OR (SELECT count(*) FROM public.published_senzan_2611_fleet_scope
     WHERE fleet_role='regular_e721')<>208
 OR (SELECT count(*) FROM public.published_senzan_2611_fleet_scope
     WHERE fleet_role='satono_dated')<>4
 OR (SELECT count(*) FROM public.published_senzan_2611_fleet_scope
     WHERE calendar_urn='odpt.Calendar:Weekday')<>106
 OR (SELECT count(*) FROM public.published_senzan_2611_fleet_scope
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>106
 OR EXISTS(SELECT 1 FROM public.published_senzan_2611_fleet_scope
     WHERE NOT reference_only OR actual_vehicle_confirmed)
 THEN RAISE EXCEPTION 'Senzan 2611 fleet source roster mismatch'; END IF;
END $check$;
COMMIT;
