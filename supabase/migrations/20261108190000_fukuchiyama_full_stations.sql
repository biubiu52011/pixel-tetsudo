-- The public JR-West JR Takarazuka service is Osaka–Shinoyamaguchi;
-- the Fukuchiyama main line continues north to Fukuchiyama.
-- Existing alias ids Kashiwara (KansaiMain) / Kuroi (Shinetsu)
-- MUST NOT be repurposed as the Hyogo stations.
-- The new station locations come from MapFan/MLIT station geodata;
-- shared Tanigawa and Fukuchiyama positions already existed in SQL.
BEGIN;
SELECT pg_advisory_xact_lock(26110820);
INSERT INTO public.stations(id,name,latitude,longitude)
VALUES
 ('Tamba-Oyama','Tamba-Oyama',35.0719445,135.1689997),
 ('Shimotaki','Shimotaki',35.08787,135.09417),
 ('Kaibara-Hyogo','Kaibara-Hyogo',35.1272352,135.0770116),
 ('Iso-Tamba','Iso-Tamba',35.152833,135.0637129),
 ('Kuroi-Tamba','Kuroi-Tamba',35.1685539,135.0970767),
 ('Ichijima','Ichijima',35.20799,135.13006),
 ('Tamba-Takeda','Tamba-Takeda',35.243735,135.134095)
ON CONFLICT(id) DO NOTHING;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.line_stations WHERE line_id='Fukuchiyama')<>22
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='Fukuchiyama'
   AND station_index=21 AND station_name='Shinoyamaguchi')<>1
 THEN RAISE EXCEPTION 'Fukuchiyama line station order changed; review before extending'; END IF;
END $check$;
INSERT INTO public.line_stations(line_id,station_name,station_index)
VALUES
 ('Fukuchiyama','Tamba-Oyama',22),('Fukuchiyama','Shimotaki',23),
 ('Fukuchiyama','Tanigawa',24),('Fukuchiyama','Kaibara-Hyogo',25),
 ('Fukuchiyama','Iso-Tamba',26),('Fukuchiyama','Kuroi-Tamba',27),
 ('Fukuchiyama','Ichijima',28),('Fukuchiyama','Tamba-Takeda',29),
 ('Fukuchiyama','Fukuchiyama',30);
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.line_stations WHERE line_id='Fukuchiyama')<>31
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='Fukuchiyama'
    AND station_name IN('Fukuchiyama','Tanigawa'))<>2
 THEN RAISE EXCEPTION 'Fukuchiyama 31-station line extension failed'; END IF;
END $check$;
COMMIT;