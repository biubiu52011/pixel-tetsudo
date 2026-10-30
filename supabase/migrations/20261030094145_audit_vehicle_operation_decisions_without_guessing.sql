-- Deployed to Supabase project pnupwfmgbtxqhpzsrhfn as migration 20261030094145.
-- Review-only; never promote vehicle identity or replace realtime observations.
create schema if not exists rail_audit;
revoke all on schema rail_audit from public, anon, authenticated;

create or replace view rail_audit.vehicle_operation_decisions
with (security_invoker = true) as
with grouped as (
  select
    service_date, operator, network_key, operation_code,
    valid_from_time, valid_to_time,
    count(*)::integer as evidence_rows,
    count(distinct nullif(btrim(vehicle_type), ''))::integer as vehicle_type_count,
    count(distinct nullif(array_to_string(formation_ids, '+'), ''))::integer as formation_count,
    array_agg(distinct nullif(btrim(vehicle_type), ''))
      filter (where nullif(btrim(vehicle_type), '') is not null) as vehicle_types,
    bool_and(
      evidence_grade in ('A','C')
      and sql_evidence_role = 'primary'
      and observed_date >= service_date
      and coalesce(source_url, '') ~ '^https?://'
    ) as all_sources_decisive
  from public.runtime_vehicle_operation_evidence
  group by service_date, operator, network_key, operation_code,
           valid_from_time, valid_to_time
), classified as (
  select
    g.*,
    (now() at time zone 'Asia/Tokyo')::date as as_of_date,
    case
      when vehicle_type_count > 1 or formation_count > 1
        then 'CONFLICT'
      when vehicle_type_count = 0 or not coalesce(all_sources_decisive,false)
        then 'REVIEW_REQUIRED'
      when service_date < (now() at time zone 'Asia/Tokyo')::date
        then 'HISTORICAL_ONLY'
      when service_date > (now() at time zone 'Asia/Tokyo')::date
        then 'FUTURE_DATE'
      else 'DATE_MATCHED_EVIDENCE'
    end as decision_status
  from grouped g
)
select
  service_date, as_of_date, operator, network_key, operation_code,
  valid_from_time, valid_to_time, evidence_rows,
  vehicle_type_count, formation_count, vehicle_types,
  all_sources_decisive, decision_status,
  (decision_status = 'DATE_MATCHED_EVIDENCE') as eligible_for_realtime_review
from classified;

revoke all on rail_audit.vehicle_operation_decisions
from public, anon, authenticated;

comment on view rail_audit.vehicle_operation_decisions is
'Internal read-only triage. Same-day source-supported evidence is only eligible for further realtime review; it never auto-promotes a vehicle to EXACT.';
