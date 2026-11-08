-- Public, read-only corridor evidence for the trains detail view.
-- Train position and rolling stock identity are deliberately NOT exposed.
-- The underlying 13 link rows are public timetable provenance, not user data.
BEGIN;
ALTER TABLE public.published_jrwest_tozai_2611_source_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.published_jrwest_tozai_2611_source_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_jrwest_tozai_2611_source_links TO anon, authenticated;
DROP POLICY IF EXISTS jrwest_tozai_public_source_only_read
  ON public.published_jrwest_tozai_2611_source_links;
CREATE POLICY jrwest_tozai_public_source_only_read
  ON public.published_jrwest_tozai_2611_source_links
  FOR SELECT TO anon, authenticated
  USING (
    edition = '2611'
    AND source_line_key = 'Gakkentoshi'
    AND verified_through_line_key = 'JRTozai'
    AND verification_scope = 'official_number_and_boundary_clock_only'
    AND timetable_completeness = 'partial_source_only'
    AND vehicle_type IS NULL AND vehicle_png_path IS NULL
    AND actual_vehicle_confirmed = false
  );
CREATE OR REPLACE VIEW public.published_jrwest_tozai_2611_public_evidence
  WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  source_template_id, source_line_key, verified_through_line_key,
  calendar_urn, source_train_number, public_train_number,
  traversal_direction, continued_as_train_number,
  kyobashi_departure_clock, source_boundary_station_urn,
  source_boundary_arrival_clock, official_source_url, verification_scope,
  timetable_completeness
FROM public.published_jrwest_tozai_2611_source_links
WHERE edition = '2611' AND source_line_key = 'Gakkentoshi'
  AND verified_through_line_key = 'JRTozai'
  AND verification_scope = 'official_number_and_boundary_clock_only'
  AND timetable_completeness = 'partial_source_only'
  AND vehicle_type IS NULL AND vehicle_png_path IS NULL
  AND actual_vehicle_confirmed = false;
REVOKE ALL ON public.published_jrwest_tozai_2611_public_evidence
  FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_jrwest_tozai_2611_public_evidence
  TO anon,authenticated;
COMMIT;