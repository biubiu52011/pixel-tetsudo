-- Third07: Historical 2025-11-26 Hitachinaka Seaside Railway Minato line.
-- Eyewitness recorded actual vehicle and FULL train number, キハ11形 136D:
-- https://ameblo.jp/rambaral529/entry-12948456585.html
-- Blog dated 2025-11-29, describing a visit on November 26. Single-date evidence.
-- Official operator fleet listing: https://hitachinaka-rail.co.jp/train/
-- Official operator confirms KiHa 100 started services 2025-11-25:
-- https://www.hitachinaka-rail.co.jp/journal/2025/11/25/
-- DATA-ONLY key HitachinakaMinato, not a live railway-data route.
-- The 2026-11 edition represents a catalog snapshot of historical NUMBER
-- references and MUST NOT assert any 2026-11 formation, actual run, or
-- permanently fixed assignment. キハ11形 136D is NOT a vehicle ID.
-- Competing KiHa 100-40 Hoshiimo themed PNG stays without 136D.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ11形.png'
     AND operator='HitachinakaSeaside'
     AND vehicle_type='キハ11形'
     AND asset_status='available' AND file_format_status='native_png'
     AND asset_scope='generic' AND is_generic=TRUE
     AND appearance_class='standard_or_fixed_livery'
     AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Third07: target PNG asset contract drift for 136D'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges r
   WHERE r.edition='2611' AND r.line_key='HitachinakaMinato'
     AND r.suffix='D' AND 136 BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Third07: occupied 136D reference'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','HitachinakaMinato','png_band/HitachinakaMinato/0136-0136D',136,136,'D',NULL,'../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ11形.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='HitachinakaMinato'
       AND segment_key='png_band/HitachinakaMinato/0136-0136D'
       AND min_number=136 AND max_number=136 AND suffix='D'
       AND png_reference='../images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ11形.png'
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third07: exact 136D row missing'; END IF;
END;
$verify$;
COMMIT;
