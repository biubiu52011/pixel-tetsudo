-- 2611 JR-East Ryomo: exact official train-number + calendar/direction
-- scope, NOT a physical trainset assignment or a certification of legacy clocks.
-- Public timetable: 237u1/u2/d1/d2; 211 fleet: jreast.co.jp/train/local/211.html
BEGIN;
SELECT pg_advisory_xact_lock(2611237);
CREATE TABLE IF NOT EXISTS public.published_ryomo_2611_fleet_scope (
 edition text NOT NULL CHECK (edition='2611'),
 line_key text NOT NULL CHECK (line_key='Ryomo'),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_number text NOT NULL,
 train_type_urn text NOT NULL,
 fleet_role text NOT NULL CHECK(fleet_role IN ('211_reference','mixed_fleet_reference')),
 candidate_models text[] NOT NULL,
 illustration_model text NOT NULL,
 source_url text NOT NULL,
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 formation_id text DEFAULT NULL CHECK(formation_id IS NULL)
);
ALTER TABLE public.published_ryomo_2611_fleet_scope ENABLE ROW LEVEL SECURITY;
WITH groups(calendar,dir,kind,number_csv) AS (
 VALUES
 ('Weekday','Outbound','211','420M,422M,424M,426M,428M,430M,432M,434M,436M,438M,440M,442M,444M,446M,448M,450M,452M,454M,456M,458M,460M,462M,464M,466M,468M,470M,472M,474M,476M,478M,480M,482M,484M,620M,622M,624M,626M,628M,630M,632M,634M,636M,638M,640M,642M,652M,654M,656M,658M,660M'),
 ('Weekday','Inbound','211','421M,423M,425M,427M,429M,431M,433M,435M,437M,439M,441M,443M,445M,447M,449M,451M,453M,455M,457M,459M,461M,463M,465M,467M,469M,471M,473M,475M,477M,479M,481M,483M,621M,625M,627M,629M,633M,635M,637M,639M,641M,643M,645M,647M,649M,651M,653M,655M,657M,659M,661M'),
 ('SaturdayHoliday','Outbound','211','420M,422M,424M,426M,428M,430M,432M,434M,436M,438M,440M,442M,444M,446M,448M,450M,452M,454M,456M,458M,460M,462M,464M,466M,468M,470M,472M,474M,476M,478M,480M,482M,484M,620M,622M,624M,626M,628M,630M,632M,634M,636M,638M,640M,642M,652M,654M,656M,658M,660M'),
 ('SaturdayHoliday','Inbound','211','421M,423M,425M,427M,429M,431M,433M,435M,437M,439M,441M,443M,445M,447M,449M,451M,453M,455M,457M,459M,461M,463M,465M,467M,469M,471M,473M,475M,477M,479M,481M,483M,621M,625M,627M,629M,633M,635M,637M,639M,641M,643M,645M,647M,649M,651M,653M,655M,657M,659M,661M'),
 ('Weekday','Outbound','mixed','1837E,1843E,1927E,1937E,2825Y,2835Y,832M,852M'),
 ('Weekday','Inbound','mixed','1621M,1940E,2856Y,2860Y'),
 ('SaturdayHoliday','Outbound','mixed','1837E,1841E,1843E,1847E,1925E,1937E,2825Y,2831Y,852M'),
 ('SaturdayHoliday','Inbound','mixed','1621M,1928E,1944E,2858Y')
), numbered AS (
 SELECT g.calendar,g.dir,g.kind,trim(n) AS train_number
 FROM groups g CROSS JOIN LATERAL unnest(string_to_array(g.number_csv,',')) AS n
), scoped AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,m.train_number,
        m.train_type_urn,n.kind,
        'https://timetables.jreast.co.jp/2611/timetable-v/237'||
          CASE WHEN n.dir='Outbound' THEN 'u' ELSE 'd' END||
          CASE WHEN n.calendar='Weekday' THEN '1' ELSE '2' END||'.html' AS url
 FROM public.manual_timetable_templates m
 JOIN numbered n ON m.line_key='Ryomo' AND m.train_number=n.train_number
  AND m.calendar_urn='odpt.Calendar:'||n.calendar
  AND m.direction_urn='odpt.RailDirection:'||n.dir
 WHERE m.railway_urn='odpt.Railway:JR-East.Ryomo'
   AND m.train_type_urn='odpt.TrainType:JR-East.'||
      CASE WHEN right(m.train_number,1)='Y' THEN 'Rapid' ELSE 'Local' END
)
INSERT INTO public.published_ryomo_2611_fleet_scope (
 edition,line_key,source_template_id,calendar_urn,direction_urn,train_number,
 train_type_urn,fleet_role,candidate_models,illustration_model,source_url)
SELECT '2611','Ryomo',id,calendar_urn,direction_urn,train_number,train_type_urn,
 CASE WHEN kind='211' THEN '211_reference' ELSE 'mixed_fleet_reference' END,
 CASE WHEN kind='211' THEN ARRAY['211系（高崎地区）']::text[]
      ELSE ARRAY['E231系1000番台','E233系3000番台']::text[] END,
 CASE WHEN kind='211' THEN '211系（高崎地区）' ELSE 'E233系3000番台' END,
 url FROM scoped
ON CONFLICT(source_template_id) DO UPDATE SET
  calendar_urn=EXCLUDED.calendar_urn,direction_urn=EXCLUDED.direction_urn,
  train_number=EXCLUDED.train_number,train_type_urn=EXCLUDED.train_type_urn,
  fleet_role=EXCLUDED.fleet_role,candidate_models=EXCLUDED.candidate_models,
  illustration_model=EXCLUDED.illustration_model,source_url=EXCLUDED.source_url;
-- Only correct wrong, user-facing imported candidate LABELS; source rows,
-- stop times, source paths and train identities remain intact.
UPDATE public.manual_timetable_templates m
SET vehicle_type_label=CASE WHEN s.fleet_role='211_reference'
  THEN '211系（高崎地区）' ELSE 'E231系1000番台 / E233系3000番台' END
FROM public.published_ryomo_2611_fleet_scope s
WHERE m.id=s.source_template_id AND m.line_key='Ryomo'
 AND m.vehicle_type_label IS DISTINCT FROM
  CASE WHEN s.fleet_role='211_reference' THEN '211系（高崎地区）'
       ELSE 'E231系1000番台 / E233系3000番台' END;
-- Keep historical 9482M/9484M/9486M source rows for audit, but prevent
-- unverified old vehicle tags from masquerading as a November fleet.
UPDATE public.manual_timetable_templates
 SET vehicle_type_label=NULL
 WHERE line_key='Ryomo'
  AND train_number IN ('9482M','9484M','9486M');
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Ryomo')<>234
 OR (SELECT count(*) FROM public.published_ryomo_2611_fleet_scope)<>231
 OR (SELECT count(*) FROM public.published_ryomo_2611_fleet_scope
      WHERE fleet_role='211_reference')<>206
 OR (SELECT count(*) FROM public.published_ryomo_2611_fleet_scope
      WHERE fleet_role='mixed_fleet_reference')<>25
 OR (SELECT count(*) FROM public.published_ryomo_2611_fleet_scope
      WHERE calendar_urn='odpt.Calendar:Weekday')<>114
 OR (SELECT count(*) FROM public.published_ryomo_2611_fleet_scope
      WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>117
 OR EXISTS(SELECT 1 FROM public.published_ryomo_2611_fleet_scope
   WHERE NOT reference_only OR actual_vehicle_confirmed OR formation_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Ryomo 2611 fleet scope data mismatch'; END IF;
END $check$;
COMMIT;
