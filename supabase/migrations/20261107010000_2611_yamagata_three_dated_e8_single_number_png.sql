-- Date-limited Yamagata shinkansen E8 plan reference artwork.
-- Only three exact 2611 numbered services whose EXISTING timetable
-- vehicle mappings already certify E8 via official source evidence
-- and whose source operating_dates are independently verified.
-- Generic JR-East native E8 PNG; NOT an observed trainset.
BEGIN;
SELECT pg_advisory_xact_lock(2611,8177);
DO $yamagata_dated_e8_reference_png$
DECLARE r record; n int;
BEGIN
 IF (SELECT count(*) FROM vehicle_image_assets a
     WHERE a.operator='JR-East' AND a.vehicle_type='E8系'
      AND a.image_path='images/列车/JR東日本/JR東日本_E8系.png'
      AND a.is_generic AND a.asset_status='available'
      AND a.file_format_status='native_png')<>1
 THEN RAISE EXCEPTION 'Official JR-East native E8 image asset missing'; END IF;
 FOR r IN SELECT * FROM (VALUES
   (725,8177,'8177M','https://timetables.jreast.co.jp/2611/train/020/022661.html',9),
   (728,9088,'9088M','https://timetables.jreast.co.jp/2611/train/025/025641.html',4),
   (729,9090,'9090M','https://timetables.jreast.co.jp/2611/train/045/048321.html',7)
 ) AS x(template_id,number_int,formal_number,official_url,days)
 LOOP
  IF (SELECT count(*) FROM manual_timetable_templates m
    JOIN published_train_number_evidence e ON e.source_template_id=m.id AND e.edition='2611'
    JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN train_timetable_vehicle_mappings v ON v.timetable_id=mem.timetable_id AND v.source_template_id=m.id
    JOIN evidence_sources src ON src.id=v.source_id
    WHERE m.id=r.template_id AND m.line_key='YamagataShinkansen'
      AND m.operating_dates IS NOT NULL AND cardinality(m.operating_dates)=r.days
      AND m.operating_dates <@ ARRAY(SELECT generate_series('2026-11-01'::date,'2026-11-30'::date,interval '1 day')::date)
      AND e.train_number=r.formal_number AND e.official_source_url=r.official_url
      AND e.verification_scope='train_number_only'
      AND v.vehicle_type='E8系'
      AND v.mapping_level='official_service_vehicle_plan'
      AND v.actual_vehicle_confirmed=false
      AND src.source_type='official' AND src.evidence_grade IN ('A','B'))<>1
   THEN RAISE EXCEPTION 'E8 dated official model/number/operation evidence invalid %',r.formal_number; END IF;
  IF EXISTS(SELECT 1 FROM published_train_png_number_ranges png
    WHERE png.edition='2611' AND png.line_key='YamagataShinkansen'
     AND r.number_int BETWEEN png.min_number AND png.max_number
     AND png.suffix='M')
   THEN RAISE EXCEPTION 'Overlapping existing E8 picture rule %',r.formal_number; END IF;
  INSERT INTO published_train_png_number_ranges
   (edition,line_key,segment_key,min_number,max_number,suffix,
    vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
  VALUES('2611','YamagataShinkansen','november_dated_verified_single_number',
    r.number_int,r.number_int,'M','E8系',
    '../images/列车/JR東日本/JR東日本_E8系.png',
    r.official_url,true,false);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'E8 single number PNG insertion failed %',r.formal_number; END IF;
 END LOOP;
END $yamagata_dated_e8_reference_png$;
COMMIT;