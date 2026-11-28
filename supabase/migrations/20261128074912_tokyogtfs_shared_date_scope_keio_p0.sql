-- Shared immutable TokyoGTFS date whitelist; existing Tobu RPC remains
-- unchanged for deployed clients. No timetable rows or runtime flags modified.
CREATE OR REPLACE FUNCTION public.tokyogtfs_active_trip_ids(p_line_key text,p_service_date date)
RETURNS TABLE(trip_id text)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog,gtfs_stage,public
AS $gtfs$
 SELECT t.trip_id
 FROM gtfs_stage.trips t
 JOIN gtfs_stage.service_calendar c ON c.feed_sha=t.feed_sha AND c.service_id=t.service_id
 JOIN gtfs_stage.feed_imports f ON f.feed_sha=t.feed_sha
 LEFT JOIN gtfs_stage.service_exceptions ex ON ex.feed_sha=t.feed_sha AND ex.service_id=t.service_id AND ex.service_date=p_service_date
 WHERE t.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
 AND t.route_id=CASE p_line_key
 WHEN 'TobuSkytree' THEN 'Tobu.TobuSkytree'
 WHEN 'Noda' THEN 'Tobu.TobuUrbanPark'
 WHEN 'Tojo' THEN 'Tobu.Tojo'
 WHEN 'Ogose' THEN 'Tobu.Ogose'
 WHEN 'KeioMain' THEN 'Keio.Keio'
 WHEN 'KeioInokashira' THEN 'Keio.Inokashira'
 WHEN 'KeioTakao' THEN 'Keio.Takao'
 ELSE NULL END
 AND p_service_date BETWEEN f.service_start AND f.service_end
 AND COALESCE(ex.exception_type=1,p_service_date BETWEEN c.start_date AND c.end_date
 AND substring(c.week_mask FROM extract(isodow FROM p_service_date)::int FOR 1)='1')
 -- A cross-line stop labelled Keio.Takao.Meidaimae is not a Takao
 -- physical station. Keep the entire unreviewed trip out of this whitelist.
 AND (p_line_key<>'KeioTakao' OR NOT EXISTS (
 SELECT 1 FROM gtfs_stage.stop_times s WHERE s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id
 AND s.stop_id='Keio.Takao.Meidaimae'))
 ORDER BY t.trip_id
$gtfs$;
REVOKE ALL ON FUNCTION public.tokyogtfs_active_trip_ids(text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tokyogtfs_active_trip_ids(text,date) TO service_role;
COMMENT ON FUNCTION public.tokyogtfs_active_trip_ids(text,date) IS 'Service-role-only checksum/date/route eligibility for source plans. Not an official clock or actual vehicle verification; no runtime activation.';

