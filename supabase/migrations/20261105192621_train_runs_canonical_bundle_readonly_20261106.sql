-- One bounded, read-only canonical snapshot for the Edge Function.
-- Returns the same verified canonical stop / line / member sources as the
-- separate PostgREST view reads. No train or vehicle inference is performed.
CREATE OR REPLACE FUNCTION public.train_runs_canonical_bundle(
  p_timetable_ids bigint[],
  p_include_members boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $body$
BEGIN
  IF p_timetable_ids IS NULL OR cardinality(p_timetable_ids) > 40 THEN
    RAISE EXCEPTION 'TRAIN_RUNS_CANONICAL_BUNDLE_INVALID_SCOPE'
      USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object(
    'stops', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'timetable_id', s.timetable_id,
        'stop_sequence', s.stop_sequence,
        'station_urn', s.station_urn,
        'arrival_clock', s.arrival_clock,
        'departure_clock', s.departure_clock,
        'source_template_id', s.source_template_id,
        'line_key', s.line_key,
        'train_number', s.train_number
      ) ORDER BY s.timetable_id, s.stop_sequence, s.source_template_id)
      FROM public.train_timetable_stops s
      WHERE s.timetable_id = ANY (p_timetable_ids)
    ), '[]'::jsonb),
    'lines', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'timetable_id', l.timetable_id, 'line_key', l.line_key
      ) ORDER BY l.timetable_id, l.line_key)
      FROM public.train_timetable_lines l
      WHERE l.timetable_id = ANY (p_timetable_ids)
    ), '[]'::jsonb),
    'members', CASE WHEN p_include_members THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'timetable_id', m.timetable_id,
        'source_template_id', m.source_template_id,
        'line_key', t.line_key,
        'train_number', t.train_number,
        'railway_urn', t.railway_urn,
        'direction_urn', t.direction_urn
      ) ORDER BY m.timetable_id, m.source_template_id)
      FROM public.train_timetable_members m
      LEFT JOIN public.manual_timetable_templates t ON t.id = m.source_template_id
      WHERE m.timetable_id = ANY (p_timetable_ids)
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END;
$body$;

-- Keep this API callable only by the Edge Function's service-role client.
-- Never publish a privileged database read through anon/authenticated RPC.
REVOKE ALL ON FUNCTION public.train_runs_canonical_bundle(bigint[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.train_runs_canonical_bundle(bigint[], boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.train_runs_canonical_bundle(bigint[], boolean) TO service_role;
