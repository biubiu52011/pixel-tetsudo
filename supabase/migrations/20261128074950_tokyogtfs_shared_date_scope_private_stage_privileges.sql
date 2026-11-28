-- gtfs_stage is deliberately private; match the existing Tobu RPC trust boundary
-- without granting service_role direct stage-table access.
ALTER FUNCTION public.tokyogtfs_active_trip_ids(text,date) SECURITY DEFINER;
ALTER FUNCTION public.tokyogtfs_active_trip_ids(text,date) SET search_path = pg_catalog,gtfs_stage,public;
REVOKE ALL ON FUNCTION public.tokyogtfs_active_trip_ids(text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tokyogtfs_active_trip_ids(text,date) TO service_role;
