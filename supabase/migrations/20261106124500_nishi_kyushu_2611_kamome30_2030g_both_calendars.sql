-- JR Kyushu 2026-11 official Kamome 30, weekday/holiday source only.
-- Published Shinkansen number 2030G (NOT Relay Kamome 2030H).
-- N700S scheduled stock plan exists already; no actual carset/PNG claim.
BEGIN;
DO $kamome30$
DECLARE r record; matched integer:=0;
BEGIN
 FOR r IN SELECT * FROM public.manual_timetable_templates WHERE id IN (262,128922) ORDER BY id
 LOOP
  IF r.line_key<>'NishiKyushuShinkansen'
    OR r.railway_urn<>'odpt.Railway:JR-Kyushu.NishiKyushuShinkansen'
    OR r.train_number<>'かもめ30号'
    OR r.direction_urn<>'odpt.RailDirection:Inbound'
    OR (r.id=262 AND r.calendar_urn<>'odpt.Calendar:Weekday')
    OR (r.id=128922 AND r.calendar_urn<>'odpt.Calendar:SaturdayHoliday')
    OR NOT EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s WHERE s.template_id=r.id
      AND s.departure_station_urn='odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki'
      AND s.departure_clock='12:42')
    OR NOT EXISTS(SELECT 1 FROM public.manual_timetable_template_stops s WHERE s.template_id=r.id
      AND s.arrival_station_urn='odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen'
      AND s.arrival_clock='13:12')
    OR NOT EXISTS(SELECT 1 FROM public.train_timetable_members tm
      JOIN public.train_timetables tt ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
      JOIN public.train_timetable_vehicle_mappings v ON v.timetable_id=tm.timetable_id
        AND v.source_template_id=r.id AND v.vehicle_type='N700S系'
        AND v.mapping_level='official_service_vehicle_plan'
        AND v.actual_vehicle_confirmed=false
      WHERE tm.source_template_id=r.id AND tm.member_role='primary')
  THEN RAISE EXCEPTION 'Kamome30 source mismatch %',r.id; END IF;

  INSERT INTO public.published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
  SELECT '2611','NishiKyushuShinkansen',r.calendar_urn,r.direction_urn,'2030G',r.id,
    'https://www.jrkyushu-timetable.jp/sp/2611/0023/00239601.html?d=20261103&t=2844300','train_number_only'
  WHERE NOT EXISTS(SELECT 1 FROM public.published_train_number_evidence e
    WHERE e.edition='2611' AND e.source_template_id=r.id);

  IF (SELECT count(*) FROM public.published_train_number_evidence e
    WHERE e.edition='2611' AND e.line_key='NishiKyushuShinkansen'
      AND e.calendar_urn=r.calendar_urn AND e.direction_urn=r.direction_urn
      AND e.train_number='2030G' AND e.source_template_id=r.id
      AND e.verification_scope='train_number_only'
      AND e.official_source_url='https://www.jrkyushu-timetable.jp/sp/2611/0023/00239601.html?d=20261103&t=2844300')<>1
  THEN RAISE EXCEPTION 'Kamome30 evidence mismatch %',r.id; END IF;
  matched:=matched+1;
 END LOOP;
 IF matched<>2 THEN RAISE EXCEPTION 'Expected two calendar templates, got %',matched; END IF;
END $kamome30$;
COMMIT;