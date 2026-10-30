
DO $sync$
DECLARE base_source bigint; base_rule bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(20261030, 70080);
  SELECT COALESCE(MAX(id),0) INTO base_source FROM public.evidence_sources;
  WITH official(source_key, source_url, notes) AS (
    VALUES
    ('official-local-keio-liner-5000-20261030',
     'https://www.keio.co.jp/zasekishitei/',
     'Official Keio Liner website: reserved-seat service is operated by the 5000 series; Sagamihara service scope. This proves series, not a formation or current operational status.'),
    ('official-local-tobu-thliner-70090-20261030',
     'https://www.tobu.co.jp/corporation/rail/vehicles/',
     'Official Tobu fleet catalog: 70090-type built for the TH-LINER reserved seat service linking Tobu and Tokyo Metro Hibiya. Series only, no dated consist.'),
    ('official-local-tobu-spaciax-n100-20261030',
     'https://www.tobu.co.jp/spaciax/',
     'Official Tobu SPACIA X corresponds to N100-type by Tobu vehicle catalog. Do not treat general LimitedExpress as SPACIA X.'),
    ('official-local-tobu-tjliner-50090-20261030',
     'https://www.tobu.co.jp/corporation/rail/vehicles/',
     'Official Tobu fleet catalog: TJ-LINER uses 50090-type. The evidence is service-specific, not for all Tojo train types.'),
    ('official-local-jrwest-kuroshio-283-287-289-20261030',
     'https://www.jr-odekake.net/railroad/kuroshio/index.html',
     'Official JR West Kuroshio fleet: 283-series, 287-series, 289-series in service. Mixed-family plan; excludes claims of specific carset, theme wrap or date.'),
    ('official-local-jrkyushu-sonic-numbered-20261030',
     'https://www.jrkyushu.co.jp/english/train/sonic.html',
     'Official JR Kyushu 2026-03-14 through 2027-02-28 schedule explicitly divides Sonic service numbers between 883 and 885. Use exact Sonic service numbers only, never infer from raw working code like Kag-3001M-WE.')
  ), pending AS (
    SELECT o.*,ROW_NUMBER() OVER(ORDER BY source_key) rn FROM official o
    WHERE NOT EXISTS(SELECT 1 FROM public.evidence_sources e WHERE e.source_key=o.source_key)
  )
  INSERT INTO public.evidence_sources (id,source_key,source_url,source_type,evidence_grade,notes)
    SELECT base_source+rn,source_key,source_url,'official','C',notes FROM pending;

  SELECT COALESCE(MAX(id),0) INTO base_rule FROM public.operation_family_rules;
  WITH rule(operator,network_key,code_pattern,vehicle_candidates,train_types,labels,source_key,remarks) AS (
    VALUES
    ('Keio','KeioSagami','PLAN:OFFICIAL-KEIOLINER-5000',
      ARRAY['京王5000系']::text[], ARRAY['KeioLiner']::text[],NULL::text[],
      'official-local-keio-liner-5000-20261030','Only Keio Liner trains on Sagamihara line. Planned model, not actual formation.'),
    ('Tobu','TobuIsesaki','PLAN:OFFICIAL-THLINER-70090',
      ARRAY['東武70090型']::text[],ARRAY['TH-LINER']::text[],NULL::text[],
      'official-local-tobu-thliner-70090-20261030','Only TH-LINER service, not other LimitedExpress or ordinary trains.'),
    ('Tobu','TobuNikko','PLAN:OFFICIAL-SPACIAX-N100-NIKKO',
      ARRAY['東武N100系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['スペーシアX','SPACIA X']::text[],
      'official-local-tobu-spaciax-n100-20261030','Requires explicit SPACIA X service name; not all Tobu limited expresses.'),
    ('Tobu','TobuIsesaki','PLAN:OFFICIAL-SPACIAX-N100-ISESAKI',
      ARRAY['東武N100系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['スペーシアX','SPACIA X']::text[],
      'official-local-tobu-spaciax-n100-20261030','Requires explicit SPACIA X service name; not all Tobu limited expresses.'),
    ('Tobu','Tojo','PLAN:OFFICIAL-TJLINER-50090',
      ARRAY['東武50090型']::text[],ARRAY['TJ-LINER']::text[],NULL::text[],
      'official-local-tobu-tjliner-50090-20261030','Only TJ-LINER; not all Tojo trains.'),
    ('JR-West','KiseiWest','PLAN:OFFICIAL-KUROSHIO-KISEIWEST',
      ARRAY['JR西日本283系','JR西日本287系','JR西日本289系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['くろしお']::text[],
      'official-local-jrwest-kuroshio-283-287-289-20261030','Kuroshio multiple candidate fleet; needs service name and date, no single train image.'),
    ('JR-West','Hanwa','PLAN:OFFICIAL-KUROSHIO-HANWA',
      ARRAY['JR西日本283系','JR西日本287系','JR西日本289系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['くろしお']::text[],
      'official-local-jrwest-kuroshio-283-287-289-20261030','Kuroshio multiple candidate fleet; not a general Hanwa service rule.'),
    ('JR-West','TokaidoKansai','PLAN:OFFICIAL-KUROSHIO-TOUKAIDO',
      ARRAY['JR西日本283系','JR西日本287系','JR西日本289系']::text[],ARRAY['LimitedExpress']::text[],ARRAY['くろしお']::text[],
      'official-local-jrwest-kuroshio-283-287-289-20261030','Kuroshio trains only, not every Tokaido express.')
  ), pending AS (
    SELECT r.*,e.id evidence_id, ROW_NUMBER() OVER(ORDER BY r.operator,r.network_key,r.code_pattern) rn
    FROM rule r JOIN public.evidence_sources e ON e.source_key=r.source_key
    WHERE NOT EXISTS (SELECT 1 FROM public.operation_family_rules f
      WHERE f.operator=r.operator AND f.network_key=r.network_key AND f.code_pattern=r.code_pattern
      AND f.effective_from=DATE '2026-10-30' AND f.calendar_type='')
  )
  INSERT INTO public.operation_family_rules
    (id,operator,network_key,code_pattern,effective_from,effective_to,exact_vehicle_type,
     vehicle_candidates,calendar_type,source_id,notes,plan_scope)
  SELECT base_rule+rn,operator,network_key,code_pattern,DATE '2026-10-30',NULL,NULL,
         vehicle_candidates,'',evidence_id,remarks,
         jsonb_build_object('lineIds',jsonb_build_array(network_key),'planOnly',true,
           'overridePlan',true,'trainTypes',to_jsonb(train_types))
         || CASE WHEN labels IS NULL THEN '{}'::jsonb
                 ELSE jsonb_build_object('candidateLabelsAny',to_jsonb(labels)) END
    FROM pending;
END $sync$;
