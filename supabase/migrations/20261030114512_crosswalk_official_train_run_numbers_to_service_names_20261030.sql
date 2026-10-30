-- Source-backed official run number <-> passenger service number reconciliation.
-- No inferred conversion formula: read each train's published service name, listed
-- operating dates, line and original run number from its own evidence_source.
-- A matching canonical timetable remains only a candidate while that timetable's
-- revision/effective date is unverified. This view never writes actual vehicle identity.
CREATE OR REPLACE VIEW rail_audit.official_train_run_service_crosswalk
WITH (security_invoker = true) AS
WITH sourced AS (
  SELECT r.id AS train_run_id, r.operator, r.line_id, r.service_date,
         r.calendar_type, r.train_number AS operational_train_number,
         e.id AS source_id, e.source_url,
         e.notes::jsonb AS source_details
  FROM public.train_runs r
  JOIN public.evidence_sources e ON e.id = r.source_id
  WHERE e.source_type = 'timetable'
    AND e.notes LIKE '{"kind": "official-published-service-dates"%'
), validated AS (
  SELECT s.*,
         btrim(coalesce(s.source_details->>'trainName','')) AS published_service_name,
         CASE
           WHEN coalesce(s.source_details->>'trainNumber','') <> s.operational_train_number
             THEN 'SOURCE_TRAIN_NUMBER_MISMATCH'
           WHEN coalesce(s.source_details->>'lineId','') <> s.line_id
             THEN 'SOURCE_LINE_MISMATCH'
           WHEN s.service_date IS NULL OR NOT
                  coalesce((s.source_details->'operatingDates') ?
                      to_char(s.service_date,'YYYY-MM-DD'),false)
             THEN 'SOURCE_SERVICE_DATE_NOT_LISTED'
           WHEN nullif(btrim(coalesce(s.source_details->>'trainName','')),'') IS NULL
             THEN 'PUBLISHED_SERVICE_NAME_MISSING'
           ELSE 'OFFICIAL_RUN_SERVICE_LINK'
         END AS evidence_status
  FROM sourced s
), possible_timetable AS (
  SELECT v.train_run_id,
         count(DISTINCT l.timetable_id) AS candidate_count,
         min(l.timetable_id) AS candidate_timetable_id
  FROM validated v
  JOIN public.train_timetable_lines l ON l.line_key = v.line_id
   AND regexp_replace(l.primary_train_number,'[[:space:]　]+','','g') =
       regexp_replace(v.published_service_name,'[[:space:]　]+','','g')
  WHERE v.evidence_status = 'OFFICIAL_RUN_SERVICE_LINK'
  GROUP BY v.train_run_id
)
SELECT v.train_run_id,v.operator,v.line_id,v.service_date,v.calendar_type,
       v.operational_train_number,v.published_service_name,
       v.source_id,v.source_url,v.source_details->>'revisionMonth' AS source_revision_month,
       v.evidence_status,
       coalesce(p.candidate_count,0::bigint) AS canonical_name_candidate_count,
       CASE WHEN p.candidate_count = 1 THEN p.candidate_timetable_id
            ELSE NULL::bigint END AS unverified_canonical_candidate_id,
       CASE
         WHEN v.evidence_status <> 'OFFICIAL_RUN_SERVICE_LINK' THEN v.evidence_status
         WHEN p.candidate_count IS NULL THEN 'NO_CANONICAL_SERVICE_NAME_MATCH'
         WHEN p.candidate_count > 1 THEN 'AMBIGUOUS_CANONICAL_SERVICE_NAME'
         ELSE 'CANONICAL_TIMETABLE_VERSION_UNVERIFIED'
       END AS canonical_match_status,
       'UNKNOWN'::text AS actual_vehicle_identity_status
FROM validated v
LEFT JOIN possible_timetable p ON p.train_run_id = v.train_run_id;

REVOKE ALL ON rail_audit.official_train_run_service_crosswalk
 FROM PUBLIC,anon,authenticated;
