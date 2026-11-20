-- M-02: keep locked historical asset identity unchanged; fix three existing
-- view consumers that previously treated available/generic as approved even
-- when appearance_class='requires_review'. GitHub: Toei 8500 alias equals 8501
-- Yamabuki blob b599af3f0168687b5c278b25c4ea0be8511372c0.
-- No asset baseline, range, or number-source modification.
-- Retain original view names, columns, grants and security_invoker=true.
DO $m02_views$
DECLARE
  v text;
  before_def text;
  after_def text;
  from_text text;
  to_text text;
  old_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形（別）.png'
      AND asset_status='available' AND asset_scope='generic'
      AND is_generic=true AND appearance_class='requires_review'
  ) THEN
    RAISE EXCEPTION 'M-02: expected existing 8500 alias review marker missing';
  END IF;
  FOR v IN SELECT unnest(ARRAY[
      'vehicle_image_asset_orphans',
      'vehicle_visual_asset_audit',
      'vehicle_artwork_exact_locked'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=v AND c.relkind='v'
        AND c.reloptions @> ARRAY['security_invoker=true']::text[]
    ) THEN
      RAISE EXCEPTION 'M-02: required invoker-security view % changed', v;
    END IF;
    before_def=pg_get_viewdef(format('public.%I',v)::regclass,true);
    after_def=before_def;
    IF v='vehicle_image_asset_orphans' THEN
      from_text='WHEN asset_status = ''review''::text THEN';
      to_text='WHEN asset_status = ''review''::text OR appearance_class = ''requires_review''::text THEN';
      IF strpos(after_def,from_text)=0 THEN
        RAISE EXCEPTION 'M-02: review audit view structure changed';
      END IF;
      after_def=replace(after_def,from_text,to_text);
    ELSIF v='vehicle_visual_asset_audit' THEN
      from_text='a1.asset_status = ''available''::text AND a1.is_generic = false';
      to_text='a1.asset_status = ''available''::text AND a1.appearance_class IS DISTINCT FROM ''requires_review''::text AND a1.is_generic = false';
      IF strpos(after_def,from_text)=0 THEN
        RAISE EXCEPTION 'M-02: exact artwork lookup structure changed';
      END IF;
      after_def=replace(after_def,from_text,to_text);
      from_text='a2.asset_status = ''available''::text AND a2.is_generic = true';
      to_text='a2.asset_status = ''available''::text AND a2.appearance_class IS DISTINCT FROM ''requires_review''::text AND a2.is_generic = true';
      IF strpos(after_def,from_text)=0 THEN
        RAISE EXCEPTION 'M-02: generic artwork lookup structure changed';
      END IF;
      after_def=replace(after_def,from_text,to_text);
    ELSIF v='vehicle_artwork_exact_locked' THEN
      from_text='a.appearance_class IS DISTINCT FROM ''temporary_wrapping''::text';
      to_text='a.appearance_class IS DISTINCT FROM ''temporary_wrapping''::text AND a.appearance_class IS DISTINCT FROM ''requires_review''::text';
      IF strpos(after_def,from_text)=0 THEN
        RAISE EXCEPTION 'M-02: exact locked artwork lookup structure changed';
      END IF;
      after_def=replace(after_def,from_text,to_text);
    END IF;
    IF after_def=before_def THEN
      RAISE EXCEPTION 'M-02: no change detected for %',v;
    END IF;
    EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH (security_invoker = true) AS %s',v,after_def);
  END LOOP;
  IF (SELECT audit_status FROM public.vehicle_image_asset_orphans
      WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形（別）.png'
    ) IS DISTINCT FROM 'ASSET_REVIEW_REQUIRED' THEN
    RAISE EXCEPTION 'M-02: alternate Toei 8500 still eligible as generic';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.vehicle_artwork_exact_locked e
    JOIN public.vehicle_image_assets a ON a.image_path=e.image_path
    WHERE a.appearance_class='requires_review'
  ) THEN
    RAISE EXCEPTION 'M-02: exact locked view still exposes review artwork';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.vehicle_visual_asset_audit e
    JOIN public.vehicle_image_assets a ON a.image_path=e.image_path
    WHERE a.appearance_class='requires_review'
  ) THEN
    RAISE EXCEPTION 'M-02: visual asset lookup still exposes review artwork';
  END IF;
END
$m02_views$;
