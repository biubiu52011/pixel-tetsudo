-- JR-Central operator-wide live SQL audit: 14 canonical routes, read-only.
-- Source-only records, published train-number proof and planned vehicle mapping
-- are independently counted; none constitutes complete current service.
SELECT l.id AS line_key,
 COALESCE(st.station_count,0) AS stations,
 COALESCE(st.geocoded,0) AS stations_with_geometry,
 COALESCE(st.station_count,0)>0 AND
   st.station_count=st.geocoded AS all_stations_geocoded,
 COALESCE(t.templates,0) AS train_templates,
 COALESCE(t.weekday,0) AS weekday_trains,
 COALESCE(t.holiday,0) AS holiday_trains,
 COALESCE(t.exact_dates,0) AS templates_with_explicit_operating_dates,
 COALESCE(t.inbound,0) AS inbound_trains,
 COALESCE(t.outbound,0) AS outbound_trains,
 COALESCE(t.numbers,0) AS unique_source_numbers,
 COALESCE(n.official_numbers,0) AS verified_number_evidence_rows,
 COALESCE(v.model_plans,0) AS canonical_vehicle_plan_rows,
 COALESCE(v.actual_fleets,0) AS actual_vehicle_confirmed_rows,
 a.raw_coverage_status,a.acceptance_status,a.full_day_timetable_acceptance_passed,
 a.source_audit_issues,inv.data_kind,inv.migration_status
FROM public.railway_lines l
LEFT JOIN LATERAL (
 SELECT count(*) AS station_count,count(geo.id) AS geocoded
 FROM public.line_stations ls LEFT JOIN public.stations geo
 ON geo.id=ls.station_name WHERE ls.line_id=l.id
) st ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS templates,
 count(*) FILTER(WHERE calendar_urn='odpt.Calendar:Weekday') AS weekday,
 count(*) FILTER(WHERE calendar_urn='odpt.Calendar:SaturdayHoliday') AS holiday,
 count(*) FILTER(WHERE cardinality(operating_dates)>0) AS exact_dates,
 count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Inbound') AS inbound,
 count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Outbound') AS outbound,
 count(DISTINCT train_number) AS numbers
 FROM public.manual_timetable_templates WHERE line_key=l.id
) t ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS official_numbers FROM public.published_train_number_evidence
 WHERE line_key=l.id
) n ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS model_plans,
 count(*) FILTER(WHERE mapping.actual_vehicle_confirmed) AS actual_fleets
 FROM public.train_timetable_vehicle_mappings mapping
 JOIN public.train_timetable_members member ON member.timetable_id=mapping.timetable_id
 JOIN public.manual_timetable_templates source ON source.id=member.source_template_id
 WHERE source.line_key=l.id
) v ON true
LEFT JOIN public.published_timetable_full_day_acceptance a ON a.line_key=l.id
LEFT JOIN public.line_data_inventory inv ON inv.line_key=l.id
WHERE l.timetable_operator='JR-Central'
ORDER BY (l.id='TokaidoShinkansen'),l.id;
